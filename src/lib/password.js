import bcrypt from "bcrypt";

export function hashPassword(password) {
  validatePassword(password);
  return bcrypt.hash(password, 12);
}

export function verifyPassword(hash, password) {
  validatePassword(password);
  return bcrypt.compare(password, hash);
}

function validatePassword(password) {
  // bcrypt silently truncates beyond 72 bytes; refuse such passwords instead.
  if (
    typeof password !== "string" ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    throw new TypeError("La contraseña debe ocupar como máximo 72 bytes UTF-8");
  }
}
