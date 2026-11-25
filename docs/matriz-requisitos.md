# Matriz de Trazabilidad de Requisitos — SecureVault

> PR08: perfil cifrado y cambio de contraseña, panel administrativo, cambios de rol, eventos HMAC, bloqueo temporal y recuperación con correo simulado tienen pruebas locales. Recuperación SMTP real, HTTPS, TLS MySQL, Docker y despliegue siguen sin verificar. La tabla inferior conserva estados históricos de planificación; consultar [estado actualizado](ESTADO_FINAL_PROYECTO.md).

> Actualización de notas: RF-04 tiene CRUD local cifrado, control de propietario, validación, CSRF y pruebas de integración. La búsqueda cifrada y los controles de producción aún están pendientes; ver [NOTAS_LOCALES.md](NOTAS_LOCALES.md).

> Actualización posterior: registro e inicio/cierre de sesión locales están implementados y tienen una prueba de integración en MySQL aislado. RF-01 y RF-02 siguen parcialmente completos: faltan, entre otros, bloqueo progresivo persistente y pruebas adicionales; ver [AUTH_LOCAL.md](AUTH_LOCAL.md). Los renglones inferiores preservan la planificación anterior.

> PR07: se agregó una página pública de estado y una vista de error. Las pantallas de autenticación, notas, perfil y administración permanecen pendientes; ver [integración frontend](FRONTEND_INTEGRATION.md).

> Actualización de preparación de despliegue: existe un borrador de CI para lint, unitarias, integración MySQL aislada, auditoría y Gitleaks, pero aún no se ha ejecutado en GitHub. No hay Dockerfile, pruebas de seguridad completas ni despliegue autorizado; no considerar DEVOPS-03/04 verificados.

> PR05: se añadieron pruebas de seguridad parciales y evidencia local en [evidence/](evidence/README.md); las diez categorías y RF-01 a RF-07 siguen incompletos. El resumen actualizado está en [PR05_AUDITORIA_SEGURIDAD.md](PR05_AUDITORIA_SEGURIDAD.md).

> PR06: Compose exige contraseñas externas y tiene pruebas sintéticas de inicialización, pero no se ha probado con Docker. El estado final de entrega está en [ESTADO_FINAL_PROYECTO.md](ESTADO_FINAL_PROYECTO.md).

Estados válidos: `Pendiente` | `En desarrollo` | `Implementado` | `Verificado` | `Bloqueado`

### Estado resumido vigente de los requisitos funcionales

| Requisito | Estado local y pendientes |
| --- | --- |
| RF-01 Registro | Implementado y probado; lista de contraseñas comunes limitada. |
| RF-02 Sesiones | Implementadas y probadas localmente; falta verificación en HTTPS real y bloqueo progresivo completo. |
| RF-03 Roles y propiedad | Implementados y probados para notas y panel administrativo; falta auditoría integral. |
| RF-04 Notas | CRUD cifrado y pruebas locales; falta búsqueda y verificación de producción. |
| RF-05 Perfil | Teléfono cifrado y enmascarado, cambio de contraseña y pruebas locales. |
| RF-06 Recuperación | Token de un solo uso probado con correo simulado; envío SMTP real pendiente. |
| RF-07 Administración | Usuarios, cambios de rol y eventos firmados; búsqueda, filtros y alertas pendientes. |
| RF-08 Salud | Endpoint probado localmente; URL pública pendiente. |

La tabla detallada que sigue es histórica y mantiene la planificación original.

## 1. Requisitos Funcionales (RF-01 a RF-08)

