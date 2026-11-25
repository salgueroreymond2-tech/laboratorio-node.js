import express from "express";
import helmet from "helmet";
import session from "express-session";
import cookieParser from "cookie-parser";
import { doubleCsrf } from "csrf-csrf";
import { fileURLToPath, URL } from "node:url";
import { MysqlSessionStore } from "./config/session-store.js";
import { authRoutes } from "./routes/auth.routes.js";
import { notesRoutes } from "./routes/notes.routes.js";
import { profileRoutes } from "./routes/profile.routes.js";
import { adminRoutes } from "./routes/admin.routes.js";
import { auditRepository } from "./repositories/audit.repository.js";
import { auditService } from "./services/audit.service.js";
import { loginAttemptsRepository } from "./repositories/login-attempts.repository.js";
import { loginAttemptsService } from "./services/login-attempts.service.js";
import { recoveryRoutes } from "./routes/recovery.routes.js";
import {
  renderHome,
  renderError,
  prefersHtml,
} from "./controllers/public.controller.js";

export function createApp({
  database,
  authConfig,
  notesKey,
  auditKey,
  recoveryConfig,
  production = false,
}) {
  const app = express();
  if (production && (!authConfig || !notesKey || !auditKey))
    throw new Error("Faltan controles de seguridad de producción");
  if (production) app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(express.json({ limit: "16kb" }));
  app.use(
    express.urlencoded({ extended: false, limit: "64kb", parameterLimit: 10 }),
  );
  app.set("view engine", "ejs");
  app.set("views", fileURLToPath(new URL("./views", import.meta.url)));
  app.use(
    "/assets",
    express.static(fileURLToPath(new URL("./public", import.meta.url)), {
      maxAge: "1h",
      index: false,
    }),
  );

  if (authConfig) {
    if (!authConfig.sessionSecret || !authConfig.csrfSecret)
      throw new Error("Faltan secretos de autenticación");
    app.use(
      session({
        name: "sv.sid",
        secret: authConfig.sessionSecret,
        store: new MysqlSessionStore(database),
        resave: false,
        saveUninitialized: false,
        rolling: true,
        cookie: {
          httpOnly: true,
          sameSite: "lax",
          secure: production,
          maxAge: 30 * 60 * 1000,
        },
      }),
    );
    app.use(cookieParser());
    const csrf = doubleCsrf({
      getSecret: () => authConfig.csrfSecret,
      getSessionIdentifier: (req) => req.sessionID,
      cookieName: "sv.csrf",
      cookieOptions: {
        httpOnly: true,
        sameSite: "lax",
        secure: production,
        path: "/",
      },
      getCsrfTokenFromRequest: (req) => req.body?._csrf,
    });
    app.use(csrf.doubleCsrfProtection);
    const audit = auditKey
      ? auditService(auditRepository(database), auditKey)
      : null;
    const attempts = auditKey
      ? loginAttemptsService(loginAttemptsRepository(database), auditKey)
      : null;
    app.use(
      authRoutes(database, csrf.generateCsrfToken, audit, attempts, production),
    );
    app.use(
      recoveryRoutes(database, recoveryConfig, csrf.generateCsrfToken, audit),
    );
    if (audit)
      app.use("/admin", adminRoutes(database, audit, csrf.generateCsrfToken));
    if (notesKey)
      app.use(
        "/notas",
        notesRoutes(database, notesKey, csrf.generateCsrfToken),
      );
    if (notesKey)
      app.use(
        "/perfil",
        profileRoutes(database, notesKey, csrf.generateCsrfToken),
      );
  }

  app.get("/inicio", renderHome);

  app.get("/", (req, res) => {
    if (prefersHtml(req)) return renderHome(req, res);
    res.json({ message: "SecureVault está en desarrollo." });
  });

  app.get("/health", async (_req, res) => {
    res.set("Cache-Control", "no-store");
    try {
      await database.authenticate();
      res.status(200).json({ status: "ok" });
    } catch {
      res.status(503).json({ status: "unavailable" });
    }
  });

  app.use((req, res) => {
    if (prefersHtml(req)) return renderError(res, 404);
    return res.status(404).json({ error: "No encontrado" });
  });
  app.use((error, req, res, _next) => {
    if (error?.code === "EBADCSRFTOKEN")
      return res
        .status(403)
        .send("Solicitud rechazada. Actualiza la página e inténtalo de nuevo.");
    if (error?.type === "entity.parse.failed")
      return res.status(400).json({ error: "Solicitud inválida" });
    if (error?.type === "entity.too.large")
      return res.status(413).json({ error: "Solicitud demasiado grande" });
    if (prefersHtml(req)) return renderError(res, 500);
    return res.status(500).json({ error: "Error interno" });
  });
  return app;
}
