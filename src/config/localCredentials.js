import dotenv from "dotenv";

// The local credentials file must never override deployment variables.
export function applyLocalCredentials(env = process.env, path = ".env.app") {
  if (env.NODE_ENV === "production") return;

  const result = dotenv.config({ path, quiet: true, processEnv: {} });
  if (result.error?.code === "ENOENT") return;
  if (result.error) throw new Error("No se pudo leer la configuración local");

  const credentials = result.parsed;
  if (!credentials?.DB_USER || !credentials?.DB_PASSWORD)
    throw new Error("Faltan credenciales en la configuración local");

  for (const key of [
    "DB_USER",
    "DB_PASSWORD",
    "SESSION_SECRET",
    "CSRF_SECRET",
    "NOTES_ENCRYPTION_KEY",
    "AUDIT_HMAC_KEY",
    "MAIL_PROVIDER",
    "RESEND_API_KEY",
    "RESEND_FROM",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "SMTP_PASS",
    "SMTP_SECURE",
    "SMTP_FROM",
    "PUBLIC_BASE_URL",
  ]) {
    if (credentials[key]) env[key] = credentials[key];
  }
}
