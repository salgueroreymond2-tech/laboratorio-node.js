import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { URLSearchParams } from "node:url";
import { Sequelize, QueryTypes } from "sequelize";
import signature from "cookie-signature";
import { createApp } from "../../src/app.js";
import { hashPassword } from "../../src/lib/password.js";
import { assertIsolatedTestDatabase } from "../../src/lib/testDatabase.js";

test("perfil cifrado, acceso propio y cambio de contraseña revocan otras sesiones", async () => {
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
  const secret = "test-session-secret-".repeat(4);
  const server = createServer(
    createApp({
      database: db,
      authConfig: {
        sessionSecret: secret,
        csrfSecret: "test-csrf-secret-".repeat(4),
      },
      notesKey: randomBytes(32),
    }),
  );
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`,
    userId = randomUUID(),
    email = `${userId}@example.invalid`;
  const password = "Ejemplo#seguro-298371",
    newPassword = "Otra#contraseña-580291";
  const sessions = new Set();
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
        const match = (await response.text()).match(
          /name="_csrf" value="([^"]+)"/,
        );
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
  const first = client(),
    second = client(),
    anonymous = client();
  try {
    const hash = await hashPassword(password);
    await db.query(
      "INSERT INTO users (id, name, email, password_hash, role) VALUES ($userId, 'Prueba', $email, $hash, 'user')",
      { bind: { userId, email, hash } },
    );
    assert.equal((await anonymous.request("/perfil")).status, 303);
    assert.equal((await first.login(password)).status, 303);
    assert.equal((await second.login(password)).status, 303);
    let csrf = await first.token("/perfil");
    assert.equal(
      (await first.post("/perfil", { name: "Nombre", phone: "+506 8888-4321" }))
        .status,
      403,
    );
    assert.equal(
      (
        await first.post("/perfil", {
          name: "Nombre",
          phone: "+506 8888-4321",
          user_id: randomUUID(),
          _csrf: csrf,
        })
      ).status,
      400,
    );
    csrf = await first.token("/perfil");
    assert.equal(
      (
        await first.post("/perfil", {
          name: "Nombre actualizado",
          phone: "+506 8888-4321",
          _csrf: csrf,
        })
      ).status,
      303,
    );
    const row = (
      await db.query(
        "SELECT encrypted_phone FROM user_profiles WHERE user_id = $userId",
        { bind: { userId }, type: QueryTypes.SELECT },
      )
    )[0];
    assert.match(row.encrypted_phone, /^v1\./);
    assert.doesNotMatch(row.encrypted_phone, /8888/);
    let html = await (await first.request("/perfil")).text();
    assert.match(html, /4321/);
    assert.doesNotMatch(html, /\+506 8888-4321/);
    const reveal = await first.request("/perfil/telefono");
    assert.equal(reveal.headers.get("cache-control"), "no-store");
    assert.match(await reveal.text(), /\+506 8888-4321/);
    assert.equal((await first.request(`/perfil/${randomUUID()}`)).status, 404);
    csrf = await first.token("/perfil/contrasena");
    assert.equal(
      (
        await first.post("/perfil/contrasena", {
          currentPassword: "incorrecta",
          newPassword,
          confirmPassword: newPassword,
          _csrf: csrf,
        })
      ).status,
      400,
    );
    csrf = await first.token("/perfil/contrasena");
    assert.equal(
      (
        await first.post("/perfil/contrasena", {
          currentPassword: password,
          newPassword,
          confirmPassword: newPassword,
          _csrf: csrf,
        })
      ).status,
      303,
    );
    assert.equal((await first.request("/perfil")).status, 200);
    assert.equal((await second.request("/perfil")).status, 303);
    assert.equal((await anonymous.login(password)).status, 401);
    assert.equal((await anonymous.login(newPassword)).status, 303);
    csrf = await first.token("/perfil");
    assert.equal(
      (
        await first.post("/perfil", {
          name: "Nombre actualizado",
          phone: "",
          clearPhone: "yes",
          _csrf: csrf,
        })
      ).status,
      303,
    );
    html = await (await first.request("/perfil")).text();
    assert.match(html, /No registrado/);
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
