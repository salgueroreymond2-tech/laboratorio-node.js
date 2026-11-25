import "dotenv/config";
import mysql from "mysql2/promise";
import * as initial from "../migrations/20261125-initial-schema.js";
import * as indexNames from "../migrations/20261126-index-names.js";

// Compare a previously migrated, isolated reference database before recording a baseline.
const host = process.env.MIGRATION_DB_HOST;
const port = Number(process.env.MIGRATION_DB_PORT);
const user = process.env.MIGRATION_DB_USER;
const password = process.env.MIGRATION_DB_PASSWORD;
if (
  !host ||
  !Number.isInteger(port) ||
  port < 1 ||
  port > 65535 ||
  !user ||
  !password ||
  process.env.NODE_ENV === "production"
) {
  console.error(
    "Se necesitan credenciales de migración válidas en entorno local.",
  );
  process.exit(1);
}
const expected = [
  "auth_attempts",
  "notes",
  "password_reset_tokens",
  "security_events",
  "sessions",
  "user_profiles",
  "users",
];
const queries = [
  "SELECT TABLE_NAME, ENGINE, TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME <> 'schema_migrations' ORDER BY TABLE_NAME",
  "SELECT TABLE_NAME,COLUMN_NAME,ORDINAL_POSITION,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA,CHARACTER_SET_NAME,COLLATION_NAME,GENERATION_EXPRESSION FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME <> 'schema_migrations' ORDER BY TABLE_NAME,ORDINAL_POSITION",
  "SELECT TABLE_NAME,INDEX_NAME,NON_UNIQUE,SEQ_IN_INDEX,COLUMN_NAME,SUB_PART,INDEX_TYPE FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=? AND TABLE_NAME <> 'schema_migrations' ORDER BY TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX",
  "SELECT k.TABLE_NAME,k.CONSTRAINT_NAME,k.COLUMN_NAME,k.ORDINAL_POSITION,k.REFERENCED_TABLE_NAME,k.REFERENCED_COLUMN_NAME,r.UPDATE_RULE,r.DELETE_RULE FROM information_schema.KEY_COLUMN_USAGE k JOIN information_schema.REFERENTIAL_CONSTRAINTS r ON r.CONSTRAINT_SCHEMA=k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME=k.CONSTRAINT_NAME AND r.TABLE_NAME=k.TABLE_NAME WHERE k.TABLE_SCHEMA=? AND k.REFERENCED_TABLE_NAME IS NOT NULL ORDER BY k.TABLE_NAME,k.CONSTRAINT_NAME,k.ORDINAL_POSITION",
  "SELECT TRIGGER_NAME,EVENT_MANIPULATION,EVENT_OBJECT_TABLE,ACTION_STATEMENT,ACTION_TIMING FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=? ORDER BY TRIGGER_NAME",
  "SELECT tc.TABLE_NAME,tc.CONSTRAINT_NAME,cc.CHECK_CLAUSE,tc.ENFORCED FROM information_schema.TABLE_CONSTRAINTS tc JOIN information_schema.CHECK_CONSTRAINTS cc ON cc.CONSTRAINT_SCHEMA=tc.CONSTRAINT_SCHEMA AND cc.CONSTRAINT_NAME=tc.CONSTRAINT_NAME WHERE tc.CONSTRAINT_SCHEMA=? AND tc.CONSTRAINT_TYPE='CHECK' ORDER BY tc.TABLE_NAME,tc.CONSTRAINT_NAME",
];
let db;
try {
  db = await mysql.createConnection({
    host,
    port,
    user,
    password,
    connectTimeout: 5000,
  });
  const [schema] = await db.execute(
    "SELECT SCHEMA_NAME,DEFAULT_CHARACTER_SET_NAME,DEFAULT_COLLATION_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME IN (?,?) ORDER BY SCHEMA_NAME",
    ["securevault_db", "securevault_test_db"],
  );
  if (
    schema.length !== 2 ||
    schema[0].DEFAULT_CHARACTER_SET_NAME !==
      schema[1].DEFAULT_CHARACTER_SET_NAME ||
    schema[0].DEFAULT_COLLATION_NAME !== schema[1].DEFAULT_COLLATION_NAME
  )
    throw new Error(
      "Las bases no existen o tienen distintas configuraciones de caracteres.",
    );
  const [already] = await db.execute(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME=?",
    ["securevault_db", "schema_migrations"],
  );
  if (already.length)
    throw new Error(
      "La base principal ya tiene historial de migraciones; no se altera.",
    );
  const [versions] = await db.query(
    "SELECT name FROM securevault_test_db.schema_migrations ORDER BY name",
  );
  if (
    JSON.stringify(versions.map((row) => row.name)) !==
    JSON.stringify([initial.name, indexNames.name])
  )
    throw new Error("El historial de la base de referencia no coincide.");
  for (const [index, query] of queries.entries()) {
    const [main] = await db.execute(query, ["securevault_db"]);
    const [reference] = await db.execute(query, ["securevault_test_db"]);
    if (
      index === 0 &&
      JSON.stringify(main.map((row) => row.TABLE_NAME)) !==
        JSON.stringify(expected)
    )
      throw new Error("El conjunto de tablas no coincide con la migración.");
    if (JSON.stringify(main) !== JSON.stringify(reference))
      throw new Error(`La estructura difiere en la comprobación ${index + 1}.`);
  }
  if (process.argv.includes("--adopt")) {
    // DDL commits implicitly. If insertion fails the operator must inspect the ledger.
    await db.query(
      "CREATE TABLE securevault_db.schema_migrations (name VARCHAR(128) NOT NULL PRIMARY KEY, applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)) ENGINE=InnoDB",
    );
    await db.execute(
      "INSERT INTO securevault_db.schema_migrations (name) VALUES (?), (?)",
      [initial.name, indexNames.name],
    );
    console.log("Estructura verificada e historial de migraciones registrado.");
  } else {
    console.log(
      "Las estructuras y el historial de referencia coinciden; no se hicieron cambios.",
    );
  }
} catch (error) {
  console.error(
    "Adopción detenida:",
    error.code ? "revise permisos y estado de las bases." : error.message,
  );
  process.exitCode = 1;
} finally {
  if (db) await db.end();
}
