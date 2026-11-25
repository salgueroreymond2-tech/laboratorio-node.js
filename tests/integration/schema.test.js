import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import mysql from "mysql2/promise";
import { assertIsolatedTestDatabase } from "../../src/lib/testDatabase.js";

test("initial migration creates the expected tables in the isolated test database", async () => {
  const { TEST_DB_HOST, TEST_DB_PORT, TEST_DB_USER, TEST_DB_PASSWORD } =
    process.env;
  if (!TEST_DB_HOST || !TEST_DB_PORT || !TEST_DB_USER || !TEST_DB_PASSWORD) {
    throw new Error(
      "Se requieren credenciales explícitas de la base de pruebas.",
    );
  }
  assertIsolatedTestDatabase({
    nodeEnv: process.env.NODE_ENV,
    host: TEST_DB_HOST,
    database: "securevault_test_db",
  });
  const db = await mysql.createConnection({
    host: TEST_DB_HOST,
    port: Number(TEST_DB_PORT),
    user: TEST_DB_USER,
    password: TEST_DB_PASSWORD,
    database: "securevault_test_db",
    connectTimeout: 5000,
  });
  try {
    const [tables] = await db.execute(
      "SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA = ?",
      ["securevault_test_db"],
    );
    assert.deepEqual(tables.map((row) => row.TABLE_NAME).sort(), [
      "auth_attempts",
      "notes",
      "password_reset_tokens",
      "schema_migrations",
      "security_events",
      "sessions",
      "user_profiles",
      "users",
    ]);
    const [migrations] = await db.execute("SELECT name FROM schema_migrations");
    assert.deepEqual(migrations.map((row) => row.name).sort(), [
      "20261125-initial-schema",
      "20261126-index-names",
    ]);
    const [foreignKeys] = await db.execute(
      "SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME = ?",
      ["securevault_test_db", "users"],
    );
    assert.ok(
      foreignKeys.some(
        (row) => row.TABLE_NAME === "notes" && row.COLUMN_NAME === "owner_id",
      ),
    );
    assert.ok(
      foreignKeys.some(
        (row) =>
          row.TABLE_NAME === "password_reset_tokens" &&
          row.COLUMN_NAME === "user_id",
      ),
    );
  } finally {
    await db.end();
  }
});
