import { QueryTypes } from "sequelize";

export function profileRepository(database) {
  return {
    async find(userId) {
      const rows = await database.query(
        "SELECT u.id, u.name, u.email, u.created_at, p.encrypted_phone, p.key_version FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id WHERE u.id = $userId AND u.status = 'active' LIMIT 1",
        { bind: { userId }, type: QueryTypes.SELECT },
      );
      return rows[0] || null;
    },
    async save({ userId, name, profileId, encryptedPhone, phoneAction }) {
      return database.transaction(async (transaction) => {
        await database.query(
          "UPDATE users SET name = $name WHERE id = $userId AND status = 'active'",
          {
            bind: { userId, name },
            transaction,
          },
        );
        if (phoneAction === "set") {
          await database.query(
            "INSERT INTO user_profiles (id, user_id, encrypted_phone, key_version) VALUES ($profileId, $userId, $encryptedPhone, 'v1') ON DUPLICATE KEY UPDATE encrypted_phone = VALUES(encrypted_phone), key_version = VALUES(key_version)",
            {
              bind: { profileId, userId, encryptedPhone },
              transaction,
            },
          );
        } else if (phoneAction === "clear") {
          await database.query(
            "UPDATE user_profiles SET encrypted_phone = NULL, key_version = NULL WHERE user_id = $userId",
            {
              bind: { userId },
              transaction,
            },
          );
        }
      });
    },
    async passwordRecord(userId) {
      const rows = await database.query(
        "SELECT id, password_hash FROM users WHERE id = $userId AND status = 'active' LIMIT 1",
        { bind: { userId }, type: QueryTypes.SELECT },
      );
      return rows[0] || null;
    },
    async changePassword(userId, oldHash, newHash) {
      return database.transaction(async (transaction) => {
        const [, result] = await database.query(
          "UPDATE users SET password_hash = $newHash, session_version = session_version + 1 WHERE id = $userId AND password_hash = $oldHash AND status = 'active'",
          { bind: { userId, oldHash, newHash }, transaction },
        );
        if (!result.affectedRows) return null;
        const rows = await database.query(
          "SELECT session_version FROM users WHERE id = $userId",
          { bind: { userId }, type: QueryTypes.SELECT, transaction },
        );
        return rows[0].session_version;
      });
    },
  };
}
