import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { recoveryRepository } from "../repositories/recovery.repository.js";
import { recoveryService } from "../services/recovery.service.js";
import { recoveryController } from "../controllers/recovery.controller.js";
import { noQuery } from "../validators/notes.validator.js";

export function recoveryRoutes(database, config, csrfToken, audit) {
  const router = Router();
  const controller = recoveryController(
    config
      ? recoveryService(
          recoveryRepository(database),
          config.mailer,
          config.baseUrl,
          audit,
        )
      : null,
    csrfToken,
  );
  router.use((_req, res, next) => {
    res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
    next();
  });
  const limit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: "Demasiados intentos. Inténtalo más tarde.",
  });
  const emptyQuery = (req, res, next) =>
    noQuery.safeParse(req.query).success
      ? next()
      : res.status(400).send("Solicitud inválida");
  router.get("/recuperar", emptyQuery, controller.form);
  router.post("/recuperar", emptyQuery, limit, controller.request);
  router.get("/restablecer", controller.resetForm);
  router.post("/restablecer", emptyQuery, limit, controller.reset);
  return router;
}
