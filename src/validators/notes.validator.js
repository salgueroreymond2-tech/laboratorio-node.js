import { z } from "zod";

export const noteParams = z.object({ id: z.string().uuid() }).strict();
export const noQuery = z.object({}).strict();
export const listQuery = z
  .object({
    page: z
      .string()
      .regex(/^[1-9]\d{0,3}$/)
      .transform(Number)
      .default(1),
  })
  .strict();
export const noteInput = z
  .object({
    title: z.string().trim().min(1).max(120),
    content: z
      .string()
      .min(1)
      .max(4000)
      .refine((value) => value.trim().length > 0),
    _csrf: z.string().min(1),
  })
  .strict();
export const deleteInput = z.object({ _csrf: z.string().min(1) }).strict();
