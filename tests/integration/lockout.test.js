import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHmac } from "node:crypto";
import { Sequelize } from "sequelize";
import { assertIsolatedTestDatabase } from "../../src/lib/testDatabase.js";
import { loginAttemptsRepository } from "../../src/repositories/login-attempts.repository.js";
import { loginAttemptsService } from "../../src/services/login-attempts.service.js";

test("bloqueo de cuenta persiste en MySQL, expira y se puede reiniciar", async () => {
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
  const key = randomBytes(32),
    email = `${randomUUID()}@example.invalid`,
    repository = loginAttemptsRepository(db);
  const scope = createHmac("sha256", key)
    .update(`login:${email}`, "utf8")
    .digest("hex");
  try {
    let service = loginAttemptsService(repository, key);
    for (let i = 0; i < 4; i++) await service.fail(email);
    assert.equal(await service.locked(email), false);
    await service.fail(email);
    assert.equal(await service.locked(email), true);
    service = loginAttemptsService(repository, key);
    assert.equal(await service.locked(email), true);
    await db.query(
      "UPDATE auth_attempts SET locked_until = DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 1 SECOND) WHERE scope_key = $scope",
      { bind: { scope } },
    );
    assert.equal(await service.locked(email), false);
    await service.fail(email);
    assert.equal(await service.locked(email), false);
    await service.clear(email);
    assert.equal(await service.locked(email), false);
  } finally {
    await db.query("DELETE FROM auth_attempts WHERE scope_key = $scope", {
      bind: { scope },
    });
    await db.close();
  }
});
