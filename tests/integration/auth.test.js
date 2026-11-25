import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { URLSearchParams } from "node:url";
import { Sequelize, QueryTypes } from "sequelize";
import signature from "cookie-signature";
import { createApp } from "../../src/app.js";
import { assertIsolatedTestDatabase } from "../../src/lib/testDatabase.js";
import { verifyPassword } from "../../src/lib/password.js";

test("registro, sesión, CSRF y cierre de sesión contra MySQL aislado", async () => {
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
  const app = createApp({
    database: db,
    authConfig: {
      sessionSecret: secret,
      csrfSecret: "test-csrf-secret-".repeat(4),
    },
  });
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const email = `${randomUUID()}@example.invalid`;
  const password = "Ejemplo#seguro-298371";
  const cookies = new Map();
  const sessionIds = new Set();
  async function request(path, options = {}) {
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
      const separator = pair.indexOf("=");
      const key = pair.slice(0, separator);
      const value = pair.slice(separator + 1);
      cookies.set(key, value);
      if (key === "sv.sid" && value) {
        const decoded = decodeURIComponent(value);
        const id =
          decoded.startsWith("s:") &&
          signature.unsign(decoded.slice(2), secret);
        if (id) sessionIds.add(id);
      }
    }
    return response;
  }
  async function token(path) {
    const response = await request(path);
    assert.equal(response.status, 200);
    const match = (await response.text()).match(/name="_csrf" value="([^"]+)"/);
    assert.ok(match);
    return match[1];
  }
  const post = (path, fields) =>
    request(path, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(fields),
    });
  try {
    assert.equal((await request("/cuenta")).status, 303);
    let csrf = await token("/registro");
    assert.equal(
      (await post("/registro", { name: "Prueba", email, password })).status,
      403,
    );
    assert.equal(
      (
        await post("/registro", {
          name: "Prueba",
          email,
          password,
          role: "admin",
          _csrf: csrf,
        })
      ).status,
      400,
    );
    csrf = await token("/registro");
    assert.equal(
      (
        await post("/registro", {
          name: "Prueba",
          email,
          password,
          _csrf: csrf,
        })
      ).status,
      200,
    );
    const users = await db.query(
      "SELECT id, password_hash, role FROM users WHERE email = $email",
      { bind: { email }, type: QueryTypes.SELECT },
    );
    assert.equal(users.length, 1);
    assert.equal(users[0].role, "user");
    assert.match(users[0].password_hash, /^\$2[aby]\$12\$/);
    assert.equal(await verifyPassword(users[0].password_hash, password), true);
    csrf = await token("/registro");
    assert.equal(
      (
        await post("/registro", {
          name: "Prueba",
          email,
          password,
          _csrf: csrf,
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await db.query("SELECT id FROM users WHERE email = $email", {
          bind: { email },
          type: QueryTypes.SELECT,
        })
      ).length,
      1,
    );
    csrf = await token("/acceso");
    assert.equal(
      (await post("/acceso", { email, password: "incorrecta", _csrf: csrf }))
        .status,
      401,
    );
    csrf = await token("/acceso");
    const oldSession = cookies.get("sv.sid");
    const login = await post("/acceso", { email, password, _csrf: csrf });
    assert.equal(login.status, 303);
    assert.equal(login.headers.get("location"), "/cuenta");
    assert.notEqual(cookies.get("sv.sid"), oldSession);
    csrf = await token("/cuenta");
    assert.equal((await post("/salir", {})).status, 403);
    assert.equal((await post("/salir", { _csrf: csrf })).status, 303);
    assert.equal((await request("/cuenta")).status, 303);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    for (const id of sessionIds)
      await db.query("DELETE FROM sessions WHERE session_id = $id", {
        bind: { id },
      });
    await db.query("DELETE FROM users WHERE email = $email", {
      bind: { email },
    });
    await db.close();
  }
});
