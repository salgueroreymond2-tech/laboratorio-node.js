import { createHmac } from "node:crypto";

export function loginAttemptsService(repository, key) {
  if (!Buffer.isBuffer(key) || key.length !== 32)
    throw new Error("Clave de intentos inválida");
  const scope = (email) =>
    createHmac("sha256", key).update(`login:${email}`, "utf8").digest("hex");
  return {
    locked: (email) => repository.locked(scope(email)),
    fail: (email) => repository.fail(scope(email)),
    clear: (email) => repository.clear(scope(email)),
  };
}
