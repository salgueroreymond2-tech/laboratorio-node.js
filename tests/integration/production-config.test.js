import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { Sequelize } from "sequelize";
import signature from "cookie-signature";
import { assertIsolatedTestDatabase } from "../../src/lib/testDatabase.js";
import { createApp } from "../../src/app.js";

test("configuración de producción exige controles y emite cookies seguras detrás del proxy", async () => {
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
  assert.throws(() => createApp({ database: db, production: true }));
  const app = createApp({
    database: db,
    production: true,
    authConfig: {
      sessionSecret: secret,
      csrfSecret: "test-csrf-secret-".repeat(4),
    },
    notesKey: randomBytes(32),
    auditKey: randomBytes(32),
  });
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  let sessionId;
  try {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/recuperar`,
      { headers: { "x-forwarded-proto": "https" } },
    );
    assert.equal(response.status, 200);
    const cookies = response.headers.getSetCookie(),
      session = cookies.find((cookie) => cookie.startsWith("sv.sid=")),
      csrf = cookies.find((cookie) => cookie.startsWith("sv.csrf="));
    assert.ok(session && csrf);
    for (const cookie of [session, csrf]) {
      assert.match(cookie, /; Secure/i);
      assert.match(cookie, /; HttpOnly/i);
      assert.match(cookie, /; SameSite=Lax/i);
    }
    const encoded = session.split(";")[0].slice("sv.sid=".length),
      decoded = decodeURIComponent(encoded);
    sessionId = signature.unsign(decoded.slice(2), secret);
    assert.ok(sessionId);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    if (sessionId)
      await db.query("DELETE FROM sessions WHERE session_id = $id", {
        bind: { id: sessionId },
      });
    await db.close();
  }
});