| Requisito | Implementación | Prueba | Evidencia | Estado |
|---|---|---|---|---|
| **RF-01** Registro de usuario (nombre, email único normalizado, mínimo 12 caracteres y máximo 72 bytes UTF-8, rechazo contraseñas comunes, bcrypt costo 12, anti-enumeración, rol `user` forzado) | Planificado: `src/routes/auth.routes.js`, `src/controllers/auth.controller.js`, `src/services/auth.service.js`, `src/validators/auth.validator.js`, `src/lib/password.js`, `src/views/auth/register.ejs` | Planificado: `tests/integration/auth.register.test.js`, `tests/unit/password.test.js` | Pendiente de Fase 2 | Pendiente |
| **RF-02** Inicio y cierre de sesión (sesión MySQL, regeneración de ID, invalidación real, expiración inactividad y absoluta, rate limit, bloqueo progresivo, cookies seguras, CSRF) | Planificado: `src/config/session.js`, `src/middlewares/csrf.js`, `src/middlewares/rateLimit.js`, `src/services/auth.service.js`, `src/views/auth/login.ejs` | Planificado: `tests/integration/auth.session.test.js`, `tests/security/bruteforce.test.js` | Pendiente de Fase 2 | Pendiente |
| **RF-03** Roles y permisos (`user`, `admin`, `requireAuth`, `requireRole`, `requireOwnership`, denegación por defecto) | Planificado: `src/middlewares/auth.js`, `src/middlewares/rbac.js` | Planificado: `tests/security/access-control.test.js` | Pendiente de Fase 2 | Pendiente |
| **RF-04** CRUD de notas privadas (solo dueño, título y contenido cifrados AES-256-GCM, búsqueda sin debilitar cifrado, límites de negocio, admin sin acceso automático) | Planificado: `src/routes/notes.routes.js`, `src/services/notes.service.js`, `src/repositories/notes.repository.js`, `src/lib/crypto.js`, `src/views/notes/` | Planificado: `tests/integration/notes.crud.test.js`, `tests/security/idor.test.js` | Pendiente de Fase 2 | Pendiente |
| **RF-05** Perfil y dato sensible (teléfono cifrado AES-256-GCM, enmascarado por defecto, revelación autorizada al dueño, excluido de logs) | Planificado: `src/routes/profile.routes.js`, `src/services/profile.service.js`, `src/views/profile/` | Planificado: `tests/integration/profile.test.js`, `tests/security/log-redaction.test.js` | Pendiente de Fase 2 | Pendiente |
| **RF-06** Recuperación de contraseña (token aleatorio `randomBytes(32)`, hash SHA-256 en BD, expiración, uso único, invalidación de sesiones previas, sin enumeración, abstracción mailer) | Planificado: `src/services/password-reset.service.js`, `src/lib/mailer.js`, `src/views/auth/forgot-password.ejs`, `reset-password.ejs` | Planificado: `tests/integration/password-reset.test.js` | Pendiente de Fase 2 | Pendiente |
| **RF-07** Panel de administración (usuarios paginados/búsqueda, eventos de seguridad con filtros, cambios de rol auditados, alertas de seguridad, sin exponer hashes/notas/tokens/teléfonos) | Planificado: `src/routes/admin.routes.js`, `src/services/admin.service.js`, `src/services/audit.service.js`, `src/views/admin/` | Planificado: `tests/integration/admin.test.js`, `tests/security/rbac.test.js` | Pendiente de Fase 2 | Pendiente |
| **RF-08** Endpoint de salud `GET /health` (estado mínimo, sin versiones/env/infraestructura, fail-closed seguro si BD cae) | Planificado: `src/routes/health.routes.js`, `src/controllers/health.controller.js` | Planificado: `tests/integration/health.test.js` | Pendiente de Fase 2 | Pendiente |

---

## 2. Seguridad OWASP Top 10:2025

| Requisito | Implementación | Prueba | Evidencia | Estado |
|---|---|---|---|---|
| **A01:2025** Broken Access Control (incl. SSRF) | `requireAuth`, `requireRole`, `requireOwnership`, `WHERE owner_id = ?`, `csrf-csrf`, denegación por defecto, sin peticiones salientes a URLs arbitrarias | `tests/security/idor.test.js`, `tests/security/csrf.test.js` | Pendiente de Fase 2/4 | Pendiente |
| **A02:2025** Security Misconfiguration | `helmet` (CSP estricta sin scripts inline, HSTS en prod), `app.disable('x-powered-by')`, CORS restrictivo, Zod env validation, errores genéricos, `NODE_ENV=production` | `tests/security/headers.test.js`, `securityheaders.com` | Pendiente de Fase 2/4 | Pendiente |
| **A03:2025** Software Supply Chain Failures | `package-lock.json`, `npm ci`, `npm audit`, `.github/dependabot.yml`, Gitleaks en CI, dependencias mínimas | CI workflow + `npm audit` | Pendiente de Fase 2/3 | Pendiente |
| **A04:2025** Cryptographic Failures | bcrypt costo 12, AES-256-GCM (32B key, 12B IV único, 16B tag, `version.iv.tag.ciphertext`), HMAC-SHA256, TLS 1.2/1.3, cookies seguras | `tests/unit/crypto.test.js`, `tests/unit/password.test.js`, SSL Labs | Pendiente de Fase 2/4 | Pendiente |
| **A05:2025** Injection (incl. XSS) | Sequelize parametrizado, Zod con listas blancas, escape EJS (`<%= %>`), CSP estricta, límite de payload | `tests/security/injection-xss.test.js` | Pendiente de Fase 2 | Pendiente |
| **A06:2025** Insecure Design | Modelo STRIDE, DFD, activos, límites de confianza, casos de abuso, límites de negocio y riesgos residuales | Revisión documental `docs/threat-model.md` | [threat-model.md](threat-model.md) | Implementado |
| **A07:2025** Authentication Failures | Rate limiting por IP, bloqueo progresivo temporal en MySQL, anti-enumeración, expiración inactividad/absoluta, regeneración e invalidación de sesión | `tests/security/bruteforce.test.js`, `tests/integration/auth.session.test.js` | Pendiente de Fase 2 | Pendiente |
| **A08:2025** Software or Data Integrity Failures | Pipeline CI bloqueante, assets locales sin CDNs no confiables (sin ejecución dinámica), firma `HMAC-SHA256` por evento en `security_events` | `tests/unit/audit-hmac.test.js`, `.github/workflows/ci.yml` | Pendiente de Fase 2/3 | Pendiente |
| **A09:2025** Security Logging and Alerting Failures | Pino JSON con redacción de campos sensibles, `request_id`, tabla `security_events`, alerta automática ante $N$ fallos consecutivos | `tests/security/log-redaction.test.js`, `tests/integration/alerts.test.js` | Pendiente de Fase 2 | Pendiente |
| **A10:2025** Mishandling of Exceptional Conditions | Middleware global de errores genéricos, fail closed, timeouts MySQL/HTTP, `unhandledRejection`/`uncaughtException`, graceful shutdown `SIGTERM` | `tests/security/error-handling.test.js` | Pendiente de Fase 2 | Pendiente |

