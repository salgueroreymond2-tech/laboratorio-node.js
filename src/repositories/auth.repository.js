import { QueryTypes } from "sequelize";

export function authRepository(database) {
  return {
    async findByEmail(email) {
      const rows = await database.query(
        "SELECT id, name, email, password_hash, role, status, session_version FROM users WHERE email = $email LIMIT 1",
        { bind: { email }, type: QueryTypes.SELECT },
      );
      return rows[0] || null;
    },
    async findById(id) {
      const rows = await database.query(
        "SELECT id, name, role, status, session_version FROM users WHERE id = $id LIMIT 1",
        { bind: { id }, type: QueryTypes.SELECT },
      );
      return rows[0] || null;
    },
    async create(user) {
      await database.query(
        "INSERT INTO users (id, name, email, password_hash, role) VALUES ($id, $name, $email, $hash, 'user')",
        { bind: user },
      );
    },
  };
}
