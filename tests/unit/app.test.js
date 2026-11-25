import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createApp } from "../../src/app.js";
import { loadConfig } from "../../src/config/env.js";

async function withApp(database, callback) {
  const server = createServer(createApp({ database }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    await callback(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

test("health responds without leaking details and includes security headers", async () => {
  await withApp({ authenticate: async () => {} }, async (url) => {
    const response = await fetch(`${url}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
    assert.equal(response.headers.get("x-powered-by"), null);
    assert.ok(response.headers.get("content-security-policy"));
    assert.equal(response.headers.get("cache-control"), "no-store");
  });
});

test("browser receives the public EJS page while API clients retain JSON", async () => {
  await withApp({ authenticate: async () => {} }, async (url) => {
    const browser = await fetch(url, { headers: { accept: "text/html" } });
    assert.equal(browser.status, 200);
    assert.match(browser.headers.get("content-type"), /text\/html/);
    assert.equal(browser.headers.get("cache-control"), "no-store");
    const html = await browser.text();
    assert.match(html, /Un lugar para lo que/);
    assert.match(html, /guardar notas privadas en este entorno local/);
    assert.match(html, /\/assets\/css\/tokens\.css/);
    assert.doesNotMatch(html, /<form\b/);
    const api = await fetch(url, { headers: { accept: "application/json" } });
    assert.deepEqual(await api.json(), {
      message: "SecureVault está en desarrollo.",
    });
    const stylesheet = await fetch(`${url}/assets/css/tokens.css`);
    assert.equal(stylesheet.status, 200);
    assert.match(stylesheet.headers.get("content-type"), /text\/css/);
  });
});

test("browser receives a generic branded 404, JSON clients retain the API response", async () => {
  await withApp({ authenticate: async () => {} }, async (url) => {
    const browser = await fetch(`${url}/missing`, {
      headers: { accept: "text/html" },
    });
    assert.equal(browser.status, 404);
    assert.match(await browser.text(), /No encontramos esta página/);
    const api = await fetch(`${url}/missing`, {
      headers: { accept: "application/json" },
    });
    assert.equal(api.status, 404);
    assert.deepEqual(await api.json(), { error: "No encontrado" });
  });
});

test("health fails closed when the database is unavailable", async () => {
  await withApp(
    {
      authenticate: async () => {
        throw new Error("private database error");
      },
    },
    async (url) => {
      const response = await fetch(`${url}/health`);
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), { status: "unavailable" });
    },
  );
});

test("configuration rejects missing credentials and insecure production settings", () => {
  const env = {
    DB_HOST: "127.0.0.1",
    DB_PORT: "3306",
    DB_NAME: "securevault_db",
    DB_USER: "user",
    DB_PASSWORD: "test",
    SESSION_SECRET: "s".repeat(64),
    CSRF_SECRET: "c".repeat(64),
    NOTES_ENCRYPTION_KEY: "ab".repeat(32),
    AUDIT_HMAC_KEY: "cd".repeat(32),
  };
  assert.equal(loadConfig(env).PORT, 3001);
  assert.throws(() => loadConfig({ ...env, DB_PASSWORD: "" }));
  assert.throws(() => loadConfig({ ...env, DB_USER: "root" }));
  assert.throws(() => loadConfig({ ...env, NODE_ENV: "production" }));
  const production = {
    ...env,
    NODE_ENV: "production",
    DB_HOST: "mysql.internal",
    APP_URL: "https://example.invalid",
    DB_TLS_CA:
      "-----BEGIN CERTIFICATE-----\nexample\n-----END CERTIFICATE-----",
  };
  assert.equal(loadConfig(production).NODE_ENV, "production");
  assert.throws(() => loadConfig({ ...production, DB_TLS_CA: "" }));
  assert.throws(() =>
    loadConfig({ ...production, APP_URL: "http://example.invalid" }),
  );
  assert.throws(() => loadConfig({ ...production, DB_HOST: "127.0.0.1" }));
  assert.throws(() =>
    loadConfig({ ...env, AUDIT_HMAC_KEY: env.NOTES_ENCRYPTION_KEY }),
  );
  assert.throws(() =>
    loadConfig({ ...env, NOTES_ENCRYPTION_KEY: "not-a-key" }),
  );
});
