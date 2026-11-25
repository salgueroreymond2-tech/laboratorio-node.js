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
import { auditRepository } from "../../src/repositories/audit.repository.js";
import { auditService } from "../../src/services/audit.service.js";

test("administración restringida y eventos con firma verificable", async () => {
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
    auditKey = randomBytes(32);
  const server = createServer(
    createApp({
      database: db,
      authConfig: {
        sessionSecret: secret,
        csrfSecret: "test-csrf-secret-".repeat(4),
      },
      notesKey: randomBytes(32),
      auditKey,
    }),
  );
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`,
    ids = [randomUUID(), randomUUID()],
    emails = ids.map((id) => `${id}@example.invalid`),
    password = "Ejemplo#seguro-298371",
    sessions = new Set();
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
      async login(email) {
        const response = await this.request("/acceso"),
          match = (await response.text()).match(/name="_csrf" value="([^"]+)"/);
        assert.ok(match);
        return this.request("/acceso", {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ email, password, _csrf: match[1] }),
        });
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
    };
  }
  const admin = client(),
    user = client(),
    anonymous = client();
  try {
    const hash = await hashPassword(password);
    await db.query(
      "INSERT INTO users (id, name, email, password_hash, role) VALUES ($id, 'Admin prueba', $email, $hash, 'admin')",
      { bind: { id: ids[0], email: emails[0], hash } },
    );
    await db.query(
      "INSERT INTO users (id, name, email, password_hash, role) VALUES ($id, 'Usuario prueba', $email, $hash, 'user')",
      { bind: { id: ids[1], email: emails[1], hash } },
    );
    assert.equal((await anonymous.request("/admin")).status, 303);
    assert.equal((await user.login(emails[1])).status, 303);
    assert.equal((await user.request("/admin")).status, 403);
    assert.equal((await user.request("/admin/usuarios")).status, 403);
    assert.equal((await user.request("/admin/eventos")).status, 403);
    assert.equal((await admin.login(emails[0])).status, 303);
    assert.equal((await admin.request("/admin")).status, 200);
    const users = await admin.request("/admin/usuarios");
    assert.equal(users.status, 200);
    const html = await users.text();
    assert.match(html, /Usuario prueba/);
    assert.doesNotMatch(html, /\$2b\$12\$/);
    const rolePath = `/admin/usuarios/${ids[1]}/rol`;
    assert.equal((await user.request(rolePath)).status, 403);
    let csrf = await admin.token(rolePath);
    assert.equal(
      (await admin.post(rolePath, { role: "admin", currentPassword: password }))
        .status,
      403,
    );
    assert.equal(
      (
        await admin.post(rolePath, {
          role: "admin",
          currentPassword: "wrong",
          _csrf: csrf,
        })
      ).status,
      400,
    );
    csrf = await admin.token(`/admin/usuarios/${ids[0]}/rol`);
    assert.equal(
      (
        await admin.post(`/admin/usuarios/${ids[0]}/rol`, {
          role: "user",
          currentPassword: password,
          _csrf: csrf,
        })
      ).status,
      400,
    );
    csrf = await admin.token(rolePath);
    assert.equal(
      (
        await admin.post(rolePath, {
          role: "admin",
          currentPassword: password,
          _csrf: csrf,
        })
      ).status,
      303,
    );
    const promoted = await db.query("SELECT role FROM users WHERE id = $id", {
      bind: { id: ids[1] },
      type: QueryTypes.SELECT,
    });
    assert.equal(promoted[0].role, "admin");
    assert.equal((await user.request("/cuenta")).status, 303);
    csrf = await admin.token(rolePath);
    assert.equal(
      (
        await admin.post(rolePath, {
          role: "user",
          currentPassword: password,
          _csrf: csrf,
        })
      ).status,
      303,
    );
    const events = await admin.request("/admin/eventos");
    assert.equal(events.status, 200);
    assert.match(await events.text(), /Válida/);
    const eventRows = await db.query(
      "SELECT id FROM security_events WHERE actor_user_id = $id ORDER BY id DESC LIMIT 1",
      { bind: { id: ids[0] }, type: QueryTypes.SELECT },
    );
    assert.equal(eventRows.length, 1);
    const audit = auditService(auditRepository(db), auditKey);
    assert.equal(
      (await audit.list(1)).events.find(
        (event) => String(event.id) === String(eventRows[0].id),
      ).valid,
      true,
    );
    await db.query(
      "UPDATE security_events SET severity = 'critical' WHERE id = $id",
      { bind: { id: eventRows[0].id } },
    );
    assert.equal(
      (await audit.list(1)).events.find(
        (event) => String(event.id) === String(eventRows[0].id),
      ).valid,
      false,
    );
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    for (const id of sessions)
      await db.query("DELETE FROM sessions WHERE session_id = $id", {
        bind: { id },
      });
    for (const id of ids) {
      await db.query("DELETE FROM security_events WHERE actor_user_id = $id", {
        bind: { id },
      });
      await db.query("DELETE FROM users WHERE id = $id", { bind: { id } });
    }
    await db.close();
  }
});
