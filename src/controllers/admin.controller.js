import { listQuery } from "../validators/notes.validator.js";
import { noteParams } from "../validators/notes.validator.js";
import { roleInput } from "../validators/admin.validator.js";
import { renderError } from "./public.controller.js";

export function adminController(repository, audit, service, csrfToken) {
  const page = (req) => listQuery.safeParse(req.query);
  return {
    async dashboard(_req, res) {
      const summary = await repository.summary();
      return res.render("admin/index", { summary });
    },
    async users(req, res) {
      const parsed = page(req);
      if (!parsed.success) return res.status(400).send("Solicitud inválida");
      const currentPage = parsed.data.page;
      const rows = await repository.users((currentPage - 1) * 50);
      return res.render("admin/users", {
        users: rows.slice(0, 50),
        page: currentPage,
        hasNext: rows.length > 50,
      });
    },
    async events(req, res) {
      const parsed = page(req);
      if (!parsed.success) return res.status(400).send("Solicitud inválida");
      const pageNumber = parsed.data.page;
      const result = await audit.list(pageNumber);
      return res.render("admin/events", { ...result, page: pageNumber });
    },
    async roleForm(req, res) {
      if (!noteParams.safeParse(req.params).success)
        return renderError(res, 404);
      const target = await repository.user(req.params.id);
      if (!target) return renderError(res, 404);
      return res.render("admin/role", {
        target,
        message: "",
        csrfToken: csrfToken(req, res),
      });
    },
    async changeRole(req, res) {
      if (!noteParams.safeParse(req.params).success)
        return renderError(res, 404);
      const input = roleInput.safeParse(req.body);
      const target = await repository.user(req.params.id);
      if (!target) return renderError(res, 404);
      if (!input.success)
        return res.status(400).render("admin/role", {
          target,
          message: "Revisa los datos y confirma tu contraseña.",
          csrfToken: csrfToken(req, res),
        });
      const result = await service.changeRole(
        req.session.userId,
        target.id,
        input.data.role,
        input.data.currentPassword,
      );
      if (result === "changed" || result === "unchanged")
        return res.redirect(303, "/admin/usuarios");
      if (result === "missing") return renderError(res, 404);
      const message =
        result === "self"
          ? "No puedes cambiar tu propio rol desde esta pantalla."
          : result === "last-admin"
            ? "Debe permanecer al menos una cuenta administradora activa."
            : "No se pudo actualizar el rol. Comprueba tu contraseña.";
      return res.status(400).render("admin/role", {
        target,
        message,
        csrfToken: csrfToken(req, res),
      });
    },
  };
}
