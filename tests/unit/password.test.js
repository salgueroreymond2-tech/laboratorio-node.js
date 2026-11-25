import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../../src/lib/password.js";

test("passwords use bcrypt cost 12 and a unique salt", async () => {
  const hash = await hashPassword("Prueba-sintetica-123!");
  assert.match(hash, /^\$2[aby]\$12\$/);
  assert.equal(await verifyPassword(hash, "Prueba-sintetica-123!"), true);
  assert.equal(await verifyPassword(hash, "otra contraseña"), false);
  assert.notEqual(hash, await hashPassword("Prueba-sintetica-123!"));
});

test("bcrypt rejects passwords that exceed 72 UTF-8 bytes", () => {
  assert.throws(() => hashPassword("a".repeat(73)), /72 bytes/);
  assert.throws(() => hashPassword("á".repeat(37)), /72 bytes/);
  assert.throws(() => verifyPassword("invalid", "a".repeat(73)), /72 bytes/);
});
