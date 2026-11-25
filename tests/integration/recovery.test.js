import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { URL, URLSearchParams } from "node:url";
import { Sequelize, QueryTypes } from "sequelize";
import signature from "cookie-signature";
import { createApp } from "../../src/app.js";
import { hashPassword } from "../../src/lib/password.js";
import { assertIsolatedTestDatabase } from "../../src/lib/testDatabase.js";

test("recuperación con respuesta genérica, token con hash y de un solo uso", async () => {
  const env = process.env;
  assertIsolatedTestDatabase({
    nodeEnv: env.NODE_ENV,
    host: env.TEST_DB_HOST,
    database: "securevault_test_db",
  });
  assert.ok(env.TEST_DB_USER && env.TEST_DB_PASSWORD && env.TEST_DB_PORT);
  const db = new Sequelize(
    "securevault_test_db",
    env.TEST_DB_USER,
    env.TEST_DB_PASSWORD,
    {
      dialect: "mysql",
      host: env.TEST_DB_HOST,
      port: Number(env.TEST_DB_PORT),
      logging: false,
    },
  );
  const secret = "test-session-secret-".repeat(4),
    messages = [];
  const recoveryConfig = {
    baseUrl: "https://example.invalid",
    mailer: {
      async sendRecovery(to, url) {
        messages.push({ to, url });
      },
    },
  };
  const server = createServer(
    createApp({
      database: db,
      authConfig: {
        sessionSecret: secret,
        csrfSecret: "test-csrf-secret-".repeat(4),
      },
      notesKey: randomBytes(32),
      recoveryConfig,
    }),
  );
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`,
    userId = randomUUID(),
    email = `${userId}@example.invalid`,
    sessions = new Set();
  const password = "Ejemplo#seguro-298371",
    newPassword = "Otra#contraseña-580291";
  function client() {
    const cookies = new Map();
    return {
      async request(path, options = {}) {
        const response = await fetch(base + path, {
          ...options,
          redirect: "manual",
          headers: {
            ...(options.headers || {}),
            cookie: [...cookies]
              .map(([key, value]) => `${key}=${value}`)
              .join("; "),
          },
        });
        for (const item of response.headers.getSetCookie()) {
          const [pair] = item.split(";");
          const index = pair.indexOf("=");
          const key = pair.slice(0, index),
            value = pair.slice(index + 1);
          cookies.set(key, value);
          if (key === "sv.sid" && value) {
            const decoded = decodeURIComponent(value);
            const id =
              decoded.startsWith("s:") &&
              signature.unsign(decoded.slice(2), secret);
            if (id) sessions.add(id);
          }
        }
        return response;
      },
      async token(path) {
        const response = await this.request(path);
        assert.equal(response.status, 200);
        const html = await response.text();
        const match = html.match(/name="_csrf" value="([^"]+)"/);
        assert.ok(match);
        return match[1];
      },
      post(path, fields) {
        return this.request(path, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(fields),
        });
      },
      async login(pass) {
        const csrf = await this.token("/acceso");
        return this.post("/acceso", { email, password: pass, _csrf: csrf });
      },
    };
  }
  const owner = client(),
    resetter = client();
  try {
    const hash = await hashPassword(password);
    await db.query(
      "INSERT INTO users (id, name, email, password_hash, role) VALUES ($userId, 'Prueba', $email, $hash, 'user')",
      { bind: { userId, email, hash } },
    );
    assert.equal((await owner.login(password)).status, 303);
    let csrf = await resetter.token("/recuperar");
    assert.equal((await resetter.post("/recuperar", { email })).status, 403);
    const unknown = await resetter.post("/recuperar", {
      email: `${randomUUID()}@example.invalid`,
      _csrf: csrf,
    });
    assert.equal(unknown.status, 200);
    assert.equal(messages.length, 0);
    csrf = await resetter.token("/recuperar");
    const response = await resetter.post("/recuperar", { email, _csrf: csrf });
    assert.equal(response.status, 200);
    assert.equal(messages.length, 1);
    assert.equal(messages[0].to, email);
    const token = new URL(messages[0].url).searchParams.get("token");
    assert.match(token, /^[a-f0-9]{64}$/);
    const stored = await db.query(
      "SELECT token_hash FROM password_reset_tokens WHERE user_id = $userId",
      { bind: { userId }, type: QueryTypes.SELECT },
    );
    assert.equal(stored.length, 1);
    assert.notEqual(stored[0].token_hash, token);
    assert.equal(
      stored[0].token_hash,
      createHash("sha256").update(token).digest("hex"),
    );
    const resetPage = await resetter.request(`/restablecer?token=${token}`);
    assert.equal(resetPage.status, 200);
    assert.equal(resetPage.headers.get("referrer-policy"), "no-referrer");
    csrf = (await resetPage.text()).match(/name="_csrf" value="([^"]+)"/)[1];
    assert.equal(
      (
        await resetter.post("/restablecer", {
          token,
          password: newPassword,
          confirmPassword: newPassword,
          _csrf: csrf,
        })
      ).status,
      200,
    );
    assert.equal((await owner.request("/cuenta")).status, 303);
    csrf = await resetter.token(`/restablecer?token=${token}`);
    assert.equal(
      (
        await resetter.post("/restablecer", {
          token,
          password: newPassword,
          confirmPassword: newPassword,
          _csrf: csrf,
        })
      ).status,
      400,
    );
    assert.equal((await owner.login(password)).status, 401);
    assert.equal((await owner.login(newPassword)).status, 303);
    csrf = await resetter.token("/recuperar");
    assert.equal(
      (await resetter.post("/recuperar", { email, _csrf: csrf })).status,
      200,
    );
    const expiredToken = new URL(messages[1].url).searchParams.get("token");
    await db.query(
      "UPDATE password_reset_tokens SET expires_at = DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 1 SECOND) WHERE user_id = $userId AND used_at IS NULL",
      { bind: { userId } },
    );
    csrf = await resetter.token(`/restablecer?token=${expiredToken}`);
    assert.equal(
      (
        await resetter.post("/restablecer", {
          token: expiredToken,
          password,
          confirmPassword: password,
          _csrf: csrf,
        })
      ).status,
      400,
    );
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    for (const id of sessions)
      await db.query("DELETE FROM sessions WHERE session_id = $id", {
        bind: { id },
      });
    await db.query("DELETE FROM users WHERE id = $userId", {
      bind: { userId },
    });
    await db.close();
  }
});
