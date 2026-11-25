export function prefersHtml(req) {
  const accept = req.get("accept") || "";
  return (
    /(?:^|,)\s*text\/html(?:\s*;|\s*,|\s*$)/i.test(accept) &&
    req.accepts(["html", "json"]) === "html"
  );
}

export function renderHome(_req, res) {
  res.set("Cache-Control", "no-store");
  return res.render("public/home", { year: new Date().getFullYear() });
}

export function renderError(res, status) {
  res.set("Cache-Control", "no-store");
  return res
    .status(status)
    .render("errors/error", { status, year: new Date().getFullYear() });
}
