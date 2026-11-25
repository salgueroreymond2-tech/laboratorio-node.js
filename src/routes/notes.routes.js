import { Router } from "express";
import { authRepository } from "../repositories/auth.repository.js";
import { notesRepository } from "../repositories/notes.repository.js";
import { notesService } from "../services/notes.service.js";
import { notesController } from "../controllers/notes.controller.js";
import { requireAuth } from "../middlewares/require-auth.js";
import { noQuery } from "../validators/notes.validator.js";

export function notesRoutes(database, key, csrfToken) {
  const router = Router();
  const controller = notesController(
    notesService(notesRepository(database), key),
    csrfToken,
  );
  router.use(requireAuth(authRepository(database)));
  router.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    return next();
  });
  router.get("/", controller.list);
  router.use((req, res, next) =>
    noQuery.safeParse(req.query).success
      ? next()
      : res.status(400).send("Solicitud inválida"),
  );
  router.get("/nueva", controller.newForm);
  router.post("/", controller.create);
  router.get("/:id", controller.show);
  router.get("/:id/editar", controller.editForm);
  router.post("/:id/editar", controller.update);
  router.get("/:id/eliminar", controller.confirmRemove);
  router.post("/:id/eliminar", controller.remove);
  return router;
}
