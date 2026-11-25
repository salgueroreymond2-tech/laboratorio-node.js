import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { assertIsolatedTestDatabase } from "../../src/lib/testDatabase.js";

test("test database guard rejects remote hosts, other databases and non-test environments", () => {
  const safe = {
    nodeEnv: "test",
    host: "127.0.0.1",
    database: "securevault_test_db",
  };
  assert.doesNotThrow(() => assertIsolatedTestDatabase(safe));
  for (const invalid of [
    { ...safe, host: "database.example.invalid" },
    { ...safe, host: "127.0.0.1.example.invalid" },
    { ...safe, database: "securevault_db" },
    { ...safe, nodeEnv: "production" },
    { ...safe, nodeEnv: "development" },
  ])
    assert.throws(() => assertIsolatedTestDatabase(invalid));
});

test("test migrations refuse a remote destination before attempting a connection", () => {
  const result = spawnSync(process.execPath, ["scripts/migrate.js", "--test"], {
    encoding: "utf8",
    timeout: 15000,
    env: {
      NODE_ENV: "test",
      MIGRATION_DB_HOST: "database.example.invalid",
      MIGRATION_DB_PORT: "3306",
      MIGRATION_DB_USER: "synthetic",
      MIGRATION_DB_PASSWORD: "synthetic",
    },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /servidor local aislado/);
});

test("production migrations refuse to run without explicit confirmation and TLS", () => {
  const result = spawnSync(process.execPath, ["scripts/migrate.js"], {
    encoding: "utf8",
    timeout: 15000,
    env: {
      NODE_ENV: "production",
      DB_USER: "app_user",
      MIGRATION_DB_HOST: "database.example.invalid",
      MIGRATION_DB_PORT: "3306",
      MIGRATION_DB_USER: "migration_user",
      MIGRATION_DB_PASSWORD: "synthetic",
    },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /confirmación/);
});
