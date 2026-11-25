import { createServer } from "node:http";
import pino from "pino";
import dotenv from "dotenv";
import { loadConfig } from "./config/env.js";
import { createDatabase } from "./config/database.js";
import { createApp } from "./app.js";
import { configuredMailer } from "./config/mailer.js";
import { URL } from "node:url";

const logger = pino();
let database;
let server;
let shuttingDown = false;

async function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  const timer = setTimeout(() => process.exit(1), 10000);
  timer.unref();
  try {
    if (server?.listening)
      await new Promise((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
    if (database) await database.close();
    clearTimeout(timer);
    process.exitCode = code;
  } catch {
    logger.error("No se pudo cerrar el servicio limpiamente");
    process.exit(1);
  }
}

process.on("SIGINT", () => void shutdown(0));
process.on("SIGTERM", () => void shutdown(0));
process.on("unhandledRejection", () => {
  logger.fatal("Error asincrónico no controlado");
  void shutdown(1);
});
process.on("uncaughtException", () => {
  logger.fatal("Error no controlado");
  void shutdown(1);
});

try {
  // A locally provisioned low-privilege account overrides only database credentials.
  const appCredentials = dotenv.config({
    path: ".env.app",
    quiet: true,
  }).parsed;
  if (appCredentials) {
    process.env.DB_USER = appCredentials.DB_USER;
    process.env.DB_PASSWORD = appCredentials.DB_PASSWORD;
    if (appCredentials.SESSION_SECRET)
      process.env.SESSION_SECRET = appCredentials.SESSION_SECRET;
    if (appCredentials.CSRF_SECRET)
      process.env.CSRF_SECRET = appCredentials.CSRF_SECRET;
    if (appCredentials.NOTES_ENCRYPTION_KEY)
      process.env.NOTES_ENCRYPTION_KEY = appCredentials.NOTES_ENCRYPTION_KEY;
    if (appCredentials.AUDIT_HMAC_KEY)
      process.env.AUDIT_HMAC_KEY = appCredentials.AUDIT_HMAC_KEY;
    for (const key of [
      "MAIL_PROVIDER",
      "SMTP_HOST",
      "SMTP_PORT",
      "SMTP_USER",
      "SMTP_PASSWORD",
      "SMTP_PASS",
      "SMTP_SECURE",
      "SMTP_FROM",
      "PUBLIC_BASE_URL",
    ]) {
      if (appCredentials[key]) process.env[key] = appCredentials[key];
    }
  }
  const config = loadConfig();
  const recoveryConfig = configuredMailer();
  if (
    config.NODE_ENV === "production" &&
    recoveryConfig &&
    new URL(recoveryConfig.baseUrl).origin !== new URL(config.APP_URL).origin
  )
    throw new Error("El origen del correo no coincide con la aplicación");
  database = createDatabase(config);
  await database.authenticate();
  server = createServer(
    createApp({
      database,
      authConfig: {
        sessionSecret: config.SESSION_SECRET,
        csrfSecret: config.CSRF_SECRET,
      },
      notesKey: Buffer.from(config.NOTES_ENCRYPTION_KEY, "hex"),
      auditKey: Buffer.from(config.AUDIT_HMAC_KEY, "hex"),
      recoveryConfig,
      production: config.NODE_ENV === "production",
    }),
  );
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(
      config.PORT,
      config.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1",
      resolve,
    );
  });
  logger.info({ port: config.PORT }, "SecureVault iniciado");
} catch {
  logger.fatal(
    "No se pudo iniciar el servicio; revise la configuración y la conexión",
  );
  await shutdown(1);
}
