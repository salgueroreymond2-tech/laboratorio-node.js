import { QueryTypes } from "sequelize";

export function recoveryRepository(database) {
  return {
    async activeUser(email) {
      const rows = await database.query(
        "SELECT id FROM users WHERE email = $email AND status = 'active' LIMIT 1",
        { bind: { email }, type: QueryTypes.SELECT },
      );
      return rows[0] || null;
    },
    async createToken(userId, id, tokenHash) {
      return database.transaction(async (transaction) => {
        const rows = await database.query(
          "SELECT id FROM users WHERE id = $userId AND status = 'active' FOR UPDATE",
          { bind: { userId }, type: QueryTypes.SELECT, transaction },
        );
        if (!rows.length) return false;
        await database.query(
          "UPDATE password_reset_tokens SET used_at = UTC_TIMESTAMP(3) WHERE user_id = $userId AND used_at IS NULL",
          { bind: { userId }, transaction },
        );
        await database.query(
          "INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES ($id, $userId, $tokenHash, DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 30 MINUTE))",
          { bind: { id, userId, tokenHash }, transaction },
        );
        return true;
      });
    },
    async consume(tokenHash, passwordHash) {
      return database.transaction(async (transaction) => {
        const rows = await database.query(
          "SELECT t.user_id FROM password_reset_tokens t INNER JOIN users u ON u.id = t.user_id WHERE t.token_hash = $tokenHash AND t.used_at IS NULL AND t.expires_at > UTC_TIMESTAMP(3) AND u.status = 'active' FOR UPDATE",
          { bind: { tokenHash }, type: QueryTypes.SELECT, transaction },
        );
        if (!rows.length) return false;
        const userId = rows[0].user_id;
        await database.query(
          "UPDATE users SET password_hash = $passwordHash, session_version = session_version + 1 WHERE id = $userId",
          { bind: { userId, passwordHash }, transaction },
        );
        await database.query(
          "UPDATE password_reset_tokens SET used_at = UTC_TIMESTAMP(3) WHERE user_id = $userId AND used_at IS NULL",
          { bind: { userId }, transaction },
        );
        return true;
      });
    },
  };
}
