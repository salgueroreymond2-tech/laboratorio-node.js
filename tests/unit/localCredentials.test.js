import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyLocalCredentials } from "../../src/config/localCredentials.js";

test("credenciales de entorno sobreviven si el archivo local no existe", () => {
  const env = { NODE_ENV: "development", DB_USER: "app", DB_PASSWORD: "test" };
  const dir = mkdtempSync(join(tmpdir(), "securevault-local-"));
  try {
    applyLocalCredentials(env, join(dir, "absent.env"));
    assert.equal(env.DB_USER, "app");
    assert.equal(env.DB_PASSWORD, "test");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("producción ignora credenciales locales; desarrollo exige credenciales completas", () => {
  const dir = mkdtempSync(join(tmpdir(), "securevault-local-"));
  const path = join(dir, "app.env");
  try {
    writeFileSync(path, "DB_USER=local\nDB_PASSWORD=localpass\n");
    const production = {
      NODE_ENV: "production",
      DB_USER: "app",
      DB_PASSWORD: "test",
    };
    applyLocalCredentials(production, path);
    assert.equal(production.DB_USER, "app");
    assert.equal(production.DB_PASSWORD, "test");
    const development = { NODE_ENV: "development" };
    applyLocalCredentials(development, path);
    assert.equal(development.DB_USER, "local");
    assert.equal(development.DB_PASSWORD, "localpass");
    writeFileSync(path, "DB_USER=local\n");
    assert.throws(() => applyLocalCredentials(development, path));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
