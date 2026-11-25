import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { encrypt, decrypt, verifyEvent } from "../../src/lib/crypto.js";

test("crypto validates key length, format, IV and authentication tag", () => {
  const key = randomBytes(32);
  const encrypted = encrypt("synthetic", key, "synthetic-context");
  const [version, iv, tag, data] = encrypted.split(".");
  assert.equal(version, "v1");
  assert.equal(Buffer.from(iv, "base64url").length, 12);
  assert.equal(Buffer.from(tag, "base64url").length, 16);
  assert.throws(() => encrypt("x", randomBytes(31), "context"));
  assert.throws(() =>
    decrypt(`v2.${iv}.${tag}.${data}`, key, "synthetic-context"),
  );
  assert.throws(() =>
    decrypt(`v1.${iv}.bad.${data}`, key, "synthetic-context"),
  );
  assert.throws(() => decrypt(encrypted, randomBytes(32), "synthetic-context"));
  assert.equal(verifyEvent(["synthetic"], "invalid", key), false);
});