---

## 3. Requisitos Criptográficos, DevOps, Despliegue y Documentación

| Requisito | Implementación | Prueba | Evidencia | Estado |
|---|---|---|---|---|
| **CRIPTO-01** bcrypt (costo 12, hasta 72 bytes UTF-8) | `src/lib/password.js` | `tests/unit/password.test.js` | Pruebas unitarias locales; registro pendiente | En desarrollo |
| **CRIPTO-02** AES-256-GCM con IV 12B único y AAD | Planificado: `src/lib/crypto.js` | `tests/unit/crypto.test.js` | Pendiente de Fase 2 | Pendiente |
| **CRIPTO-03** SHA-256 tokens reset + HMAC-SHA256 eventos | Planificado: `src/lib/crypto.js`, `src/services/audit.service.js` | `tests/unit/crypto.test.js` | Pendiente de Fase 2 | Pendiente |
| **DEVOPS-01** Deep Research Fase 0 (3 plataformas + 6+ fuentes) | [deep-research.md](deep-research.md) | Revisión contra rúbrica Sec. 7 | [deep-research.md](deep-research.md) | Verificado |
| **DEVOPS-02** Diseño Arquitectura, BD MySQL y ADRs | [architecture.md](architecture.md), [ADR-0001](adr/0001-database-mysql-sequelize.md), [ADR-0002](adr/0002-deployment-platform.md) | Revisión de trazabilidad | Documentos creados en Fase 1 | Implementado |
| **DEVOPS-03** Dockerfile multi-stage + compose + GitHub Actions CI | Planificado: `Dockerfile`, `compose.yaml`, `.github/workflows/ci.yml`, `.github/dependabot.yml` | `docker build` + CI run | Pendiente de Fase 2/3 | Pendiente |
| **DEVOPS-04** Despliegue público HTTPS + verificación externa | Planificado: Railway (o Render + TiDB Cloud) | `/health`, SSL Labs, securityheaders.com, OWASP ZAP | Pendiente de Fase 3/4 | Pendiente |
| **DOC-01** README.md, informe-seguridad.md, demo.md | Planificado en Fase 2–4 (`AGENTS.md` ya creado) | `npm run check:release` | [AGENTS.md](../AGENTS.md) | En desarrollo |

---

## 4. Bonificaciones (+10 puntos potenciales)

| Requisito | Implementación | Prueba | Evidencia | Estado |
|---|---|---|---|---|
| **BONO-01** MFA con TOTP | Planificado: `user_mfa` + `otplib` / `otpauth` + QR local | `tests/integration/mfa.test.js` | Pendiente de Fase 2 | Pendiente |
| **BONO-02** Rotación funcional de llaves (`key_version`) | Planificado: `src/lib/crypto.js` + `scripts/rotate-keys.js` | `tests/unit/key-rotation.test.js` | Pendiente de Fase 2 | Pendiente |
| **BONO-03** Contenedor Docker con usuario no root | Planificado: `Dockerfile` (`USER node` / usuario dedicado) | Inspección `Dockerfile` y `docker build` | Pendiente de Fase 3 | Pendiente |
| **BONO-04** Escaneo de secretos con Gitleaks en CI | Planificado: `.github/workflows/ci.yml` | Ejecución CI / Gitleaks local | Pendiente de Fase 3 | Pendiente |
| **BONO-05** Alertas enviadas a canal externo autorizado | Planificado: webhook/correo configurable con lista blanca de URL | `tests/unit/alert-dispatcher.test.js` | Pendiente de Fase 2 | Pendiente |
