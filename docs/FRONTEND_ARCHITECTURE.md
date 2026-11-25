# Arquitectura del frontend — PR07

El frontend disponible incluye una página pública y formularios locales de registro, acceso y notas, servidos por Express y renderizados con EJS. Las cuentas tienen sesiones en MySQL y las notas se guardan cifradas. Ver [AUTH_LOCAL.md](AUTH_LOCAL.md) y [NOTAS_LOCALES.md](NOTAS_LOCALES.md).

- `src/app.js`: configura EJS, sirve `/assets` y mantiene los contratos JSON de `/` y `/health` para clientes de API.
- `src/controllers/public.controller.js`: renderiza la página pública y los errores HTML; las respuestas HTML no se almacenan en caché.
- `src/views/public/`, `src/views/errors/` y `src/views/partials/`: vista de inicio, error y piezas comunes de cabecera, navegación y pie.
- `src/public/css/`: tokens, distribución, componentes y estilos específicos de la página.
- `src/public/js/app.js`: menú adaptable y consulta al endpoint real `/health`.
- `src/public/images/brand/` y `src/public/fonts/`: identidad SVG y recursos tipográficos alojados localmente; las licencias están junto a las fuentes.

`/inicio` devuelve la página y `/` la ofrece cuando el navegador prefiere HTML. Los clientes que solicitan JSON conservan la respuesta anterior de `/`. Los errores 404/500 se presentan de acuerdo con el formato solicitado. Las vistas no consultan MySQL directamente: el estado proviene de `/health`, que devuelve 503 cuando la autenticación contra la base falla.

Helmet continúa configurando las cabeceras; JavaScript y estilos son archivos locales y no se usa JavaScript inline ni almacenamiento local de secretos. Las rutas mutadoras tienen protección CSRF; las notas además verifican su propietario. Los módulos de perfil y administración siguen pendientes.
