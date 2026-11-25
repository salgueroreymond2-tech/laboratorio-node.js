import { randomUUID } from "node:crypto";
import { URL } from "node:url";
import { generateToken, hashToken } from "../lib/crypto.js";
import { hashPassword } from "../lib/password.js";

export function recoveryService(repository, mailer, baseUrl, audit) {
  return {
    async request(email) {
      const user = await repository.activeUser(email);
      if (!user) return;
      const token = generateToken();
      if (
        !(await repository.createToken(user.id, randomUUID(), hashToken(token)))
      )
        return;
      const url = new URL("/restablecer", baseUrl);
      url.searchParams.set("token", token);
      try {
        await mailer.sendRecovery(email, url.toString());
      } catch {
        if (audit) await audit.record("recovery_delivery_failed", "warning");
      }
    },
    async reset(token, password) {
      const hash = await hashPassword(password);
      return repository.consume(hashToken(token), hash);
    },
  };
}
