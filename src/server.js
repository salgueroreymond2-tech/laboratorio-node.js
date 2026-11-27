import { createServer } from "node:http";
import pino from "pino";
import { ConfigurationError, loadConfig } from "./config/env.js";
import { createDatabase } from "./config/database.js";
import { applyLocalCredentials } from "./config/localCredentials.js";
import { createApp } from "./app.js";
import { configuredMailer } from "./config/mailer.js";
import { URL } from "node:url";

const logger = pino();
let database;
let server;
let shuttingDown = false;
let startupStage = "configuración";
const safeDatabaseCodes = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EHOSTUNREACH",
  "ER_ACCESS_DENIED_ERROR",
  "ER_BAD_DB_ERROR",
  "ER_SSL_CONNECTION_ERROR",
  "HANDSHAKE_NO_SSL_SUPPORT",
  "CERT_HAS_EXPIRED",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "ERR_TLS_CERT_ALTNAME_INVALID",
]);

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
  applyLocalCredentials();
  const config = loadConfig();
  startupStage = "correo";
  const recoveryConfig = configuredMailer();
  if (
    config.NODE_ENV === "production" &&
    recoveryConfig &&
    new URL(recoveryConfig.baseUrl).origin !== new URL(config.APP_URL).origin
  )
    throw new Error("El origen del correo no coincide con la aplicación");
  startupStage = "base de datos";
  database = createDatabase(config);
  await database.authenticate();
  startupStage = "aplicación";
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
  startupStage = "servidor";
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(
      config.PORT,
      config.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1",
      resolve,
    );
  });
  logger.info({ port: config.PORT }, "SecureVault iniciado");
} catch (error) {
  if (error instanceof ConfigurationError) {
    logger.fatal(
      { fields: error.fields },
      "Configuración inválida; revise las variables indicadas",
    );
  } else if (startupStage === "base de datos") {
    const code = error?.original?.code || error?.parent?.code || error?.code;
    logger.fatal(
      { code: safeDatabaseCodes.has(code) ? code : "NO_IDENTIFICADO" },
      "No se pudo conectar con MySQL",
    );
  } else if (startupStage === "servidor" && error?.code === "EADDRINUSE") {
    logger.fatal("No se pudo iniciar el servidor: el puerto está ocupado");
  } else {
    logger.fatal(
      { stage: startupStage },
      "No se pudo iniciar el servicio; revise la configuración de la etapa indicada",
    );
  }
  await shutdown(1);
}
