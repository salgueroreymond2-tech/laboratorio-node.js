# Auditoría integral de SecureVault

> Actualización posterior: PR06 sustituyó las contraseñas predeterminadas de Compose por variables requeridas y añadió pruebas sintéticas; Docker real sigue sin verificarse. Esta auditoría conserva sus resultados como fotografía histórica.

**Fecha de revisión:** 25 de noviembre de 2026.
**Alcance:** estado local del workspace, comparado con `Laboratorio_NodeJS_OWASP_Deploy (1).docx` y el prompt maestro. La auditoría incluye código sin seguimiento de Git. No se modificó código ni se ejecutaron operaciones destructivas durante la revisión.

## 1. Resumen ejecutivo

**No está listo para entrega ni producción.** Existe un servidor Express local con conexión MySQL, `/health`, utilidades criptográficas y migraciones. No hay aplicación de notas, autenticación ni frontend. Los RF-01 a RF-07 están pendientes. Las evidencias actuales no prueban las diez categorías OWASP de extremo a extremo.

El commit `4f89580` contiene principalmente documentación. La mayoría del código, `package.json`, lockfile, migraciones y pruebas están **sin seguimiento de Git**: existen en este equipo, pero no están en el commit ni entrarían automáticamente en un PR. El worktree también tiene modificaciones previas. No se realizaron commits ni publicación.

El laboratorio original admite bcrypt con costo mínimo 12. El prompt maestro pedía Argon2id, pero el usuario pidió después sustituirlo por bcrypt; se respeta esa decisión. La implementación rechaza contraseñas de más de 72 bytes UTF-8, por lo que no cumple el anterior máximo de 128 caracteres del prompt maestro.

## 2. Avance medible

Las siguientes cifras son un **indicador estricto**, no una medición de esfuerzo ni una nota académica. Se cuenta como completo solo lo implementado y verificado de extremo a extremo en el entorno disponible:

| Dimensión | Método | Resultado |
|---|---|---:|
| Backend funcional | RF locales verificados: solo `/health`, de 8 RF | 12,5 % (1/8) |
| Frontend | Pantallas obligatorias terminadas y probadas, de 13 | 0 % (0/13) |
| Seguridad | Categorías OWASP completas con controles y evidencias, de 10 | 0 % (0/10) |
| Producción | Despliegue público HTTPS verificado | 0 % (0/1) |
| Índice global estricto | Unidades completas en las cuatro filas anteriores: 1 de 32 | **3,1 %** |

El índice excluye avances parciales como las utilidades criptográficas, la investigación y el modelo de amenazas; no significa que esos trabajos no existan. Tampoco equivale a la rúbrica, que usa ponderaciones diferentes.

## 3. Estado funcional

| Requisito | Backend y BD | Interfaz y prueba | Estado |
|---|---|---|---|
| RF-01 Registro | Tabla `users` y utilidad bcrypt; no existe registro, política de contraseñas ni validación de formulario | No hay pantalla ni prueba de registro | No implementado |
| RF-02 Inicio/cierre | No hay rutas, sesiones persistentes, expiración, CSRF ni rate limiting aplicados | No hay pantalla ni prueba de sesión | No implementado |
| RF-03 Roles | Columna `role`; no hay middlewares ni comprobaciones de rol | No hay pruebas de autorización | No implementado |
| RF-04 Notas | Tabla y utilidades AES; no existe CRUD ni filtro por propietario en consultas de negocio | No hay pantallas ni pruebas IDOR | No implementado |
| RF-05 Perfil | Tabla y utilidad AES; no existe lectura, edición, enmascaramiento ni revelación | No hay pantalla ni prueba | No implementado |
| RF-06 Recuperación | Tabla, generación y hash de token como utilidades; no hay flujo, expiración/uso único aplicados, correo ni revocación | No hay pantalla ni prueba de flujo | No implementado |
| RF-07 Administración | Tabla de eventos y utilidad HMAC; no existe panel, filtros, cambios de rol ni auditoría integrada | No hay pantalla ni prueba | No implementado |
| RF-08 Salud | `GET /health` usa `database.authenticate()`; respuesta mínima y 503 si falla | `tests/unit/app.test.js`; consulta HTTP local 200 | Implementado y verificado localmente; producción pendiente |

