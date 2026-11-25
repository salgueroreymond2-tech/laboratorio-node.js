import "dotenv/config";
import { z } from "zod";
import { URL } from "node:url";

const schema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    DB_HOST: z.string().trim().min(1),
    DB_PORT: z.coerce.number().int().min(1).max(65535),
    DB_NAME: z.literal("securevault_db"),
    DB_USER: z
      .string()
      .trim()
      .min(1)
      .refine((user) => user.toLowerCase() !== "root"),
    DB_PASSWORD: z.string().min(1),
    SESSION_SECRET: z.string().min(43),
    CSRF_SECRET: z.string().min(43),
    NOTES_ENCRYPTION_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/),
    AUDIT_HMAC_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/),
    DB_TLS_CA: z.string().optional(),
    APP_URL: z.string().optional(),
  })
  .superRefine((value, context) => {
    if (value.SESSION_SECRET === value.CSRF_SECRET)
      context.addIssue({
        code: "custom",
        path: ["CSRF_SECRET"],
        message: "Los secretos deben ser independientes",
      });
    if (
      value.NOTES_ENCRYPTION_KEY.toLowerCase() ===
      value.AUDIT_HMAC_KEY.toLowerCase()
    )
      context.addIssue({
        code: "custom",
        path: ["AUDIT_HMAC_KEY"],
        message: "Las llaves deben ser independientes",
      });
    if (value.NODE_ENV !== "production") return;
    if (/^(localhost|127\.|::1$|\[::1\]$|0\.0\.0\.0$)/i.test(value.DB_HOST))
      context.addIssue({
        code: "custom",
        path: ["DB_HOST"],
        message: "Se requiere una base remota",
      });
    if (
      !value.DB_TLS_CA?.includes("-----BEGIN CERTIFICATE-----") ||
      !value.DB_TLS_CA?.includes("-----END CERTIFICATE-----")
    )
      context.addIssue({
        code: "custom",
        path: ["DB_TLS_CA"],
        message: "Se requiere un certificado de CA",
      });
    try {
      const url = new URL(value.APP_URL);
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        url.pathname !== "/" ||
        url.search ||
        url.hash
      )
        throw new Error("URL inválida");
    } catch {
      context.addIssue({
        code: "custom",
        path: ["APP_URL"],
        message: "Se requiere un origen HTTPS",
      });
    }
  });

export function loadConfig(env = process.env) {
  const result = schema.safeParse(env);
  if (!result.success) {
    // Configuration values can contain secrets; report field names only.
    const fields = [
      ...new Set(result.error.issues.map((issue) => issue.path[0])),
    ];
    throw new Error(`Configuración inválida: ${fields.join(", ")}`);
  }
  return result.data;
}
