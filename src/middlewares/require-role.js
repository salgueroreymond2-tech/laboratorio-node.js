export function requireRole(role) {
  return (_req, res, next) =>
    res.locals.user?.role === role
      ? next()
      : res.status(403).send("Acceso no autorizado");
}