No existen modelos Sequelize, repositorios, rutas o controladores separados, seeders, vistas EJS ni assets. Su ausencia se verificó en el árbol local; las tablas no sustituyen la lógica de la aplicación.

## 4. OWASP Top 10:2025

Las pruebas citadas se refieren a capacidades parciales, no a cumplimiento integral. Cuando no se cita evidencia, la verificación está pendiente.

| Categoría | Medidas y evidencia actuales | Deficiencia, riesgo y corrección | Estado |
|---|---|---|---|
| A01 Broken Access Control | No hay rutas privadas; `src/app.js` responde 404 a rutas inexistentes. | Faltan autenticación, roles, propiedad por consulta, CSRF y pruebas de IDOR; no se ha probado acceso privado. Implementar denegación por defecto y pruebas A/B. | Pendiente |
| A02 Security Misconfiguration | Helmet, CSP, `X-Powered-By` desactivado; `/health` probado en `tests/unit/app.test.js`. CSP real restringe scripts a `self`; permite `unsafe-inline` para estilos. | No hay despliegue, configuración validada de proxy, CORS aplicable ni informe de cabeceras externo. `NODE_ENV=production` es rechazado. | Parcial |
| A03 Software Supply Chain Failures | `package-lock.json` local, `npm audit` y scripts de lint. | Lockfile sin seguimiento; no existen CI ni Dependabot. Auditoría detecta dos moderadas transitivas. Revisar dependencias y crear controles de cadena de suministro. | Parcial |
| A04 Cryptographic Failures | `src/lib/password.js` usa bcrypt costo 12; `src/lib/crypto.js` usa AES-256-GCM y AAD; pruebas unitarias pasan. | No están integrados con registro, notas ni perfil; no hay gestión completa de llaves, TLS ni cookies seguras en producción. | Parcial |
| A05 Injection | `express.json` limita carga; `src/config/env.js` usa Zod; consultas existentes del ejecutor son fijas y parametrizadas donde hay valores. | No hay validadores de entradas de negocio, vistas EJS ni pruebas SQLi/XSS de la aplicación. | Parcial |
| A06 Insecure Design | `docs/threat-model.md` incluye STRIDE, DFD, amenazas y límites propuestos. | Varias mitigaciones se presentan como implementadas aunque faltan; límites de negocio no se aplican ni prueban. Actualizar amenazas y validar controles. | Parcial |
| A07 Authentication Failures | bcrypt probado con datos sintéticos. | No existe login, bloqueo, rate limiting, renovación ni expiración de sesión; no hay prueba 429. | Pendiente |
| A08 Software or Data Integrity Failures | HMAC y detección de una modificación probados en unidad; lockfile existe localmente. | No hay registro firmado integrado, CI, Gitleaks, control de despliegue ni comprobación de integridad de recursos. Una firma por fila no detecta por sí sola eliminación de registros. | Parcial |
| A09 Security Logging and Alerting Failures | Pino se usa para arranque y fallos generales en `src/server.js`. | Faltan correlación, redacción probada, eventos de login/acceso/rol, bitácora y alertas. | Pendiente |
| A10 Mishandling of Exceptional Conditions | `/health` devuelve 503 genérico ante fallo simulado, hay errores genéricos y cierre básico con señales; tests unitarios. | Faltan pruebas de errores reales, timeouts para todas las dependencias y verificación operativa del apagado y reinicio en producción. | Parcial |

## 5. Criptografía y secretos

