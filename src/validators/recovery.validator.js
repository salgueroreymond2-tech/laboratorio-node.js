import { z } from "zod";
import { strongPassword } from "./profile.validator.js";

export const recoveryRequest = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    _csrf: z.string().min(1),
  })
  .strict();
export const recoveryQuery = z
  .object({ token: z.string().regex(/^[a-f0-9]{64}$/) })
  .strict();
export const recoveryReset = z
  .object({
    token: z.string().regex(/^[a-f0-9]{64}$/),
    password: strongPassword,
    confirmPassword: z.string().min(1),
    _csrf: z.string().min(1),
  })
  .strict()
  .refine((value) => value.password === value.confirmPassword);
