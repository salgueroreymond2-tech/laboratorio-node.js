import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

// The caller supplies the key and the record-specific context. No key is stored here.
export function encrypt(plaintext, key, aad) {
  validateKey(key);
  if (typeof plaintext !== "string" || typeof aad !== "string" || !aad)
    throw new TypeError("Invalid encryption input");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decrypt(value, key, aad) {
  validateKey(key);
  if (typeof value !== "string" || typeof aad !== "string" || !aad)
    throw new TypeError("Invalid decryption input");
  const parts = value.split(".");
  if (
    parts.length !== 4 ||
    parts[0] !== "v1" ||
    !parts.slice(1).every((part) => /^[A-Za-z0-9_-]*$/.test(part))
  )
    throw new Error("Invalid ciphertext");
  const [iv, tag, ciphertext] = parts
    .slice(1)
    .map((part) => Buffer.from(part, "base64url"));
  if (
    iv.length !== 12 ||
    tag.length !== 16 ||
    parts[1] !== iv.toString("base64url") ||
    parts[2] !== tag.toString("base64url") ||
    parts[3] !== ciphertext.toString("base64url")
  )
    throw new Error("Invalid ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", key, iv, {
    authTagLength: 16,
  });
  decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

export function noteAAD(ownerId, noteId, field) {
  if (!ownerId || !noteId || !["title", "content"].includes(field))
    throw new TypeError("Invalid note context");
  return JSON.stringify(["notes", ownerId, noteId, field]);
}

export function hashToken(token) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function generateToken() {
  return randomBytes(32).toString("hex");
}

// Sign a fixed ordered array, not an object whose property order may vary.
export function signEvent(fields, key) {
  validateKey(key);
  if (!Array.isArray(fields))
    throw new TypeError("Event fields must be an array");
  return createHmac("sha256", key).update(JSON.stringify(fields)).digest("hex");
}

export function verifyEvent(fields, signature, key) {
  if (typeof signature !== "string" || !/^[a-f0-9]{64}$/.test(signature))
    return false;
  return timingSafeEqual(
    Buffer.from(signEvent(fields, key), "hex"),
    Buffer.from(signature, "hex"),
  );
}

function validateKey(key) {
  if (!Buffer.isBuffer(key) || key.length !== 32)
    throw new TypeError("Key must be 32 bytes");
}
