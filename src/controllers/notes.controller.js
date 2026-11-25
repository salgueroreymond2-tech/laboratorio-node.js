import {
  noteInput,
  deleteInput,
  noteParams,
  listQuery,
} from "../validators/notes.validator.js";
import { renderError } from "./public.controller.js";

export function notesController(service, csrfToken) {
  const token = (req, res) => csrfToken(req, res);
  const submitted = (body, id) => ({
    id,
    title: typeof body?.title === "string" ? body.title.slice(0, 120) : "",
    content:
      typeof body?.content === "string" ? body.content.slice(0, 4000) : "",
  });
  const invalidId = (req, res) => {
    if (!noteParams.safeParse(req.params).success) {
      renderError(res, 404);
      return true;
    }
    return false;
  };
  const form = (req, res, note, message = "", status = 200) =>
    res
      .status(status)
      .render("notes/form", { note, message, csrfToken: token(req, res) });
  return {
    async list(req, res) {
      const parsed = listQuery.safeParse(req.query);
      if (!parsed.success) return res.status(400).send("Solicitud inválida");
      const page = parsed.data.page;
      const { notes, hasNext } = await service.list(req.session.userId, page);
      return res.render("notes/index", { notes, page, hasNext });
    },
    newForm(req, res) {
      return form(req, res, null);
    },
    async create(req, res) {
      const parsed = noteInput.safeParse(req.body);
      if (!parsed.success)
        return form(
          req,
          res,
          submitted(req.body),
          "Escribe un título de hasta 120 caracteres y contenido de hasta 4000 caracteres.",
          400,
        );
      const id = await service.create(req.session.userId, parsed.data);
      return res.redirect(303, `/notas/${id}`);
    },
    async show(req, res) {
      if (invalidId(req, res)) return;
      const note = await service.find(req.session.userId, req.params.id);
      if (!note) return renderError(res, 404);
      return res.render("notes/show", { note, csrfToken: token(req, res) });
    },
    async editForm(req, res) {
      if (invalidId(req, res)) return;
      const note = await service.find(req.session.userId, req.params.id);
      if (!note) return renderError(res, 404);
      return form(req, res, note);
    },
    async update(req, res) {
      if (invalidId(req, res)) return;
      const parsed = noteInput.safeParse(req.body);
      if (!parsed.success) {
        const note = await service.find(req.session.userId, req.params.id);
        if (!note) return renderError(res, 404);
        return form(
          req,
          res,
          submitted(req.body, note.id),
          "Escribe un título de hasta 120 caracteres y contenido de hasta 4000 caracteres.",
          400,
        );
      }
      if (
        !(await service.update(req.session.userId, req.params.id, parsed.data))
      )
        return renderError(res, 404);
      return res.redirect(303, `/notas/${req.params.id}`);
    },
    async confirmRemove(req, res) {
      if (invalidId(req, res)) return;
      const note = await service.find(req.session.userId, req.params.id);
      if (!note) return renderError(res, 404);
      return res.render("notes/delete", { note, csrfToken: token(req, res) });
    },
    async remove(req, res) {
      if (invalidId(req, res)) return;
      if (!deleteInput.safeParse(req.body).success)
        return res.status(400).send("Solicitud inválida");
      if (!(await service.remove(req.session.userId, req.params.id)))
        return renderError(res, 404);
      return res.redirect(303, "/notas");
    },
  };
}
