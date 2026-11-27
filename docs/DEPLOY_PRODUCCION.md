# Preparación de producción — SecureVault

**Estado: bloqueado; no existe un despliegue ni una URL pública verificados.** Se prepararon el arranque de producción, cookies seguras, validación de configuración, MySQL con TLS y un Dockerfile no root. Las pruebas locales incluyen un proxy simulado; no hay prueba de infraestructura real. Docker no pudo construirse porque el daemon no estaba disponible, y las migraciones de producción no se han ejecutado.

**Diagnóstico de GitHub:** la última revisión identificó que el despliegue registrado corresponde al commit `4f89580` de `main`, cuyo árbol contiene documentación pero no incluye `package.json`, `Dockerfile` ni `src/server.js`. El código está en el PR #1, commit `368c26c`. La publicación de `main` podría activar el despliegue automático; no se ha fusionado ni desplegado este PR. El control `check:release` continúa fallando deliberadamente mientras falten verificaciones reales.

El arranque informa nombres de variables inválidas y códigos de conexión MySQL de una lista controlada, sin registrar contraseñas, llaves ni valores de las variables. Esto facilita que una persona responsable identifique la etapa que falla una vez que la versión correcta esté disponible en el entorno autorizado.

Se detectó Railway CLI 5.75.0; la identidad, el proyecto, sus servicios y la vinculación con GitHub no se han verificado. La publicación y cualquier modificación de infraestructura requieren autorización explícita y deben quedar a cargo de una persona responsable y habilitada para el servicio. La documentación oficial indica que los [términos de Railway](https://railway.com/legal/terms) contienen requisitos de edad y consentimiento.

## Configuración necesaria para revisión

| Variable | Servicio / origen | Obligatoria | Finalidad |
| --- | --- | --- | --- |
| `NODE_ENV`, `PORT` | Aplicación; puerto asignado por la plataforma | Sí | Modo de producción y puerto de escucha. |
| `APP_URL` | Aplicación; origen HTTPS público verificado | Sí | Identificar el origen de la aplicación y validar enlaces de recuperación. |
| `DB_HOST`, `DB_PORT`, `DB_NAME` | Aplicación; conexión privada al MySQL autorizado | Sí | Conexión a `securevault_db`. La aplicación rechaza localhost en producción. |
| `DB_USER`, `DB_PASSWORD` | Aplicación; cuenta MySQL independiente con permisos DML mínimos | Sí | Acceso sin privilegios administrativos ni DDL. |
| `DB_TLS_CA` | Aplicación; certificado CA del servidor MySQL | Sí | MySQL TLS con validación de certificado y `rejectUnauthorized: true`. |
| `SESSION_SECRET`, `CSRF_SECRET` | Secretos independientes de la aplicación | Sí | Firmar sesiones y proteger formularios CSRF. |
| `NOTES_ENCRYPTION_KEY`, `AUDIT_HMAC_KEY` | Llaves independientes de 32 bytes en hexadecimal | Sí | Cifrado de notas y teléfono; firma de eventos. No regenerar llaves utilizadas ni compartirlas. |
| `MAIL_PROVIDER`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` o `SMTP_PASS`, `SMTP_FROM`, `PUBLIC_BASE_URL` | Correo; `MAIL_PROVIDER=smtp` habilita SMTP, `SMTP_SECURE` es opcional | Solo para recuperación | Credenciales SMTP con TLS implícito o STARTTLS; `PUBLIC_BASE_URL` puede omitirse si se define `APP_URL`. Si se utilizan ambos nombres de contraseña, deben coincidir. |
| `MAIL_PROVIDER`, `RESEND_API_KEY`, `RESEND_FROM` | Correo por HTTPS con `MAIL_PROVIDER=resend` | Solo para recuperación | Requiere una cuenta habilitada, clave limitada a envíos y remitente autorizado. No hay envío real verificado. |
| `MIGRATION_DB_HOST`, `MIGRATION_DB_PORT`, `MIGRATION_DB_USER`, `MIGRATION_DB_PASSWORD`, `MIGRATION_DB_TLS_CA` | Cuenta de migración separada, solo en operación supervisada | Para migrar | TLS y permisos DDL separados de la aplicación. El script exige `CONFIRM_PRODUCTION_MIGRATION=yes` y cuenta distinta. |
| `DEMO_USER_EMAIL`, `DEMO_USER_PASSWORD`, `DEMO_ADMIN_EMAIL`, `DEMO_ADMIN_PASSWORD` | Secretos temporales para la operación supervisada | Para demostración | Crear cuentas sintéticas; en producción también exige `ALLOW_PRODUCTION_DEMO=yes`. No publicar valores. |

La plantilla de MySQL de Railway documenta variables propias y mantiene las bases privadas por defecto; deben verificarse y mapearse a las variables anteriores, sin usar automáticamente una cuenta administrativa. La [red privada](https://docs.railway.com/networking/private-networking/how-it-works) cifra el transporte con WireGuard, pero esta implementación además exige TLS MySQL con CA verificada. No se ha comprobado que una instancia concreta tenga TLS configurado.

La [documentación de red de Railway](https://docs.railway.com/networking/outbound-networking) indica que SMTP saliente no está disponible en sus planes Free, Trial y Hobby; en esos casos hace falta un servicio de correo por API HTTPS autorizado. La aplicación admite Resend por HTTPS, pero no se ha configurado ni verificado el envío real. Los [términos de Resend](https://resend.com/legal/terms-of-service) restringen su uso a mayores de 18 años; la selección y configuración del proveedor debe gestionarla una persona o institución habilitada.

El servidor escucha en `0.0.0.0` en producción, usa `PORT`, confía en un proxy y exige cookies `Secure`. Esta topología debe comprobarse con la infraestructura efectiva. Railway documenta el [puerto y la escucha](https://docs.railway.com/networking/troubleshooting/application-failed-to-respond) y el comportamiento de [`/health`](https://docs.railway.com/deployments/healthchecks). El Dockerfile se detecta desde la raíz, según la [documentación oficial](https://docs.railway.com/builds/dockerfiles). La configuración antigua `railway.json`/`railway.toml` está [descontinuada para nuevos servicios](https://docs.railway.com/config-as-code); no se añadió un archivo obsoleto.

## Antes de publicar

Revisar permisos y costos del servicio, preservar y respaldar las llaves, crear y respaldar la base autorizada, verificar certificados y cuentas separadas, probar migraciones con una copia aislada, construir la imagen, revisar el repositorio y completar CI. Las migraciones MySQL contienen DDL con confirmación implícita: si se interrumpen, requieren inspección manual y no se borran tablas automáticamente. La aplicación no ejecuta migraciones al arrancar.

Tras autorización expresa, la persona responsable debe verificar el dominio HTTPS, `/health`, acceso, notas, rol administrativo, recuperación si hay SMTP y persistencia. OWASP ZAP, Security Headers y SSL Labs siguen pendientes y solo deben ejecutarse contra el entorno autorizado. No hay evidencia de resultados externos.
