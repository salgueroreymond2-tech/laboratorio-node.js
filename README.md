# SecureVault

SecureVault es un proyecto en desarrollo para almacenar notas privadas. Incluye registro, acceso, notas cifradas, perfil y administración en el entorno local. La recuperación de contraseña está implementada, pero requiere un proveedor SMTP real para enviar correos.

El mailer admite SMTP con TLS o STARTTLS y también Resend mediante HTTPS. Para Resend configura `MAIL_PROVIDER=resend`, `RESEND_API_KEY`, `RESEND_FROM` y `APP_URL`; requiere una cuenta y un remitente autorizado por el proveedor. Los planes Free, Trial y Hobby de Railway bloquean SMTP saliente. El envío real debe verificarse con una cuenta y un correo autorizado. Ver [preparación de producción](docs/DEPLOY_PRODUCCION.md).

**Producción:** configuración preparada parcialmente, sin servicio desplegado ni URL pública verificada. Consulta [la guía y los bloqueantes](docs/DEPLOY_PRODUCCION.md).

**Repositorio configurado:** https://github.com/salgueroreymond2-tech/laboratorio-node.js.git. La accesibilidad para el docente no se ha comprobado y varios archivos locales aún no están versionados. Los nombres de integrantes están pendientes de completar por el equipo.

## Iniciar localmente

1. Instala Node.js 22 y MySQL 8. Configura `.env` a partir de `.env.example` con los datos de tu servidor y la base `securevault_db`. Usa una cuenta con privilegios mínimos, `SESSION_SECRET` y `CSRF_SECRET` independientes y aleatorios (al menos 43 caracteres), y `NOTES_ENCRYPTION_KEY` y `AUDIT_HMAC_KEY` independientes de 32 bytes en hexadecimal. En este equipo, `.env.app` contiene las credenciales y secretos locales y tiene prioridad para el servidor. Los archivos `.env` están excluidos de Git. Conserva las llaves de forma segura: perder la de notas impide descifrarlas.
2. Ejecuta `npm ci` para instalar las dependencias.
3. Ejecuta `npm start` y visita `http://127.0.0.1:3001/inicio`; el estado técnico está en `http://127.0.0.1:3001/health`. Opcionalmente define `PORT` en `.env` si el puerto está ocupado.
4. Ejecuta `npm test`, `npm run test:security`, `npm run lint` y `npm run format:check` para comprobar el código. `npm test` solo ejecuta las pruebas unitarias; la integración requiere configuración adicional.

En desarrollo el servidor escucha solo en localhost. Abre `/registro` para crear una cuenta o `/acceso` para iniciar sesión; `/cuenta`, `/notas` y `/perfil` requieren sesión, y `/admin` exige rol administrador. `/health` devuelve 503 si MySQL no está disponible. No se aplican migraciones ni se crean tablas automáticamente. La configuración de producción exige TLS MySQL y un origen HTTPS, pero no se ha probado en una infraestructura real. Consulta [notas locales](docs/NOTAS_LOCALES.md).

## Migraciones y pruebas con MySQL

`npm run db:migrate` aplica migraciones usando las variables `MIGRATION_DB_*` de una cuenta independiente con permisos DDL. Si hay tablas sin historial, se detiene sin modificarlas. `npm run db:check-existing` compara una base existente con la base de pruebas migrada, sin escribir; solo si coinciden se puede registrar el historial con `node scripts/adopt-existing.js --adopt`. El proceso crea la tabla del historial pero no cambia las tablas existentes. MySQL confirma DDL de manera implícita: si falla, revisa el estado manualmente antes de reintentar.

Para una base **vacía y separada** llamada `securevault_test_db`, `npm run db:migrate -- --test` usa la misma cuenta de migraciones, y `npm run test:integration` usa las variables `TEST_DB_*`. Ambos requieren `NODE_ENV=test` y un host local (`127.0.0.1`, `localhost` o `::1`). Esta restricción no detecta túneles locales hacia servidores externos: verifica también que la instancia sea realmente aislada. Las pruebas no crean ni eliminan bases de datos. Configura los permisos de cada cuenta solo sobre su base correspondiente; la aplicación debe utilizar un usuario distinto con permisos DML mínimos. No uses una cuenta administradora como usuario de la aplicación.

Para crear un contenedor MySQL local nuevo con Compose, configura previamente `DB_ROOT_PASSWORD`, `DB_APP_PASSWORD`, `DB_MIGRATOR_PASSWORD` y `DB_TEST_PASSWORD` en `.env`, con valores distintos de al menos 24 caracteres ASCII alfanuméricos, guion o guion bajo. Las cuentas se crean solo al inicializar un volumen nuevo; cambiar variables no actualiza usuarios existentes ni rota contraseñas. Antes de iniciar, verifica que el puerto no esté ocupado y que el volumen sea el correcto. La inicialización Docker no se ha probado porque el daemon no estaba disponible en este entorno.

No hay que compartir el contenido de `.env`; si la contraseña contiene `#`, colócala entre comillas en el archivo.

Las contraseñas de usuarios se almacenan con bcrypt y costo 12. Bcrypt acepta hasta 72 bytes UTF-8; el código rechaza entradas mayores para evitar el truncamiento silencioso. Ese límite puede ser menor de 72 caracteres si hay caracteres multibyte y sustituye el máximo previo de 128 caracteres para esta implementación. El registro rechaza algunas contraseñas comunes mediante una lista pequeña, que aún debe ampliarse.

La comprobación `npm run check:release` falla deliberadamente mientras falten las funcionalidades y la verificación de producción. Consulta [la auditoría PR05](docs/PR05_AUDITORIA_SEGURIDAD.md) y el [índice de evidencias](docs/evidence/README.md).

## Material académico

- [Investigación de despliegue](docs/deep-research.md) e [informe de seguridad](docs/informe-seguridad.md).
- [Guion de demostración](docs/demo.md) y [preguntas de defensa](docs/PREGUNTAS_DEFENSA.md), ambos basados en el estado actual.
- [Checklist](docs/CHECKLIST_ENTREGA.md), [evaluación estimada](docs/EVALUACION_FINAL.md) y [estado final](docs/ESTADO_FINAL_PROYECTO.md).
- Existen cuentas sintéticas locales y un mecanismo de preparación idempotente; sus contraseñas no deben añadirse al repositorio ni enviarse por canales públicos. Las [capturas locales](docs/evidence/frontend/README.md) muestran solo la página pública.

La implementación y los pendientes del frontend están en [PR07_FRONTEND.md](docs/PR07_FRONTEND.md).

La investigación está disponible también en [PDF](docs/deep-research.pdf), generado localmente con dos páginas; falta la revisión visual final. Para exportarla manualmente, abre `docs/deep-research.md` en un visor de Markdown, utiliza **Imprimir → Guardar como PDF** y comprueba la paginación y los enlaces.
