# Control de Progreso — SecureVault

**Última actualización:** 2026-11-25  
**Fase actual:** Fase 2 iniciada; aplicación y validación integral pendientes.

---

## 1. Diagnóstico Inicial del Workspace

- Al iniciar el proyecto, la carpeta de trabajo estaba vacía y sin repositorio Git propio (Git resolvía hacia un `.git` accidental en el directorio padre de usuario).
- Se inicializó un repositorio Git dedicado en el workspace (`main`) vinculado al remoto `https://github.com/salgueroreymond2-tech/laboratorio-node.js.git` con un primer `.gitignore` mínimo.
- Entorno local verificado: Node.js `v22.18.0` (LTS activo), npm `10.9.3`, Docker Desktop instalado (daemon actualmente apagado en el equipo local).

---

## 2. Estado por Fase

| Fase | Estado | Resumen de avance |
|---|---|---|
| **Fase 0 — Deep Research** | Completada | Comparación de Railway, Render y Fly.io + MySQL gestionado (Railway MySQL / TiDB Cloud), respuestas a las 10 preguntas con 22 referencias oficiales verificadas y plan de despliegue propuesto. |
| **Fase 1 — Diseño** | Completada | Definición de arquitectura modular, modelo relacional MySQL (`securevault_db`) con diagrama ER, ADRs (MySQL y plataforma), modelo de amenazas STRIDE + DFD, sistema de diseño UI/UX, flujo Auth/CSRF y matriz inicial de requisitos. |
| **Fase 2 — Desarrollo seguro** | En desarrollo | Dependencias iniciales y utilidades criptográficas con pruebas unitarias; pendientes migraciones, sesiones, RF-01 a RF-08, frontend y pruebas de integración. |
| **Fase 3 — Despliegue** | Pendiente | Dockerfile multi-stage no root, GitHub Actions CI/CD, Dependabot, Gitleaks, MySQL en la nube y publicación HTTPS autorizada. |
| **Fase 4 — Verificación** | Pendiente | Pruebas finales, `npm audit`, OWASP ZAP, `securityheaders.com`, Qualys SSL Labs, revisión visual en navegador (1440/768/390 px), informe final y demo. |

---

## 3. Ponderación Académica Estimada (Solo Avance Real Verificable)

> Nota: Esta tabla refleja únicamente el progreso verificable en el workspace actual; no constituye una calificación oficial del docente.

| Criterio | Puntos máximos | Estado actual | Estimación verificable |
|---|---:|---|---:|
| Deep Research | 10 | Documento completo en `docs/deep-research.md` con 3 plataformas y 22 fuentes verificadas. | 10 / 10 |
| Funcionalidad (RF-01 a RF-08) | 10 | Diseñada en arquitectura y matriz; pendiente de implementación en Fase 2. | 0 / 10 |
| OWASP Top 10:2025 | 30 | A06 (Modelo de amenazas STRIDE) documentado; controles de código pendientes de Fase 2. | 2 / 30 |
| Hash y cifrado | 20 | Especificación técnica y ADRs diseñados; pendiente de código y pruebas en Fase 2. | 0 / 20 |
| Despliegue | 20 | Estrategia definida en ADR-0002; pendiente de Fase 3. | 0 / 20 |
| Informe y demostración | 10 | Documentación base iniciada (`AGENTS.md`, `architecture.md`, `threat-model.md`, `matriz-requisitos.md`); faltan informe final, evidencias y `demo.md`. | 2 / 10 |
| **Total ordinario** | **100** | **Avance documental/diseño (Fases 0 y 1)** | **14 / 100** |
| Bonificaciones | Hasta 10 | Diseñadas en modelo (`user_mfa`, `key_version`); pendientes de implementación y verificación. | 0 / 10 |

---

## 4. Registro de Archivos Creados (Fases 0 y 1)

- `.gitignore` — Exclusión inicial (`node_modules/`, `.env`).
- `AGENTS.md` — Reglas permanentes de seguridad, MySQL y arquitectura.
- `docs/deep-research.md` — Informe de investigación de despliegue (Fase 0).
- `docs/adr/0001-database-mysql-sequelize.md` — Decisión arquitectónica sobre MySQL + Sequelize.
- `docs/adr/0002-deployment-platform.md` — Decisión sobre plataforma de despliegue.
- `docs/architecture.md` — Arquitectura modular, diagrama ER MySQL, flujo Auth/CSRF y sistema visual.
- `docs/threat-model.md` — Modelo de amenazas STRIDE, DFD, casos de abuso, límites de negocio y riesgos residuales.
- `docs/matriz-requisitos.md` — Matriz de trazabilidad inicial.
- `docs/progreso.md` — Este documento de seguimiento.

---

## 5. Pendientes y Riesgos Actuales

