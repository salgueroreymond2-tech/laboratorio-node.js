import "dotenv/config";
import { Sequelize, QueryTypes } from "sequelize";
import mysql from "mysql2/promise";
import * as initial from "../migrations/20261125-initial-schema.js";
import * as indexNames from "../migrations/20261126-index-names.js";
import { assertIsolatedTestDatabase } from "../src/lib/testDatabase.js";

// Require a separate migration account; never fall back to application credentials.
const testMode = process.argv.includes("--test");
const dbName = testMode ? "securevault_test_db" : "securevault_db";
const host = process.env.MIGRATION_DB_HOST;
const port = Number(process.env.MIGRATION_DB_PORT);
const user = process.env.MIGRATION_DB_USER;
const password = process.env.MIGRATION_DB_PASSWORD;
const production = process.env.NODE_ENV === "production";
const ca = process.env.MIGRATION_DB_TLS_CA || process.env.DB_TLS_CA;
if (testMode) {
  try {
    assertIsolatedTestDatabase({
      nodeEnv: process.env.NODE_ENV,
      host,
      database: dbName,
    });
  } catch {
    console.error(
      "La migración de pruebas requiere NODE_ENV=test y un servidor local aislado.",
    );
    process.exit(1);
  }
}
if (
  !host ||
  !Number.isInteger(port) ||
  port < 1 ||
  port > 65535 ||
  !user ||
  !password ||
  (!production &&
    !["127.0.0.1", "localhost", "::1"].includes(host.toLowerCase())) ||
  (production &&
    (process.env.CONFIRM_PRODUCTION_MIGRATION !== "yes" ||
      !process.env.DB_USER ||
      user === process.env.DB_USER ||
      user.toLowerCase() === "root" ||
      /^(localhost|127\.|::1$|\[::1\]$|0\.0\.0\.0$)/i.test(host) ||
      !ca?.includes("-----BEGIN CERTIFICATE-----") ||
      !ca?.includes("-----END CERTIFICATE-----")))
) {
  console.error(
    "Faltan credenciales, certificado o confirmación válidos para la migración.",
  );
  process.exit(1);
}
const db = new Sequelize(dbName, user, password, {
  dialect: "mysql",
  host,
  port,
  logging: false,
  dialectOptions: {
    connectTimeout: 5000,
    ...(production ? { ssl: { ca, rejectUnauthorized: true } } : {}),
  },
});
let lockConnection;
let lockAcquired = false;
try {
  await db.authenticate();
  lockConnection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database: dbName,
    connectTimeout: 5000,
    ...(production ? { ssl: { ca, rejectUnauthorized: true } } : {}),
  });
  const [lockRows] = await lockConnection.execute(
    "SELECT GET_LOCK(?, 10) AS acquired",
    [`${dbName}:migrations`],
  );
  if (lockRows[0]?.acquired !== 1)
    throw new Error("No se pudo obtener el bloqueo de migración");
  lockAcquired = true;
  const tables = await db.query(
    "SELECT TABLE_NAME AS name FROM information_schema.tables WHERE TABLE_SCHEMA = :dbName AND TABLE_TYPE = 'BASE TABLE'",
    { replacements: { dbName }, type: QueryTypes.SELECT },
  );
  const names = tables.map((table) => table.name);
  if (names.includes("schema_migrations")) {
    const applied = await db.query(
      "SELECT name FROM schema_migrations WHERE name = :name",
      { replacements: { name: initial.name }, type: QueryTypes.SELECT },
    );
    if (applied.length === 1) {
      console.log("Migración inicial ya registrada.");
    } else {
      throw new Error(
        "La base contiene una migración incompleta o desconocida; requiere revisión manual.",
      );
    }
  } else if (names.length !== 0) {
    throw new Error(
      "La base ya contiene tablas: no se adoptará ni modificará automáticamente.",
    );
  } else {
    // MySQL DDL commits implicitly. A failure requires manual inspection; never auto-delete.
    await db.query(
      "CREATE TABLE schema_migrations (name VARCHAR(128) NOT NULL PRIMARY KEY, applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)) ENGINE=InnoDB",
    );
    for (const statement of initial.statements) await db.query(statement);
    await db.query("INSERT INTO schema_migrations (name) VALUES (:name)", {
      replacements: { name: initial.name },
    });
    console.log(`Migración inicial aplicada a ${dbName}.`);
  }
  const indexMigration = await db.query(
    "SELECT name FROM schema_migrations WHERE name = :name",
    { replacements: { name: indexNames.name }, type: QueryTypes.SELECT },
  );
  if (indexMigration.length === 0) {
    for (const statement of indexNames.statements) await db.query(statement);
    await db.query("INSERT INTO schema_migrations (name) VALUES (:name)", {
      replacements: { name: indexNames.name },
    });
    console.log("Nombres de índices migrados.");
  }
} catch (error) {
  console.error(
    "Migración detenida:",
    error.message?.startsWith("La base ")
      ? error.message
      : "revise conexión, permisos y estado de las tablas.",
  );
  process.exitCode = 1;
} finally {
  if (lockConnection) {
    if (lockAcquired) {
      try {
        await lockConnection.execute("SELECT RELEASE_LOCK(?)", [
          `${dbName}:migrations`,
        ]);
      } catch {
        process.exitCode = 1;
      }
    }
    await lockConnection.end();
  }
  await db.close();
}
