import { z } from "zod";

const phone = z
  .string()
  .trim()
  .max(25)
  .refine(
    (value) =>
      !value ||
      (/^\+?[0-9 ()-]+$/.test(value) &&
        value.replace(/\D/g, "").length >= 7 &&
        value.replace(/\D/g, "").length <= 15),
  );
export const profileInput = z
  .object({
    name: z.string().trim().min(2).max(120),
    phone,
    clearPhone: z.literal("yes").optional(),
    _csrf: z.string().min(1),
  })
  .strict()
  .refine((value) => !(value.phone && value.clearPhone));

export const strongPassword = z
  .string()
  .min(12)
  .refine((value) => Buffer.byteLength(value, "utf8") <= 72)
  .refine(
    (value) =>
      !new Set([
        "password1234",
        "password12345",
        "123456789012",
        "contraseña123",
        "contraseña1234",
        "qwerty123456",
      ]).has(value.toLowerCase()),
  );
export const passwordInput = z
  .object({
    currentPassword: z
      .string()
      .min(1)
      .refine((value) => Buffer.byteLength(value, "utf8") <= 72),
    newPassword: strongPassword,
    confirmPassword: z.string().min(1),
    _csrf: z.string().min(1),
  })
  .strict()
  .refine(
    (value) =>
      value.newPassword === value.confirmPassword &&
      value.newPassword !== value.currentPassword,
  );
