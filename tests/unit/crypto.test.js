import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  encrypt,
  decrypt,
  noteAAD,
  generateToken,
  hashToken,
  signEvent,
  verifyEvent,
} from "../../src/lib/crypto.js";

test("AES-GCM uses unique IVs and binds ciphertext to the record and field", () => {
  const key = randomBytes(32);
  const aad = noteAAD("owner", "note-1", "content");
  const first = encrypt("texto privado", key, aad);
  const second = encrypt("texto privado", key, aad);
  assert.notEqual(first.split(".")[1], second.split(".")[1]);
  assert.equal(decrypt(first, key, aad), "texto privado");
  assert.throws(() =>
    decrypt(first, key, noteAAD("owner", "note-2", "content")),
  );
  assert.throws(() => decrypt(first, key, noteAAD("owner", "note-1", "title")));
  const parts = first.split(".");
  const bytes = Buffer.from(parts[3], "base64url");
  bytes[0] ^= 1;
  parts[3] = bytes.toString("base64url");
  assert.throws(() => decrypt(parts.join("."), key, aad));
});

test("tokens are random and signatures detect modification", () => {
  const token = generateToken();
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.notEqual(token, generateToken());
  assert.match(hashToken(token), /^[a-f0-9]{64}$/);
  const key = randomBytes(32);
  const fields = ["LOGIN_FAILED", "warning", "request-id"];
  const signature = signEvent(fields, key);
  assert.equal(verifyEvent(fields, signature, key), true);
  assert.equal(
    verifyEvent(["LOGIN_SUCCESS", ...fields.slice(1)], signature, key),
    false,
  );
});
