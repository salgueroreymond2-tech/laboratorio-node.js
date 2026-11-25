# PR07 — Estado de implementación del frontend

> Actualización posterior: registro, inicio y cierre de sesión cuentan ahora con pantallas y backend local; ver [AUTH_LOCAL.md](AUTH_LOCAL.md). El resto del documento conserva la evaluación del PR07 anterior a esa implementación.

**Estado: parcial; no cumple aún los criterios de entrega del PR07.** Se implementó una página pública local y una página de error 404, con identidad visual SVG, EJS, estilos adaptables y estado real del servicio. Las pantallas funcionales obligatorias de autenticación, notas, perfil y administración siguen pendientes porque sus rutas y servicios no existen. No se han creado formularios de prueba que aparenten estar conectados.

No se presenta un porcentaje global de finalización: el pedido no define una ponderación verificable y una página pública no acredita las pantallas de negocio. La matriz concreta está en [FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md).

La revisión local aprobó 9 pruebas unitarias, 7 de seguridad y una de integración de solo lectura sobre el esquema de `securevault_test_db`, además de lint y formato. Edge confirmó la apertura y cierre con Escape del menú móvil, consultó el estado real y no registró errores de consola durante esa comprobación. Las capturas están en [evidence/frontend/](evidence/frontend/README.md): 320, 390 y 768 usan emulación móvil de Edge; 1440 usa ventana de escritorio. Los anchos de documento coincidieron con el viewport en las tres emulaciones. Esto no es una certificación integral de accesibilidad ni cubre las funciones aún no implementadas.

`npm audit --audit-level=high` informó cero vulnerabilidades altas o críticas y dos moderadas transitivas en Sequelize/uuid. `npm run check:release` continúa bloqueando deliberadamente la liberación por funcionalidades y verificaciones pendientes.

No hay producción verificada ni URL pública real. Faltan implementar la lógica de aplicación, controles de seguridad integrados, pruebas de flujos completos, revisión accesible, despliegue autorizado y comprobaciones externas antes de poder considerar el laboratorio terminado.