- **Pendiente crítico:** Implementar la aplicación, migraciones y pruebas sobre una base MySQL de pruebas independiente.
- **Riesgo de entorno local:** Docker Desktop está instalado pero el daemon no estaba iniciado al momento del diagnóstico; se requerirá encender Docker Desktop (o disponer de MySQL 8 local) para ejecutar migraciones y pruebas de integración reales en Fase 2.

## 6. Inicio de fase 2

- Se leyó el documento académico original y se creó la base de Node.js con dependencias y lockfile.
- Se implementaron AES-256-GCM, AAD de notas vinculado al dueño, registro y campo, tokens aleatorios y HMAC; se añadieron pruebas unitarias de criptografía y Argon2id. Esto no constituye una aplicación funcional.
- La última auditoría de instalación informó dos vulnerabilidades moderadas transitivas relacionadas con Sequelize/uuid. La selección de almacén de sesiones queda pendiente: se retiró una opción con una vulnerabilidad alta en su driver indirecto.
- MySQL80 está activo en el equipo, pero no se ha validado acceso a una base de pruebas aislada. No se modificaron bases de datos existentes.
- El documento de investigación y su calificación estimada requieren revisión: la comparación de Fly.io está desactualizada; no se debe asumir que los 10 puntos están garantizados.

## 7. Conexión local inicial

- Express inicia en localhost y comprueba la conexión MySQL mediante Sequelize. `GET /health` informa disponibilidad sin exponer detalles; el servidor rechaza el modo de producción hasta incorporar su configuración de seguridad.
- La comprobación manual de solo lectura con la base configurada devolvió HTTP 200. Las pruebas automatizadas de HTTP usan un sustituto de base de datos; aún falta una prueba de integración contra una base MySQL de pruebas independiente.
- `npm test`, ESLint y Prettier aprobaron. `npm audit --audit-level=high` no reportó vulnerabilidades altas o críticas, pero informó dos moderadas transitivas relacionadas con Sequelize/uuid.
- Siguen pendientes las migraciones, autenticación, sesiones, notas, perfil, recuperación, administración y las verificaciones externas. No se han creado tablas ni modificado datos durante esta conexión inicial.

## 8. Migración inicial y base de pruebas

- La base principal ya contenía siete tablas creadas previamente sin historial de migración. El ejecutor se negó a modificarlas o marcarlas automáticamente como migradas.
- Se creó `securevault_test_db` y se aplicó la migración inicial. Una prueba de integración verificó tablas, registro de migración y dos claves foráneas; ejecutar la migración por segunda vez no repitió los cambios.
- La cuenta de MySQL configurada tiene privilegios administrativos globales. La aplicación debe pasar a una cuenta limitada a DML; también deben configurarse cuentas independientes de migración y pruebas.
- Registro, inicio de sesión, CSRF, notas privadas, perfil, recuperación y administración siguen pendientes. La base de pruebas no contiene pruebas de esas funcionalidades.

## 9. Cuenta de aplicación y adopción del esquema

- Se configuró una cuenta local de aplicación con permisos SELECT, INSERT, UPDATE y DELETE únicamente sobre `securevault_db`. La cuenta administrativa original permanece disponible para tareas de administración y migraciones; no debe usarse para ejecutar el servidor.
- Se compararon columnas, índices, restricciones, claves foráneas, triggers, configuración de tablas y el historial de la base de pruebas. Las tablas de la base principal se conservaron y se registraron las migraciones verificadas.
- A solicitud del usuario se sustituyó Argon2id por bcrypt costo 12. Se rechazan entradas de más de 72 bytes UTF-8 para impedir el truncamiento silencioso; el registro de usuarios aún está pendiente.

## 10. Preparación de despliegue — pendiente

- La premisa de tres PR funcionales completos no coincide con este workspace: faltan frontend, autenticación y RF-01 a RF-07. El servidor y las migraciones aún rechazan producción.
- Se prepararon un workflow parcial de CI, Dependabot, una guía de despliegue y un borrador del informe de seguridad. CI aún no se ejecutó en GitHub y no implementa despliegue ni sustituye las pruebas de seguridad faltantes.
- La publicación, la URL pública y todas las comprobaciones externas siguen pendientes. No se aprovisionaron servicios ni se cambió infraestructura externa. La estimación de la auditoría anterior permanece como referencia no oficial y no implica avance funcional adicional.

## 11. PR05 — Verificación parcial de seguridad