- **Contraseñas:** bcrypt costo 12 con sal propia y prueba de rechazo a más de 72 bytes. No hay usuarios creados por la aplicación ni comprobación funcional de registro/login. Argon2 no está instalado por decisión posterior del usuario.
- **AES-256-GCM:** la utilidad exige llave de 32 bytes, IV aleatorio de 12 y etiqueta de 16; `noteAAD` vincula dueño, nota y campo. Las pruebas sintéticas verifican descifrado, diferencia de IV y rechazo de modificaciones/contextos incorrectos. El azar reduce el riesgo de colisión, pero una prueba de dos IV no demuestra unicidad absoluta.
- **Tokens:** `randomBytes(32)` y SHA-256 probados como utilidades. No existe el flujo de recuperación, la expiración aplicada ni el consumo único.
- **HMAC:** `signEvent` y `verifyEvent` prueban alteraciones; ninguna ruta los aplica a eventos reales. No se valida que la llave HMAC y la de cifrado sean distintas, y `JSON.stringify` sobre metadatos arbitrarios no garantiza una representación canónica independiente del orden de propiedades.
- **Llaves:** no hay carga/validación de llaves en el arranque, gestión de versiones funcional ni rotación. El prefijo fijo `v1` del formato no constituye rotación de llaves.
- **Secretos:** `.env` y `.env.app` están ignorados. La aplicación local usa una cuenta con permisos DML limitados, pero la credencial administrativa sigue presente en la configuración local para tareas de administración. `compose.yaml` y `scripts/mysql-init.sql` contienen credenciales de desarrollo predeterminadas y están sin seguimiento; no deben usarse ni añadirse tal como están. Revisar y sustituirlas antes de compartir o ejecutar Compose. Se inspeccionaron nombres de archivos del historial, no se ejecutó un escaneo completo del contenido histórico: no puede afirmarse ausencia total de secretos.

## 6. Frontend y experiencia de usuario

No hay `src/views/`, `src/public/`, HTML, CSS ni formularios. La ruta `/` devuelve JSON de estado de desarrollo. Por ello login, registro, recuperación, dashboard, notas, perfil, administración, tablas, sidebar, modales, validaciones visuales, responsive, accesibilidad, fuentes e iconos están **no implementados**. No procede afirmar que se hayan probado navegación, botones o anchos 390/768/1440 px. No se detectaron métricas ficticias en una interfaz porque no existe interfaz.

## 7. Producción, infraestructura y DevOps

| Elemento | Evidencia | Estado |
|---|---|---|
| Dockerfile / usuario no root | No existe Dockerfile | Pendiente |
| Compose | Archivo local sin seguimiento, con secretos de desarrollo fijos; daemon Docker inaccesible o apagado | No probado; corregir antes de usar |
| GitHub Actions, Dependabot, Gitleaks | No existe `.github/` | Pendiente |
| MySQL y migraciones | Dos migraciones y registro local; prueba de estructura en base independiente; cuenta de aplicación local DML | Parcial; faltan pruebas automatizadas de migración desde base vacía y de fallo/reanudación |
| Configuración de producción | `src/config/env.js` rechaza `production`; servidor escucha en `127.0.0.1` | No preparada |
| HTTPS, TLS MySQL, cookies y proxy | No hay despliegue ni sesiones implementadas | No verificables |
| Healthcheck / reinicio | `/health` local y manejo básico de señales | Sin validación en contenedor/plataforma |
| URL y evidencias externas | No se ha identificado URL pública verificada | Pendiente y requiere autorización para desplegar |

