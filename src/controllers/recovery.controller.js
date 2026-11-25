import {
  recoveryRequest,
  recoveryQuery,
  recoveryReset,
} from "../validators/recovery.validator.js";

export function recoveryController(service, csrfToken) {
  const initialize = (req, res) => {
    req.session.csrfReady = true;
    res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
    return csrfToken(req, res);
  };
  const requestView = (req, res, message = "", status = 200) =>
    res.status(status).render("auth/recovery", {
      available: Boolean(service),
      message,
      csrfToken: initialize(req, res),
    });
  const resetView = (req, res, token, message = "", status = 200) =>
    res.status(status).render("auth/reset", {
      token,
      message,
      csrfToken: initialize(req, res),
    });
  return {
    form: (req, res) => requestView(req, res),
    async request(req, res) {
      if (!service)
        return requestView(
          req,
          res,
          "La recuperación por correo todavía no está configurada.",
          503,
        );
      const parsed = recoveryRequest.safeParse(req.body);
      if (!parsed.success)
        return requestView(req, res, "Introduce un correo válido.", 400);
      await service.request(parsed.data.email);
      return requestView(
        req,
        res,
        "Si existe una cuenta activa para ese correo, recibirás instrucciones de recuperación.",
      );
    },
    resetForm(req, res) {
      const parsed = recoveryQuery.safeParse(req.query);
      if (!parsed.success || !service)
        return res
          .status(400)
          .send("Enlace de recuperación inválido o no disponible.");
      return resetView(req, res, parsed.data.token);
    },
    async reset(req, res) {
      if (!service) return res.status(503).send("Recuperación no disponible.");
      const parsed = recoveryReset.safeParse(req.body);
      if (!parsed.success) {
        const token =
          typeof req.body?.token === "string" &&
          /^[a-f0-9]{64}$/.test(req.body.token)
            ? req.body.token
            : "";
        return resetView(
          req,
          res,
          token,
          "Revisa la contraseña y su confirmación; debe tener al menos 12 caracteres y máximo 72 bytes.",
          400,
        );
      }
      if (!(await service.reset(parsed.data.token, parsed.data.password)))
        return resetView(
          req,
          res,
          "",
          "El enlace no es válido, ya se usó o ha caducado.",
          400,
        );
      res.set({
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      });
      return res.render("auth/reset-complete");
    },
  };
}
