import { verifyPassword } from "../lib/password.js";

export function adminService(repository, profiles, audit) {
  return {
    async changeRole(actorId, targetId, role, password) {
      const actor = await profiles.passwordRecord(actorId);
      if (!actor || !(await verifyPassword(actor.password_hash, password)))
        return "forbidden";
      return repository.changeRole(
        actorId,
        targetId,
        role,
        actor.password_hash,
        audit,
      );
    },
  };
}
