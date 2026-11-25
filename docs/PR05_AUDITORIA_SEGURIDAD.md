# PR 05 — Auditoría de seguridad y evidencias

> Actualización posterior PR06: se retiraron las contraseñas predeterminadas de la configuración local de Compose y el SQL de inicialización; se añadieron pruebas sintéticas. El arranque real con Docker y cualquier rotación de cuentas ya existentes siguen pendientes. Las observaciones de abajo describen el momento de PR05.

**Fecha:** 25 de noviembre de 2026. **Entorno:** Windows local, Node.js 22, Express y MySQL; pruebas con datos sintéticos y `securevault_test_db` independiente. **Estado del PR:** incompleto para los criterios de aceptación; hay bloqueantes documentados.

## 1. Resumen ejecutivo

La premisa de que los PR 1–4 están terminados no coincide con el repositorio. El único endpoint funcional disponible es `/health`; no existe autenticación, frontend ni CRUD de notas. La aplicación rechaza producción y no se ha identificado una URL pública verificada. La base de datos tiene migraciones y utilidades criptográficas parciales, sin integración con los flujos del laboratorio.

La auditoría anterior y su desglose están en [AUDITORIA_FINAL_SECUREVAULT.md](AUDITORIA_FINAL_SECUREVAULT.md). Las evidencias organizadas están en [evidence/README.md](evidence/README.md). No se modificó la base principal ni se hicieron escaneos externos sobre producción durante este trabajo.

## 2. Requisitos funcionales

| RF | Estado | Resultado o bloqueo |
|---|---|---|
| RF-01 Registro | Pendiente | No existe registro ni interfaz. bcrypt se verifica como utilidad independiente. |
| RF-02 Sesiones | Pendiente | No existen login, logout, cookies, sesiones persistentes ni CSRF. |
| RF-03 Roles | Pendiente | Existe columna de rol, sin autorización de servidor ni panel. |
| RF-04 Notas | Pendiente | Existe tabla y utilidad de cifrado, sin CRUD, propiedad ni pruebas IDOR. |
| RF-05 Perfil | Pendiente | Existe tabla, sin flujo de edición, enmascaramiento ni revelación. |
| RF-06 Recuperación | Pendiente | Las funciones de token/hash existen, sin flujo, expiración aplicada ni uso único. |
| RF-07 Administración | Pendiente | No existen administración, bitácora operativa ni alertas. |
| RF-08 Salud | Verificado localmente | `/health` respondió HTTP 200; ante un error de base simulado las pruebas verificaron 503 genérico. Producción no verificada. |

## 3. OWASP Top 10:2025

Todas las filas están **parciales o pendientes**; ninguna categoría tiene todos sus controles y evidencias completos. La columna de evidencia enlaza los métodos, archivos, resultados y límites de cada categoría.

| Categoría y requisito | Mitigación o revisión actual | Evidencia | Deficiencia y riesgo residual | Estado |
|---|---|---|---|---|
| A01 Broken Access Control | Una ruta mutadora inexistente devuelve 404. | [A01](evidence/owasp/A01/README.md) | Faltan autenticación, propiedad, RBAC y CSRF; no se puede probar IDOR. | Pendiente |
| A02 Security Misconfiguration | Helmet, CSP de scripts y ausencia de `X-Powered-By` verificados en aplicación de prueba. | [A02](evidence/owasp/A02/README.md) | Proxy, HTTPS y cabeceras reales de producción no comprobados. | Parcial |
| A03 Software Supply Chain Failures | `npm ci` en copia temporal, audit y Gitleaks locales; CI/Dependabot presentes. | [A03](evidence/owasp/A03/README.md) | Dos moderadas, CI no ejecutado en GitHub y código aún sin seguimiento. | Parcial |
| A04 Cryptographic Failures | bcrypt y AES-GCM con pruebas sintéticas. | [A04](evidence/owasp/A04/README.md) | Sin llaves gestionadas, TLS de producción ni integración de datos. | Parcial |
| A05 Injection | Límite de 16 KB de JSON y respuesta 413 en prueba aislada. | [A05](evidence/owasp/A05/README.md) | Sin entradas de negocio implementadas no se prueban SQLi, XSS o asignación masiva. | Parcial |
| A06 Insecure Design | Modelo STRIDE y DFD existentes. | [A06](evidence/owasp/A06/README.md) | Las mitigaciones y límites indicados en el modelo no están todos implementados. | Parcial |
| A07 Authentication Failures | bcrypt validado como utilidad. | [A07](evidence/owasp/A07/README.md) | No hay login, expiración, protección anti-enumeración ni prueba de 429. | Pendiente |
| A08 Software or Data Integrity Failures | HMAC detecta alteraciones en prueba sintética; CI definido. | [A08](evidence/owasp/A08/README.md) | Firma no integrada ni llave independiente validada; CI no ejecutado. | Parcial |
| A09 Security Logging and Alerting Failures | Pino se usa en el arranque. | [A09](evidence/owasp/A09/README.md) | No hay eventos de autenticación, redacción integral, correlación ni alertas. | Pendiente |
| A10 Mishandling of Exceptional Conditions | 503 genérico ante error simulado y salida segura de producción en configuración. | [A10](evidence/owasp/A10/README.md) | Indisponibilidad real, cierre ordenado y reinicios de producción pendientes. | Parcial |

