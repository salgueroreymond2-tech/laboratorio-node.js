import { z } from "zod";

const email = z.string().trim().toLowerCase().email().max(254);
const password = z
  .string()
  .min(12)
  .refine((value) => Buffer.byteLength(value, "utf8") <= 72);
const common = new Set([
  "password1234",
  "password12345",
  "123456789012",
  "contraseña123",
  "contraseña1234",
  "qwerty123456",
]);

export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email,
    password: password.refine((value) => !common.has(value.toLowerCase())),
    _csrf: z.string(),
  })
  .strict();

export const loginSchema = z
  .object({
    email,
    password: z
      .string()
      .min(1)
      .refine((value) => Buffer.byteLength(value, "utf8") <= 72),
    _csrf: z.string(),
  })
  .strict();
