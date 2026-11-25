import { z } from "zod";

export const roleInput = z
  .object({
    role: z.enum(["user", "admin"]),
    currentPassword: z
      .string()
      .min(1)
      .refine((value) => Buffer.byteLength(value, "utf8") <= 72),
    _csrf: z.string().min(1),
  })
  .strict();