## 4. Criptografía

- **Contraseñas:** se mantiene bcrypt costo 12 conforme a la instrucción posterior del usuario. El documento académico permite bcrypt costo 12; este PR menciona Argon2id, pero no se cambió de nuevo el algoritmo. El código rechaza más de 72 bytes UTF-8 para impedir truncamiento; registro y política de complejidad están pendientes.
- **AES-256-GCM:** llave de 32 bytes, IV aleatorio de 12 bytes y tag de 16; las pruebas comprueban formato, llave incorrecta, alteración y AAD. Se comparan IV de dos operaciones, lo cual no demuestra unicidad absoluta. No existe gestión de llaves ni rotación funcional.
- **Tokens:** `randomBytes(32)` y SHA-256 probados como funciones. No existen expiración, uso único, envío o eliminación de sesiones integrados.
- **HMAC:** la prueba detecta alteración y la función compara firmas mediante `timingSafeEqual`. Falta validar la independencia de las llaves, establecer una representación canónica de metadatos e integrar la firma con `security_events`. La firma individual no detecta por sí sola el borrado de eventos.
- **TLS y cookies:** no verificables sin producción y sesiones.

## 5. Pruebas y comprobaciones

| Comando o método | Resultado | Alcance |
|---|---|---|
| `npm run lint` | Aprobado | Reglas ESLint configuradas. |
| `npm run format:check` | Aprobado | Archivos incluidos en el script. |
| `npm test` | 7 aprobadas, 0 fallidas, 0 omitidas | Ejecuta solo la suite unitaria. |
| `npm run test:unit` | 7 aprobadas | Es la misma suite; no se suman dos veces. |
| `npm run test:security` | 5 aprobadas, 0 fallidas, 0 omitidas | Criptografía, HTTP y aislamiento de pruebas; no incluye IDOR o CSRF de negocio. |
| `npm run test:integration` | 1 aprobada, 0 fallidas, 0 omitidas | Se proporcionaron variables temporalmente en el proceso; lectura de esquema en `securevault_test_db`. La configuración normal aún requiere `TEST_DB_*`. |
| `npm ci` | Aprobado | En carpeta temporal aislada con copia de `package.json` y lockfile, sin sustituir `node_modules` del proyecto. |
| `npm audit --audit-level=high` | Código 0 con umbral high | 0 altas/críticas y 2 moderadas transitivas; no equivale a cero vulnerabilidades. |
| `npm run check:release` | Código 1 deliberado | Bloqueo fijo mientras falten funcionalidades y verificaciones. No es todavía una checklist automatizada completa. |
| `/health` local | HTTP 200 | Solo disponibilidad local; error real de MySQL no se simuló apagando el servicio. |
| Gitleaks 8.30.1 | Sin detecciones automáticas | 7 commits y escaneos separados de `src/`, `scripts/`, `.github/`, `docs/`, `tests/`, `migrations/` y `compose.yaml`; una revisión manual encontró contraseñas de desarrollo en dos archivos que el escáner no detectó. |

**Total de pruebas distintas ejecutadas:** 13: 7 unitarias + 5 de seguridad + 1 de integración; 13 aprobadas, 0 fallidas y 0 omitidas en esas suites. El fallo deliberado de `check:release` es una comprobación de estado, no una prueba aprobada. No se ejecutaron pruebas funcionales de los RF ausentes, ZAP, Security Headers ni SSL Labs.

## 6. Correcciones realizadas y evidencias

Se añadió una restricción para que migraciones `--test` y la prueba de integración exijan `NODE_ENV=test`, nombre fijo de base de prueba y una dirección local. Las pruebas comprueban el rechazo de destinos remotos antes de conectar. Esta medida reduce errores, pero **no prueba** que un túnel local no apunte a producción ni reemplaza una instancia de pruebas separada.

