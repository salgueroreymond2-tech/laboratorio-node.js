import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { authRepository } from "../repositories/auth.repository.js";
import { authService } from "../services/auth.service.js";
import { loginSchema, registerSchema } from "../validators/auth.validator.js";
import { requireAuth } from "../middlewares/require-auth.js";

export function authRoutes(
  database,
  generateCsrfToken,
  audit,
  attempts,
  production = false,
) {
  const router = Router();
  const repository = authRepository(database);
  const service = authService(repository);
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: "Demasiados intentos. Inténtalo más tarde.",
  });
  const show = (res, req, view, message = "", status = 200) => {
    req.session.csrfReady = true;
    res.set("Cache-Control", "no-store");
    return res.status(status).render(`auth/${view}`, {
      csrfToken: generateCsrfToken(req, res),
      message,
    });
  };

  router.get("/registro", (req, res) => show(res, req, "register"));
  router.post("/registro", limiter, async (req, res, next) => {
    const input = registerSchema.safeParse(req.body);
    if (!input.success)
      return show(
        res,
        req,
        "register",
        "Revisa los datos. Usa una contraseña de al menos 12 caracteres y máximo 72 bytes, que no sea común.",
        400,
      );
    try {
      await service.register(input.data);
      return show(
        res,
        req,
        "register",
        "Si los datos son válidos, puedes intentar iniciar sesión.",
      );
    } catch (error) {
      return next(error);
    }
  });

  router.get("/acceso", (req, res) => show(res, req, "login"));
  router.post("/acceso", limiter, async (req, res, next) => {
    const input = loginSchema.safeParse(req.body);
    if (!input.success)
      return show(res, req, "login", "Correo o contraseña incorrectos.", 401);
    try {
      if (attempts && (await attempts.locked(input.data.email))) {
        await service.dummyCompare(input.data.password);
        if (audit) await audit.record("auth_login_failed", "warning");
        return show(res, req, "login", "Correo o contraseña incorrectos.", 401);
      }
      const user = await service.login(input.data);
      if (!user) {
        if (attempts) await attempts.fail(input.data.email);
        if (audit) await audit.record("auth_login_failed", "warning");
        return show(res, req, "login", "Correo o contraseña incorrectos.", 401);
      }
      if (attempts) await attempts.clear(input.data.email);
      if (audit) await audit.record("auth_login_success", "info", user.id);
      return req.session.regenerate((error) => {
        if (error) return next(error);
        req.session.userId = user.id;
        req.session.version = user.session_version;
        req.session.authenticatedAt = Date.now();
        return req.session.save((saveError) =>
          saveError ? next(saveError) : res.redirect(303, "/cuenta"),
        );
      });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/cuenta", requireAuth(repository), (req, res) => {
    res.set("Cache-Control", "no-store");
    return res.render("auth/account", {
      user: res.locals.user,
      csrfToken: generateCsrfToken(req, res),
    });
  });
  router.post("/salir", (req, res, next) =>
    req.session.destroy((error) => {
      if (error) return next(error);
      res.clearCookie("sv.sid", {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: production,
      });
      res.clearCookie("sv.csrf", {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: production,
      });
      return res.redirect(303, "/acceso");
    }),
  );
  return router;
}
