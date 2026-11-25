import { randomUUID } from "node:crypto";
import { decrypt, encrypt } from "../lib/crypto.js";
import { hashPassword, verifyPassword } from "../lib/password.js";

export function profileService(repository, key) {
  if (!Buffer.isBuffer(key) || key.length !== 32)
    throw new Error("Clave de perfil inválida");
  const aad = (userId) => JSON.stringify(["user_profiles", userId, "phone"]);
  const phoneFor = (profile) => {
    if (!profile.encrypted_phone) return null;
    if (profile.key_version !== "v1")
      throw new Error("Versión de perfil desconocida");
    return decrypt(profile.encrypted_phone, key, aad(profile.id));
  };
  return {
    async get(userId, reveal = false) {
      const profile = await repository.find(userId);
      if (!profile) return null;
      const phone = phoneFor(profile);
      return {
        name: profile.name,
        email: profile.email,
        createdAt: profile.created_at,
        hasPhone: Boolean(phone),
        phone: phone
          ? reveal
            ? phone
            : `•••• ${phone.replace(/\D/g, "").slice(-4)}`
          : null,
      };
    },
    async save(userId, input) {
      const phoneAction = input.clearPhone
        ? "clear"
        : input.phone
          ? "set"
          : "keep";
      const encryptedPhone =
        phoneAction === "set" ? encrypt(input.phone, key, aad(userId)) : null;
      await repository.save({
        userId,
        name: input.name,
        profileId: randomUUID(),
        encryptedPhone,
        phoneAction,
      });
    },
    async changePassword(userId, currentPassword, newPassword) {
      const record = await repository.passwordRecord(userId);
      if (
        !record ||
        !(await verifyPassword(record.password_hash, currentPassword))
      )
        return null;
      const newHash = await hashPassword(newPassword);
      return repository.changePassword(userId, record.password_hash, newHash);
    },
  };
}
