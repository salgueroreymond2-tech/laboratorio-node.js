import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { createServer } from "node:net";

test("los errores de configuración indican campos sin exponer secretos", () => {
  const dir = mkdtempSync(join(tmpdir(), "securevault-startup-"));
  const marker = "synthetic-private-password-marker";
  try {
    const result = spawnSync(
      process.execPath,
      [fileURLToPath(new URL("../../src/server.js", import.meta.url))],
      {
        cwd: dir,
        timeout: 15000,
        encoding: "utf8",
        env: {
          SystemRoot: process.env.SystemRoot || "",
          NODE_ENV: "production",
          DB_HOST: "127.0.0.1",
          DB_PORT: "3306",
          DB_NAME: "securevault_db",
          DB_USER: "demo",
          DB_PASSWORD: marker,
          SESSION_SECRET: "s".repeat(64),
          CSRF_SECRET: "c".repeat(64),
          NOTES_ENCRYPTION_KEY: "ab".repeat(32),
          AUDIT_HMAC_KEY: "cd".repeat(32),
        },
      },
    );
    assert.equal(result.status, 1);
    const output = result.stdout + result.stderr;
    assert.doesNotMatch(output, new RegExp(marker));
    const entry = JSON.parse(result.stdout.trim());
    assert.ok(entry.fields.includes("DB_HOST"));
    assert.ok(entry.fields.includes("DB_TLS_CA"));
    assert.ok(entry.fields.includes("APP_URL"));
  } finally {
    rmdirSync(dir);
  }
});

test("un fallo de conexión informa un código controlado sin datos de acceso", async () => {
  const probe = createServer();
  await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const port = probe.address().port;
  await new Promise((resolve, reject) =>
    probe.close((error) => (error ? reject(error) : resolve())),
  );
  const dir = mkdtempSync(join(tmpdir(), "securevault-db-startup-"));
  const marker = "synthetic-private-password-marker";
  try {
    const result = spawnSync(
      process.execPath,
      [fileURLToPath(new URL("../../src/server.js", import.meta.url))],
      {
        cwd: dir,
        timeout: 15000,
        encoding: "utf8",
        env: {
          SystemRoot: process.env.SystemRoot || "",
          NODE_ENV: "development",
          DB_HOST: "127.0.0.1",
          DB_PORT: String(port),
          DB_NAME: "securevault_db",
          DB_USER: "demo",
          DB_PASSWORD: marker,
          SESSION_SECRET: "s".repeat(64),
          CSRF_SECRET: "c".repeat(64),
          NOTES_ENCRYPTION_KEY: "ab".repeat(32),
          AUDIT_HMAC_KEY: "cd".repeat(32),
        },
      },
    );
    assert.equal(result.status, 1);
    const output = result.stdout + result.stderr;
    assert.doesNotMatch(output, new RegExp(marker));
    const entry = JSON.parse(result.stdout.trim());
    assert.equal(entry.code, "ECONNREFUSED");
  } finally {
    rmdirSync(dir);
  }
});
