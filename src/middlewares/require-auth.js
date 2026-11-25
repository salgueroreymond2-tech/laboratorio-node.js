export function requireAuth(repository) {
  return async (req, res, next) => {
    if (
      !req.session.userId ||
      !req.session.authenticatedAt ||
      Date.now() - req.session.authenticatedAt > 12 * 60 * 60 * 1000
    ) {
      return res.redirect(303, "/acceso");
    }
    try {
      const user = await repository.findById(req.session.userId);
      if (
        !user ||
        user.status !== "active" ||
        user.session_version !== req.session.version
      ) {
        return req.session.destroy(() => res.redirect(303, "/acceso"));
      }
      res.locals.user = user;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}
