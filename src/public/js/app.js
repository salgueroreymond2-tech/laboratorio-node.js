const statusText = document.querySelector("[data-status]");
const statusDot = document.querySelector("[data-status-dot]");
const statusTime = document.querySelector("[data-status-time]");
const refresh = document.querySelector("[data-refresh]");

async function refreshStatus() {
  if (!statusText || !statusDot || !statusTime || !refresh) return;
  refresh.disabled = true;
  statusText.textContent = "Comprobando conexión…";
  statusDot.dataset.state = "loading";
  try {
    const response = await fetch("/health", {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const result = await response.json();
    const available = response.ok && result.status === "ok";
    statusText.textContent = available
      ? "Servicio disponible"
      : "Servicio no disponible";
    statusDot.dataset.state = available ? "online" : "offline";
  } catch {
    statusText.textContent = "No se pudo comprobar";
    statusDot.dataset.state = "offline";
  } finally {
    statusTime.textContent = `Última comprobación: ${new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit" }).format(new Date())}`;
    refresh.disabled = false;
  }
}

if (refresh) {
  refresh.addEventListener("click", refreshStatus);
  refreshStatus();
}

const toggle = document.querySelector(".menu-toggle");
const sidebar = document.querySelector("#sidebar");
if (toggle && sidebar) {
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!open));
    toggle.setAttribute(
      "aria-label",
      open ? "Abrir navegación" : "Cerrar navegación",
    );
    sidebar.classList.toggle("is-open", !open);
  });
  sidebar.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      sidebar.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Abrir navegación");
    }
  });
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      toggle.getAttribute("aria-expanded") === "true"
    ) {
      sidebar.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Abrir navegación");
      toggle.focus();
    }
  });
}
