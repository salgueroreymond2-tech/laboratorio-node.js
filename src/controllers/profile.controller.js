import {
  profileInput,
  passwordInput,
} from "../validators/profile.validator.js";
import { renderError } from "./public.controller.js";

export function profileController(service, generateCsrfToken) {
  const showProfile = async (
    req,
    res,
    message = "",
    status = 200,
    reveal = false,
  ) => {
    const profile = await service.get(req.session.userId, reveal);
    if (!profile) return renderError(res, 404);
    return res.status(status).render("profile/index", {
      profile,
      message,
      reveal,
      csrfToken: generateCsrfToken(req, res),
    });
  };
  const showPassword = (req, res, message = "", status = 200) =>
    res.status(status).render("profile/password", {
      message,
      csrfToken: generateCsrfToken(req, res),
    });
  return {
    show: (req, res) => showProfile(req, res),
    reveal: (req, res) => showProfile(req, res, "", 200, true),
    async save(req, res) {
      const parsed = profileInput.safeParse(req.body);
      if (!parsed.success)
        return showProfile(
          req,
          res,
          "Revisa el nombre y el teléfono. No combines un teléfono nuevo con la opción de eliminar.",
          400,
        );
      await service.save(req.session.userId, parsed.data);
      return res.redirect(303, "/perfil");
    },
    passwordForm: (req, res) => showPassword(req, res),
    async changePassword(req, res, next) {
      const parsed = passwordInput.safeParse(req.body);
      if (!parsed.success)
        return showPassword(
          req,
          res,
          "Usa una contraseña nueva de al menos 12 caracteres y máximo 72 bytes, diferente a la actual, y confírmala.",
          400,
        );
      const userId = req.session.userId;
      const version = await service.changePassword(
        userId,
        parsed.data.currentPassword,
        parsed.data.newPassword,
      );
      if (!version)
        return showPassword(
          req,
          res,
          "No se pudo cambiar la contraseña. Comprueba la contraseña actual.",
          400,
        );
      return req.session.regenerate((error) => {
        if (error) return next(error);
        req.session.userId = userId;
        req.session.version = version;
        req.session.authenticatedAt = Date.now();
        return req.session.save((saveError) =>
          saveError ? next(saveError) : res.redirect(303, "/perfil"),
        );
      });
    },
  };
}