La investigación y el ADR citan TiDB como alternativa, pero TiDB es un motor compatible con el protocolo MySQL, no MySQL; la propuesta contradice la regla del proyecto de usar exclusivamente MySQL. [Documentación de arquitectura de TiDB](https://docs.pingcap.com/tidbcloud/tidb-architecture/). La tabla de Fly.io también requiere actualización: su documentación actual describe una prueba con límites de tiempo y recursos, no la franquicia permanente afirmada en el informe. [Prueba de Fly.io](https://fly.io/docs/about/free-trial/). Railway indica que el plan Free detiene servicios cuando se consume el crédito mensual; no se debe asumir disponibilidad continua. [Plan Free de Railway](https://docs.railway.com/pricing/free-plan).

## 8. Pruebas ejecutadas

| Comprobación | Resultado real | Alcance |
|---|---|---|
| `npm run lint` | Aprobó | Configuración actual con reglas `no-undef` y `no-unused-vars`; no es una auditoría completa de estilo/seguridad. |
| `npm run format:check` | Aprobó | Archivos incluidos en el script. |
| `npm test` y `npm run test:unit` | 7/7 en cada ejecución | Ambos ejecutan únicamente la misma suite unitaria; no son 14 pruebas diferentes. |
| `npm run test:integration` | Falló | Faltan variables `TEST_DB_*` en la configuración normal. |
| Prueba de integración con variables temporales | 1/1 aprobó | Se usó la base independiente `securevault_test_db` y credenciales administrativas existentes, sin imprimirlas. Revisa tablas, historial y dos relaciones; no valida registro, notas ni seguridad de extremo a extremo. |
| `npm audit --audit-level=high` | Código de salida 0 para ese umbral | 0 altas/críticas y 2 moderadas transitivas asociadas con Sequelize/uuid; el informe no está limpio. |
| `GET http://127.0.0.1:3001/health` | HTTP 200, `{"status":"ok"}` | Verificación local. La prueba de 503 usa un sustituto de BD; no se detuvo MySQL. |
| `test:security` y `check:release` | No existen scripts | `--if-present` no ejecuta pruebas; no debe contarse como aprobación. |
| Docker / escaneos externos | No ejecutados | Docker daemon no disponible; no hay URL autorizada para ZAP, Security Headers ni SSL Labs. |

Las pruebas automatizadas no incluyen ataques de IDOR, CSRF, fuerza bruta, inyección ni XSS contra funcionalidades reales. No se ejecutaron pruebas destructivas ni se verificó el historial completo con Gitleaks.

## 9. Entregables y bonificaciones

| Entregable | Estado |
|---|---|
| Repositorio Git e historial | Existe localmente; el código y lockfile están sin seguimiento. Acceso remoto del docente no comprobado. |
| README | Existe; no puede explicar una aplicación completa ni un despliegue que aún no existen. |
| Deep Research | Existe con referencias y comparación; necesita corregir Fly.io y alternativa TiDB, contrastar el resto y preparar el formato académico solicitado. |
| Modelo de amenazas y diagramas | Existen, pero mezclan controles planeados con controles implementados. |
| Matriz de requisitos | Existe; necesita mantenerse alineada con evidencias reales y el cambio a bcrypt. |
| Informe de seguridad final | No existe `docs/informe-seguridad.md`; este informe no sustituye evidencias finales. |
| Evidencias | No hay `docs/evidence/` con resultados completos y sanitizados. |
| URL de producción | No verificada. |
| Guion de demostración / checklist | No existen `docs/demo.md` ni checklist final operativa. |
| MFA TOTP, rotación, Docker no root, Gitleaks, alertas externas | No implementados ni verificados; **0 bonificaciones verificables**. |

## 10. Estimación de la rúbrica

Estimación orientativa y conservadora, no calificación del docente. La rúbrica no aporta reglas para asignar puntos parciales exactos; los valores siguientes son juicio del auditor y pueden variar considerablemente.

| Criterio | Máximo | Estimación | Justificación |
|---|---:|---:|---|
| Deep Research | 10 | 6 | Documento y fuentes existen; hay datos y una alternativa que requieren corrección y validación. |
| Funcionalidad | 10 | 0 | RF-01 a RF-07 no existen y ninguno está verificado en producción, como exige la rúbrica. |
| OWASP | 30 | 2 | Modelo de amenazas y cabeceras locales parciales; no hay diez categorías con controles y evidencias completos. |
| Hash y cifrado | 20 | 5 | Utilidades bcrypt/AES/HMAC verificadas en unidad; sin integración, gestión de llaves ni evidencias de datos persistidos. |
| Despliegue | 20 | 0 | No hay URL de producción verificada. |
| Informe y demostración | 10 | 1 | Hay documentación inicial, sin informe final de seguridad ni demostración. |
| **Total** | **100** | **14/100** | Estimación no oficial, sujeta a revisión del profesor. |
| Bonificaciones | 10 | 0 | Ninguna de las mejoras bonificables está implementada y verificada. |

## 11. Hallazgos y trabajo pendiente por prioridad

### P0 — Obligatorio y bloqueante

1. Implementar autenticación, sesiones persistentes, CSRF, validación y controles de acceso; actualmente no existe protección de recursos privados porque estos tampoco existen.
2. Implementar RF-01 a RF-07 con pruebas reales sobre `securevault_test_db`; integrar las utilidades criptográficas con datos persistidos y control de propiedad.
3. Retirar credenciales fijas de `compose.yaml` y `scripts/mysql-init.sql` antes de utilizarlos o versionarlos; conservar secretos fuera de Git y escanear el historial.
4. Preparar configuración de producción con HTTPS, TLS de MySQL y `trust proxy` ajustado a la topología real; hoy `production` se rechaza deliberadamente.
5. Mantener el código, migraciones y lockfile en Git mediante un flujo revisable; actualmente están sin seguimiento.

### P1 — Obligatorio para la entrega

1. Crear pruebas de seguridad para IDOR, CSRF, autenticación, 429, XSS, inyección, registros, cookies, recuperación e invalidación de sesiones.
2. Crear Dockerfile, pipeline con MySQL aislado, Dependabot, Gitleaks y `check:release`; revisar las dos alertas moderadas sin aplicar cambios incompatibles a ciegas.
3. Corregir investigación, ADR, matriz y modelo de amenazas; retirar TiDB como sustituto del motor MySQL y verificar precios con fuentes oficiales.
4. Preparar README completo, informe OWASP, evidencias sanitizadas, demostración, checklist y credenciales de evaluación por canal privado.
5. Obtener autorización para publicar y, tras el despliegue, ejecutar ZAP, Security Headers, SSL Labs y pruebas funcionales autorizadas.

### P2 — Calidad y operación

1. Separar cuentas y configuración de integración/migraciones para que `npm run test:integration` funcione sin usar credenciales administrativas de la aplicación.
2. Fortalecer el ejecutor de migraciones: exclusión concurrente, controles de historial, integridad y recuperación documentada ante DDL parcialmente aplicado; añadir pruebas con base de pruebas.
3. Evitar que documentación describa mitigaciones planificadas como si ya se hubieran implementado; revisar las reglas de ESLint y cobertura.
4. Verificar permisos mínimos de todos los servicios, salud, timeout, cierre y reinicio bajo condiciones reales en entorno propio.

### P3 — Bonificación

MFA TOTP, rotación real de llaves, Docker no root, Gitleaks y alertas externas autorizadas. Ninguna debe adelantarse a los RF obligatorios.

## 12. Plan de finalización

Cada fase debe terminar con código integrado, documentación y pruebas aprobadas antes de iniciar la siguiente.

| Fase | Objetivo y archivos previstos | Dependencias | Pruebas y aceptación |
|---|---|---|---|
| 1. Base segura | `compose.yaml`, `scripts/`, `migrations/`, `src/config/`, `tests/integration/`: credenciales de desarrollo, cuentas, migraciones e integración reproducible. | MySQL local y base de pruebas independiente. | Migraciones en base vacía de pruebas, repetición, fallo controlado, permisos mínimos; no tocar datos existentes. |
| 2. Autenticación | `src/models/`, `repositories/`, `services/`, `controllers/`, `routes/`, `middlewares/`, `validators/`, vistas auth y tests. | Fase 1, configuración de sesión y secretos. | Registro, login, logout, sesiones, CSRF, límites y mensajes genéricos con datos sintéticos; bcrypt costo 12 y límite de bytes explicado. |
| 3. Notas y perfil | Módulos y vistas de `notes` y `profile`, `src/lib/crypto.js`, tests. | Fase 2, llaves de cifrado y AAD. | CRUD, cifrado real en BD, aislamiento A/B incluyendo admin, enmascaramiento, validaciones y pruebas XSS/IDOR. |
| 4. Recuperación y administración | Servicios, mailer, controladores, rutas y vistas auth/admin; auditoría y tests. | Fases 2–3, entorno de correo controlado. | Token con expiración/uso único, revocación, roles, filtros, HMAC de eventos y alertas; sin secretos en logs. |
| 5. UI y hardening | `src/views/`, `src/public/`, configuración de seguridad y tests. | Flujos reales de fases 2–4. | Navegación y formularios conectados, accesibilidad y visualización en tres tamaños; pruebas de las diez categorías. |
| 6. Entrega y producción | Dockerfile, CI, Dependabot, Gitleaks, `docs/`, README y automatización de release. | Fases anteriores aprobadas y elección de MySQL gestionado compatible. | Construcción, CI, auditorías, informe, demo; solicitar autorización antes de la publicación. |
| 7. Verificación pública | Configuración de plataforma y `docs/evidence/`. | Despliegue explícitamente autorizado. | HTTPS, cookies, `/health`, ZAP, Security Headers, SSL Labs y pruebas autorizadas con evidencias reales. |

**Prompts adicionales:** no existe un número técnico fijo. El usuario ya expresó interés en generar los faltantes, pero este documento exige entregar primero la auditoría y el plan; una instrucción posterior para ejecutar el plan puede abarcar las fases locales. La publicación requiere autorización explícita separada conforme a las reglas del proyecto. No se han implementado correcciones durante esta auditoría.
