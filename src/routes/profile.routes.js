import { Router } from "express";
import { requireAuth } from "../middlewares/require-auth.js";
import { authRepository } from "../repositories/auth.repository.js";
import { profileRepository } from "../repositories/profile.repository.js";
import { profileService } from "../services/profile.service.js";
import { profileController } from "../controllers/profile.controller.js";
import { noQuery } from "../validators/notes.validator.js";

export function profileRoutes(database, key, csrfToken) {
  const router = Router();
  const controller = profileController(
    profileService(profileRepository(database), key),
    csrfToken,
  );
  router.use(requireAuth(authRepository(database)));
  router.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    return noQuery.safeParse(req.query).success
      ? next()
      : res.status(400).send("Solicitud inválida");
  });
  router.get("/", controller.show);
  router.post("/", controller.save);
  router.get("/telefono", controller.reveal);
  router.get("/contrasena", controller.passwordForm);
  router.post("/contrasena", controller.changePassword);
  return router;
}
