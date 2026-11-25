import { QueryTypes } from "sequelize";

export function adminRepository(database) {
  return {
    async summary() {
      const rows = await database.query(
        "SELECT COUNT(*) AS total, SUM(status = 'active') AS active FROM users",
        { type: QueryTypes.SELECT },
      );
      return {
        total: Number(rows[0].total),
        active: Number(rows[0].active || 0),
      };
    },
    users(offset) {
      return database.query(
        "SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC, id DESC LIMIT 51 OFFSET $offset",
        { bind: { offset }, type: QueryTypes.SELECT },
      );
    },
    async user(id) {
      const rows = await database.query(
        "SELECT id, name, email, role, status FROM users WHERE id = $id LIMIT 1",
        { bind: { id }, type: QueryTypes.SELECT },
      );
      return rows[0] || null;
    },
    async changeRole(actorId, targetId, role, oldHash, audit) {
      return database.transaction(async (transaction) => {
        const admins = await database.query(
          "SELECT id FROM users WHERE role = 'admin' AND status = 'active' FOR UPDATE",
          { type: QueryTypes.SELECT, transaction },
        );
        const rows = await database.query(
          "SELECT id, role, status, password_hash FROM users WHERE id IN ($actorId, $targetId) FOR UPDATE",
          { bind: { actorId, targetId }, type: QueryTypes.SELECT, transaction },
        );
        const actor = rows.find((row) => row.id === actorId),
          target = rows.find((row) => row.id === targetId);
        if (
          !actor ||
          actor.role !== "admin" ||
          actor.status !== "active" ||
          actor.password_hash !== oldHash
        )
          return "forbidden";
        if (!target) return "missing";
        if (actorId === targetId) return "self";
        if (target.role === role) return "unchanged";
        if (
          target.role === "admin" &&
          target.status === "active" &&
          role !== "admin" &&
          admins.length <= 1
        )
          return "last-admin";
        await database.query(
          "UPDATE users SET role = $role, session_version = session_version + 1 WHERE id = $targetId",
          { bind: { role, targetId }, transaction },
        );
        await audit.record(
          "admin_role_changed",
          "warning",
          actorId,
          { targetId, oldRole: target.role, newRole: role },
          transaction,
        );
        return "changed";
      });
    },
  };
}
