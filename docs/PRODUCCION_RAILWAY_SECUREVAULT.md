# SecureVault: conexión y despliegue en Railway

**Fecha de verificación:** 27 de noviembre de 2026  
**Repositorio:** [laboratorio-node.js](https://github.com/salgueroreymond2-tech/laboratorio-node.js)  
**Aplicación:** [successful-healing-labo.up.railway.app](https://successful-healing-labo.up.railway.app/)

Este documento describe los pasos utilizados para conectar SecureVault a MySQL y publicar la aplicación en Railway. No incluye contraseñas, llaves ni tokens.

## 1. Arquitectura del entorno

| Elemento | Configuración utilizada |
| --- | --- |
| Proyecto de Railway | `sweet-healing` |
| Entorno seleccionado | `labo` |
| Servicio de aplicación | `successful-healing`, conectado al repositorio de GitHub |
| Servicio de base de datos | `MySQL`, con volumen persistente |
| Base de datos | `securevault_db` |
| Rama del repositorio | `main` |
| Dominio público | `https://successful-healing-labo.up.railway.app` |
| Puerto HTTP | `8080` |

Aunque se usa el modo `production`, la entrega está en el entorno de Railway llamado `labo`. El entorno `production` de Railway es independiente y no fue el seleccionado para esta entrega. El servicio MySQL está conectado a la aplicación mediante la red privada de Railway.

## 2. Preparar el proyecto y los servicios

1. Se utilizó el proyecto `sweet-healing` y se seleccionó el entorno `labo` en Railway.
2. Se verificó que existiera el servicio `MySQL` con almacenamiento persistente.
3. Se vinculó `successful-healing` con la rama `main` del repositorio indicado.
4. En **Settings → Networking → Public Networking** de `successful-healing`, se generó el dominio público y se configuró `8080` como puerto de destino.

## 3. Crear la base de datos y la cuenta de aplicación

En **MySQL → Console**, se abrió el cliente con `mysql -u root -p` y se ingresó la contraseña de administración sin mostrarla en pantalla. Las instrucciones SQL se ejecutaron desde el indicador `mysql>`, no desde el indicador de comandos de Linux.

Se creó la base `securevault_db`. Para el uso normal de la aplicación se creó la cuenta `sv_app`, se le generó una contraseña y se concedieron únicamente los permisos de datos necesarios sobre esa base:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON securevault_db.* TO 'sv_app'@'%';
```

Se comprobó la asignación mediante `SHOW GRANTS FOR 'sv_app'@'%';`. La aplicación no utiliza `root` ni dispone de permisos para modificar el esquema durante su funcionamiento normal.

## 4. Configurar las variables de la aplicación

Las variables se agregaron en **successful-healing → Variables**, no en el servicio de MySQL. Los valores sensibles se conservaron en Railway y no se incluyeron en el repositorio.

| Variable | Valor o función |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | `8080`; debe coincidir con el puerto del dominio. |
| `APP_URL` | `https://successful-healing-labo.up.railway.app` |
| `DB_HOST` | Referencia al host privado `MySQL.MYSQLHOST`. |
| `DB_PORT` | Referencia al puerto `MySQL.MYSQLPORT`. |
| `DB_NAME` | `securevault_db` |
| `DB_USER` | `sv_app` |
| `DB_PASSWORD` | Contraseña generada para `sv_app`. |
| `DB_TLS_CA` | Contenido completo del certificado público de la autoridad certificadora de MySQL, en formato PEM. |
| `SESSION_SECRET` | Secreto independiente para la sesión, de al menos 43 caracteres. |
| `CSRF_SECRET` | Secreto independiente para la protección CSRF, de al menos 43 caracteres. |
| `NOTES_ENCRYPTION_KEY` | Clave de cifrado independiente de 32 bytes, representada por 64 caracteres hexadecimales. |
| `AUDIT_HMAC_KEY` | Clave independiente de 32 bytes, representada por 64 caracteres hexadecimales. |

Para referenciar las variables del servicio de MySQL, Railway utiliza la sintaxis `${{MySQL.MYSQLHOST}}` y `${{MySQL.MYSQLPORT}}`. Los cambios pendientes se aplicaron con **Deploy Changes**.

Los secretos deben generarse con un generador criptográfico. Las claves ya utilizadas, especialmente `NOTES_ENCRYPTION_KEY`, se deben conservar y respaldar de forma segura: cambiarlas sin un procedimiento de rotación puede impedir la lectura de datos o la verificación de eventos existentes.

## 5. Configurar la conexión cifrada a MySQL

En la consola de MySQL se consultó la configuración de certificados. El servidor informó `ca.pem` como autoridad certificadora y `server-cert.pem` como certificado del servidor. El certificado público `/var/lib/mysql/ca.pem` se copió a `DB_TLS_CA`, conservando sus líneas `BEGIN CERTIFICATE` y `END CERTIFICATE`. No se copiaron ni publicaron llaves privadas.

La aplicación usa TLS con `rejectUnauthorized: true` y la CA configurada. **Limitación pendiente:** el certificado automático observado no incluía el nombre interno de Railway y, con la configuración actual del controlador, no se verifica el nombre del servidor. Por ello queda pendiente reforzar y comprobar la identidad del servidor mediante un certificado adecuado y una verificación de nombre explícita.

## 6. Crear la cuenta de migración y ejecutar el esquema

Se creó una cuenta separada, `sv_migrator`, con una contraseña distinta a la de `sv_app`. Se le asignaron permisos sobre `securevault_db` para ejecutar las migraciones:

```sql
GRANT SELECT, INSERT, CREATE, ALTER, INDEX, REFERENCES ON securevault_db.* TO 'sv_migrator'@'%';
```

Antes de migrar, se verificó que la base nueva no tuviera tablas. Para ejecutar el proyecto dentro de la red privada de Railway se utilizó temporalmente la consola de `successful-healing`. La contraseña del migrador se introdujo de forma oculta en una sesión de consola, sin guardarla como variable permanente de la aplicación.

Con `MIGRATION_DB_PASSWORD` ya disponible únicamente en esa sesión, se ejecutó:

```bash
MIGRATION_DB_HOST="$DB_HOST" MIGRATION_DB_PORT="$DB_PORT" MIGRATION_DB_USER=sv_migrator CONFIRM_PRODUCTION_MIGRATION=yes npm run db:migrate
```

El resultado informado fue **«Migración inicial aplicada a securevault_db»** y **«Nombres de índices migrados»**. El ejecutor registra las migraciones versionadas en `schema_migrations`; la aplicación no modifica el esquema automáticamente al arrancar. Al finalizar se retiró la contraseña de la sesión con `unset MIGRATION_DB_PASSWORD`.

Las migraciones contienen operaciones DDL de MySQL que se confirman implícitamente. Si una migración falla parcialmente, se debe revisar el estado antes de volver a ejecutarla; no se deben borrar tablas para forzar su repetición.

## 7. Diagnóstico y corrección de conexión

Durante el despliegue apareció `ER_ACCESS_DENIED_ERROR`. Se comprobó que `sv_app` tuviera permisos, que no estuviera bloqueada y que pudiera conectarse a MySQL usando los valores configurados. También se probó la conexión desde el contenedor de la aplicación.

Para mantener ese contenedor abierto durante el diagnóstico se configuró temporalmente `node -e "setInterval(()=>{},60000)"` como comando de inicio. Después de la revisión se reemplazó por el comando normal:

```text
node src/server.js
```

Se identificó y corrigió un error de arranque que sobrescribía las credenciales de Railway cuando faltaba el archivo local `.env.app`. La corrección se subió a `main` y se desplegó en Railway.

## 8. Pruebas realizadas

| Prueba | Resultado observado |
| --- | --- |
| Página inicial pública | Respuesta HTTP 200 en la verificación realizada. |
| Estado de aplicación y MySQL | `GET /health` respondió HTTP 200 con `{"status":"ok"}`. La comprobación valida la conexión, no todas las funciones. |
| Registro e inicio de sesión | La persona usuaria registró una cuenta e inició sesión. |
| Persistencia de notas | Una nota creada siguió visible después de recargar la página. |
| Cierre de sesión | Tras cerrar sesión, el acceso a notas volvió a solicitar autenticación. |
| Separación entre cuentas | Una segunda cuenta no pudo abrir la nota de la primera mediante su dirección. |
| Pruebas automatizadas | Se ejecutaron pruebas unitarias, de seguridad y pruebas seleccionadas de autenticación, notas y recuperación contra una base MySQL local de pruebas. |
| Dependencias de producción | `npm audit --omit=dev` informó cero vulnerabilidades al momento de la comprobación. |

Las pruebas de recuperación utilizaron un proveedor simulado. No se ha comprobado la entrega real de un correo.

## 9. Pendientes para una operación completa

- Configurar un proveedor de correo autorizado y un remitente válido para recuperación de contraseñas; probar un envío y un restablecimiento reales. Railway indica que los planes Free, Trial y Hobby requieren una API de correo HTTPS porque SMTP saliente está deshabilitado.
- Resolver y verificar la identidad TLS de MySQL, además de la validación de la CA ya configurada.
- Comprobar respaldos y restauración de la base y resguardar las llaves de cifrado y firma.
- Completar las pruebas externas y la validación del panel administrativo que correspondan a la entrega. La respuesta de `/health` no sustituye estas comprobaciones.

## 10. Referencias

- [Variables y referencias en Railway](https://docs.railway.com/variables)
- [Red privada de Railway](https://docs.railway.com/networking/private-networking)
- [Configuración de dominios en Railway](https://docs.railway.com/networking/domains/working-with-domains)
- [Correo saliente en Railway](https://docs.railway.com/networking/outbound-networking)
- [Conexiones cifradas en MySQL](https://dev.mysql.com/doc/refman/8.4/en/connection-options.html)
