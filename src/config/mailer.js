import nodemailer from "nodemailer";
import { z } from "zod";
import { URL } from "node:url";

export function configuredMailer(
  env = process.env,
  createTransport = nodemailer.createTransport,
) {
  const smtpKeys = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "SMTP_PASS",
    "SMTP_FROM",
    "PUBLIC_BASE_URL",
    "SMTP_SECURE",
  ];
  const provider =
    env.MAIL_PROVIDER || (smtpKeys.every((key) => !env[key]) ? "none" : "smtp");
  if (provider === "none" && smtpKeys.every((key) => !env[key])) return null;
  if (provider !== "smtp")
    throw new Error(
      "Proveedor de correo no disponible o configuración contradictoria",
    );
  if (env.SMTP_PASSWORD && env.SMTP_PASS && env.SMTP_PASSWORD !== env.SMTP_PASS)
    throw new Error("Contraseñas SMTP incompatibles");
  const schema = z.object({
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535),
    SMTP_USER: z.string().min(1),
    SMTP_PASSWORD: z.string().min(1),
    SMTP_FROM: z.string().email(),
    SMTP_SECURE: z.enum(["true", "false"]).optional(),
    PUBLIC_BASE_URL: z
      .string()
      .url()
      .refine((value) => {
        const url = new URL(value);
        return (
          url.protocol === "https:" ||
          (url.protocol === "http:" &&
            ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname))
        );
      }),
  });
  const result = schema.safeParse({
    ...env,
    SMTP_PASSWORD: env.SMTP_PASSWORD || env.SMTP_PASS,
    PUBLIC_BASE_URL: env.PUBLIC_BASE_URL || env.APP_URL,
  });
  if (!result.success)
    throw new Error("Configuración SMTP incompleta o inválida");
  const config = result.data;
  const secure =
    config.SMTP_SECURE === undefined
      ? config.SMTP_PORT === 465
      : config.SMTP_SECURE === "true";
  const transport = createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure,
    requireTLS: !secure,
    auth: { user: config.SMTP_USER, pass: config.SMTP_PASSWORD },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
  return {
    baseUrl: config.PUBLIC_BASE_URL,
    mailer: {
      sendRecovery: (to, url) =>
        transport.sendMail({
          from: config.SMTP_FROM,
          to,
          subject: "Recuperación de contraseña de SecureVault",
          text: `Abre este enlace para cambiar tu contraseña. Caduca en 30 minutos y solo puede usarse una vez:\n\n${url}\n\nSi no solicitaste este cambio, ignora este mensaje.`,
        }),
    },
  };
}
