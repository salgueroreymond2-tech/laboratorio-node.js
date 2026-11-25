import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { Sequelize, QueryTypes } from "sequelize";
import { assertIsolatedTestDatabase } from "../../src/lib/testDatabase.js";
import { auditRepository } from "../../src/repositories/audit.repository.js";
import { auditService } from "../../src/services/audit.service.js";
import { provisionDemoAccounts } from "../../src/services/demo.service.js";

test("cuentas sintéticas idempotentes no cambian roles ni contraseñas existentes", async () => {
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
  const prefix = randomUUID(),
    input = {
      userEmail: `${prefix}-user@example.invalid`,
      userPassword: "Ejemplo#seguro-298371",
      adminEmail: `${prefix}-admin@example.invalid`,
      adminPassword: "Otra#contraseña-580291",
    };
  const audit = auditService(auditRepository(db), randomBytes(32));
  try {
    assert.equal(await provisionDemoAccounts(db, audit, input), 2);
    assert.equal(await provisionDemoAccounts(db, audit, input), 0);
    await assert.rejects(
      provisionDemoAccounts(db, audit, {
        ...input,
        userPassword: "Diferente#12345678",
      }),
    );
    const rows = await db.query(
      "SELECT role FROM users WHERE email IN ($first, $second) ORDER BY role",
      {
        bind: { first: input.userEmail, second: input.adminEmail },
        type: QueryTypes.SELECT,
      },
    );
    assert.deepEqual(rows.map((row) => row.role).sort(), ["admin", "user"]);
  } finally {
    for (const email of [input.userEmail, input.adminEmail]) {
      const rows = await db.query("SELECT id FROM users WHERE email = $email", {
        bind: { email },
        type: QueryTypes.SELECT,
      });
      for (const row of rows)
        await db.query(
          "DELETE FROM security_events WHERE event_type = 'demo_account_created' AND JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.targetId')) = $id",
          { bind: { id: row.id } },
        );
      await db.query("DELETE FROM users WHERE email = $email", {
        bind: { email },
      });
    }
    await db.close();
  }
});