- Se añadieron cinco pruebas de seguridad para las utilidades, HTTP y aislamiento de base de pruebas; siete unitarias, cinco de seguridad y una de integración aprobaron en local. `npm ci` se verificó en una carpeta temporal; la integración utilizó credenciales temporales con la base `securevault_test_db` y `NODE_ENV=test`.
- Las migraciones `--test` y la integración rechazan host remoto o modo distinto de test. Un túnel local aún podría apuntar a otro servidor: sigue siendo obligatorio utilizar una instancia de pruebas aislada.
- Gitleaks examinó siete commits locales y carpetas seleccionadas sin detecciones. La revisión manual identificó contraseñas de desarrollo fijadas en Compose e inicialización SQL que el escáner no detectó; deben corregirse antes de uso o publicación.
- `npm audit --audit-level=high`: sin altas/críticas, dos moderadas. `check:release` bloquea deliberadamente la liberación; CI incluye esa puerta pero no ha corrido en GitHub.
- El [informe PR05](PR05_AUDITORIA_SEGURIDAD.md) y [evidencias](evidence/README.md) documentan lo verificado y lo pendiente. No hay URL pública ni escaneos externos autorizados. El PR05 no satisface aún todos sus criterios de aceptación.

## 12. PR06 — Preparación académica parcial

- Se retiraron contraseñas de desarrollo predeterminadas de Compose y del SQL, y se trasladó la creación de usuarios a un script que exige variables externas. Compose con valores sintéticos y la sintaxis del script validaron; dos pruebas con MySQL simulado aprobaron. Docker real no se ejecutó y ninguna credencial de una cuenta o volumen existente se rotó.
- Se actualizaron Deep Research e informe de seguridad, se generó un PDF local de dos páginas y se prepararon guion, defensa, checklist, evaluación y ficha del profesor como borradores con bloqueantes explícitos. La revisión visual final del PDF está pendiente.
- Verificación: 15 pruebas distintas aprobaron (7 unitarias, 7 seguridad, 1 integración); lint y formato aprobaron; npm ci se ejecutó en una carpeta temporal; npm audit informó dos moderadas y cero altas/críticas. `check:release` continúa fallando deliberadamente.
- Estado: **BLOQUEADO POR REQUISITOS OBLIGATORIOS**. Faltan RF-01 a RF-07, frontend, controles OWASP integrados, Docker y CI verificados, despliegue HTTPS, cuentas y evidencia externa. No se generó v1.0.0 ni se publicaron cambios.

## 13. PR07 — Interfaz pública parcial

- Se incorporaron una página EJS de estado, error 404, identidad SVG, recursos locales y navegación adaptable. El indicador consulta `/health` real y mantiene el contrato JSON de la API.
- Se tomaron capturas locales en escritorio y emulación móvil; ver [evidencias](evidence/frontend/README.md). Quedan pendientes las pantallas de negocio y su backend, por lo que el proyecto continúa bloqueado para entrega completa.
- Pasaron 9 pruebas unitarias, 7 de seguridad y una integración de lectura del esquema de la base de pruebas; lint y formato aprobaron. Auditoría npm: dos alertas moderadas y ninguna alta o crítica. La comprobación de liberación sigue bloqueada deliberadamente.
- Arquitectura, diseño, integración y límites están documentados en [PR07](PR07_FRONTEND.md).

## 14. Registro e inicio de sesión locales

- Se agregaron registro, inicio y cierre de sesión con formularios EJS, bcrypt costo 12, validación Zod, protección CSRF y sesiones MySQL. La cuenta muestra un mensaje de bienvenida; las notas aún no existen.
- La recuperación, el bloqueo progresivo persistente por cuenta, la auditoría integrada y el despliegue seguro permanecen pendientes. Ver [AUTH_LOCAL.md](AUTH_LOCAL.md).

## 15. Notas privadas locales

- Se implementaron creación, lectura, edición y eliminación con confirmación, listado paginado, validación y acceso restringido a la cuenta propietaria. Título y contenido se cifran usando AES-256-GCM con una clave independiente.
- La prueba de integración verificó operaciones, cifrado, CSRF, escape de HTML y aislamiento de una cuenta administradora en la base de pruebas. Falta la rotación de clave, copia de seguridad operativa y preparación para producción. Ver [NOTAS_LOCALES.md](NOTAS_LOCALES.md).

## 16. PR08 — Cierre prioritario parcial

- Se incorporaron perfil con teléfono cifrado, cambio de contraseña que invalida otras sesiones, panel administrativo con cambios de rol, eventos HMAC y bloqueo persistente por intentos fallidos. Se prepararon cuentas sintéticas locales y un mecanismo idempotente.
- La recuperación utiliza tokens aleatorios almacenados como hash y de un solo uso. Se verificó con proveedor simulado; sin SMTP configurado la página lo comunica y no ofrece un envío falso.
- La configuración de producción y un Dockerfile quedaron preparados; cookies seguras se probaron detrás de proxy simulado. Docker, MySQL/TLS de producción, CI remota, URL pública y auditorías externas siguen pendientes. No se publicó ni se configuró infraestructura externa.
