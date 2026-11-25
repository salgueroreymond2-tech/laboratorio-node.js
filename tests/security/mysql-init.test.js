import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const gitBash = "C:\\Program Files\\Git\\bin\\bash.exe";
const shell =
  process.platform === "win32" && existsSync(gitBash) ? gitBash : "bash";

function runInit(overrides = {}) {
  const password = () => randomBytes(32).toString("hex");
  return spawnSync(
    shell,
    ["-c", "mysql() { cat; }; . scripts/mysql-init-users.sh"],
    {
      encoding: "utf8",
      timeout: 5000,
      env: {
        ...process.env,
        MYSQL_ROOT_PASSWORD: password(),
        SV_APP_PASSWORD: password(),
        SV_MIGRATOR_PASSWORD: password(),
        SV_TEST_PASSWORD: password(),
        ...overrides,
      },
    },
  );
}

test("MySQL init rejects invalid passwords before executing SQL", () => {
  const result = runInit({ SV_APP_PASSWORD: "bad'input" });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /contraseñas MySQL/);
});

test("MySQL init creates scoped grants using supplied synthetic passwords", () => {
  const result = runInit();
  assert.equal(result.status, 0);
  assert.match(
    result.stdout,
    /GRANT SELECT, INSERT, UPDATE, DELETE ON securevault_db\.\*/,
  );
  assert.match(
    result.stdout,
    /GRANT ALL PRIVILEGES ON securevault_test_db\.\*/,
  );
  assert.doesNotMatch(result.stdout, /GRANT ALL PRIVILEGES ON \*\.\*/);
});
