# Sistema visual — PR07

La interfaz usa un fondo gris claro, tarjetas blancas, azul `#2563eb` y navegación azul oscuro `#111827`. Los tokens, espaciados y radios se definen en `src/public/css/tokens.css`. Inter se usa para texto, Manrope para títulos y Material Symbols Outlined para iconos; todos se sirven desde el proyecto con sus licencias.

Los SVG originales incluyen isotipos, versiones para fondos claros y oscuros, horizontal, monocromática y favicon. Las piezas comunes son cabecera, navegación y pie EJS; las clases CSS ofrecen tarjetas, botones, indicadores y avisos.

La navegación se adapta a pantallas pequeñas, los botones muestran foco visible, el menú comunica su estado con `aria-expanded`, el estado del servicio utiliza `aria-live`, y se respeta `prefers-reduced-motion`. Estos controles no sustituyen una auditoría completa con tecnologías de asistencia. Las capturas reales y sus límites están en [evidence/frontend/](evidence/frontend/README.md).