Se agregaron pruebas de formato y parámetros criptográficos, respuesta genérica, CSP de scripts, rechazo de JSON grande y protección de destino de pruebas. Se añadieron `test:security` y un bloqueo explícito `check:release`; el workflow de CI incluye ambos, pero aún no se ha ejecutado en GitHub. Estas correcciones no implementan CSRF, autenticación o autorización.

Las evidencias sanitizadas se encuentran en [evidence/](evidence/README.md). Los valores de secretos no se incluyen ni en el informe ni en las evidencias.

## 7. Vulnerabilidades y riesgos

1. **Bloqueante:** las funciones de seguridad del producto y RF-01–RF-07 no existen. No exponer el servidor como aplicación terminada.
2. **Bloqueante:** `compose.yaml` y `scripts/mysql-init.sql` contienen contraseñas locales de desarrollo codificadas; no se han corregido ni se deben publicar o usar así. El escáner automático no las detectó. Si alguna se ha reutilizado fuera del entorno local, tratarla como expuesta y sustituirla mediante un procedimiento autorizado; no rotar secretos de producción sin permiso.
3. **Moderadas:** dos alertas transitivas de npm ligadas a Sequelize/uuid. No se ejecutó `npm audit fix --force` porque propone cambios incompatibles; investigar y probar una actualización segura.
4. **Riesgo de protección limitada:** `.env` y `.env.app` están ignorados; la cuenta administrativa local permanece separada de la cuenta DML de aplicación. Los valores no se publican. No se garantiza que todos los remotos u otras ubicaciones estén libres de secretos.
5. **Migraciones:** el ejecutor usa DDL con confirmaciones implícitas y no tiene recuperación ni exclusión concurrente completas. La restricción de host de pruebas no garantiza aislamiento frente a túneles.
6. **Criptografía y auditoría:** sin carga y validación de llaves independientes, rotación ni firma integrada de eventos; falla la trazabilidad de alteraciones o borrados reales.
7. **Versionado:** buena parte de código, pruebas, lockfile y CI continúa sin seguimiento de Git. No se ha creado ni fusionado un PR.

## 8. Producción y herramientas externas

No hay URL pública ni endpoint de producción verificados. No se ejecutaron escaneos externos ni se crearon servicios. Cuando haya despliegue autorizado, seguir [DEPLOY_PRODUCCION.md](DEPLOY_PRODUCCION.md) y obtener permiso antes de escanear.

- **ZAP:** su [Baseline Scan](https://www.zaproxy.org/docs/docker/baseline-scan/) realiza exploración y análisis pasivo; debe apuntar solo a una instancia propia autorizada. Sigue pendiente por ausencia de URL/entorno y Docker no disponible.
- **Security Headers:** tras autorización y existencia de URL pública, introducirla en [Security Headers](https://securityheaders.com/) y guardar el resultado sanitizado. No hay calificación actual.
- **SSL Labs:** tras autorización, introducir el hostname público en [SSL Server Test](https://www.ssllabs.com/ssltest/); revisar opciones de visibilidad del reporte antes de enviarlo. No hay calificación actual.
- **npm audit:** repetir al actualizar dependencias y registrar todos los niveles; `--audit-level=high` determina el umbral de salida, no oculta el riesgo moderado. [Documentación npm](https://docs.npmjs.com/cli/commands/npm-audit/).

## 9. Bonificaciones, avance y próximos pasos

MFA TOTP, rotación funcional, Docker no root y alertas externas: pendientes. Gitleaks se ejecutó localmente y existe configuración de CI, pero CI no está verificada en GitHub; no se adjudican puntos automáticamente. **Bonificación estimada: 0/10.**

Se mantiene la estimación orientativa anterior de **14/100**, no oficial, y el índice estricto de **3,1 %** definido en la auditoría: 1 unidad completa de 32 entre RF, pantallas, categorías completas y despliegue. Este índice excluye componentes parciales y no es una medida de esfuerzo ni una calificación del profesor. Las nuevas pruebas no completan un RF adicional ni una categoría OWASP completa.

Prioridades: corregir las credenciales de desarrollo sin afectar datos existentes; separar credenciales de pruebas; implementar autenticación, roles, sesiones y notas; probarlos en MySQL de pruebas; completar CI/Docker y preparar producción. Solicitar autorización antes de publicar o escanear producción. No se inició PR 6.
