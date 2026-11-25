import { Router } from "express";
import { requireAuth } from "../middlewares/require-auth.js";
import { requireRole } from "../middlewares/require-role.js";
import { authRepository } from "../repositories/auth.repository.js";
import { adminRepository } from "../repositories/admin.repository.js";
import { adminController } from "../controllers/admin.controller.js";
import { noQuery } from "../validators/notes.validator.js";
import { profileRepository } from "../repositories/profile.repository.js";
import { adminService } from "../services/admin.service.js";

export function adminRoutes(database, audit, csrfToken) {
  const router = Router();
  const repository = adminRepository(database);
  const controller = adminController(
    repository,
    audit,
    adminService(repository, profileRepository(database), audit),
    csrfToken,
  );
  router.use(requireAuth(authRepository(database)), requireRole("admin"));
  router.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  router.get(
    "/",
    (req, res, next) =>
      noQuery.safeParse(req.query).success
        ? next()
        : res.status(400).send("Solicitud inválida"),
    controller.dashboard,
  );
  router.get("/usuarios", controller.users);
  router.get("/eventos", controller.events);
  router.get(
    "/usuarios/:id/rol",
    (req, res, next) =>
      noQuery.safeParse(req.query).success
        ? next()
        : res.status(400).send("Solicitud inválida"),
    controller.roleForm,
  );
  router.post(
    "/usuarios/:id/rol",
    (req, res, next) =>
      noQuery.safeParse(req.query).success
        ? next()
        : res.status(400).send("Solicitud inválida"),
    controller.changeRole,
  );
  return router;
}
