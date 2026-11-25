import { randomUUID } from "node:crypto";
import { hashPassword, verifyPassword } from "../lib/password.js";

// A valid cost-12 hash ensures unknown accounts also perform a bcrypt comparison.
const dummyHash =
  "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYtT7ZK8i3MmP54u4x1wxxmM7Y6Z4m4a";

export function authService(repository) {
  return {
    async dummyCompare(password) {
      await verifyPassword(dummyHash, password);
    },
    async register({ name, email, password }) {
      const hash = await hashPassword(password);
      try {
        await repository.create({ id: randomUUID(), name, email, hash });
      } catch (error) {
        if (error.name !== "SequelizeUniqueConstraintError") throw error;
      }
    },
    async login({ email, password }) {
      const user = await repository.findByEmail(email);
      const valid = await verifyPassword(
        user?.password_hash || dummyHash,
        password,
      );
      return valid && user?.status === "active" ? user : null;
    },
  };
}
