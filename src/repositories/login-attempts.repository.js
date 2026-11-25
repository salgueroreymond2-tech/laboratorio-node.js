import { QueryTypes } from "sequelize";

export function loginAttemptsRepository(database) {
  return {
    async locked(scope) {
      const rows = await database.query(
        "SELECT locked_until > UTC_TIMESTAMP(3) AS locked FROM auth_attempts WHERE scope_key = $scope LIMIT 1",
        { bind: { scope }, type: QueryTypes.SELECT },
      );
      return Boolean(rows[0]?.locked);
    },
    async fail(scope) {
      await database.query(
        "INSERT INTO auth_attempts (scope_key, failed_count, locked_until) VALUES ($scope, 1, NULL) ON DUPLICATE KEY UPDATE failed_count = IF(locked_until IS NOT NULL AND locked_until <= UTC_TIMESTAMP(3), 1, failed_count + 1), locked_until = IF(failed_count >= 5, DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 15 MINUTE), NULL)",
        { bind: { scope } },
      );
    },
    async clear(scope) {
      await database.query(
        "DELETE FROM auth_attempts WHERE scope_key = $scope",
        { bind: { scope } },
      );
    },
  };
}
