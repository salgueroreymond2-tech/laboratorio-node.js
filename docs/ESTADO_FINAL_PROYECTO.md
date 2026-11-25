# Estado final de revisión — SecureVault

## Actualización PR08 — 25 de noviembre de 2026

**Estado vigente: BLOQUEADO; requiere intervención y verificación externa.** En local funcionan registro, acceso, notas cifradas, perfil, cambio de contraseña, panel administrativo, listado de usuarios, cambios de rol y eventos firmados. Hay dos cuentas sintéticas locales verificadas. La recuperación se probó con correo simulado y está deshabilitada sin SMTP real.

Se prepararon un Dockerfile no root, configuración para producción con cookies seguras y TLS MySQL, migración supervisada y cuentas de demostración idempotentes. La imagen Docker, CI remota, MySQL/TLS de producción y HTTPS no se han probado. Se detectó Railway CLI, pero no se han verificado identidad, proyecto ni servicios y no existe URL pública verificada. Quedan pendientes la publicación autorizada, pruebas externas, correo real, búsqueda de notas y controles administrativos adicionales. Ver [preparación de producción](DEPLOY_PRODUCCION.md) y [ficha del profesor](ENTREGA_PROFESOR.md).

Verificaciones locales de esta revisión: 10 pruebas unitarias, 8 de seguridad y 9 de integración en MySQL aislado; lint y formato aprobados. La repetición de migraciones de prueba fue idempotente y se verificó una instalación limpia de dependencias de producción. La auditoría npm informó dos vulnerabilidades moderadas y ninguna alta o crítica. La construcción Docker y los servicios externos no se probaron. La estimación académica actual es [orientativa y no oficial](EVALUACION_FINAL.md).

Las secciones siguientes conservan una **revisión histórica anterior a PR08**; cuando difieran, prevalece esta actualización.

> Actualización de notas: el CRUD local cifrado y su prueba de integración ya están disponibles. Continúan pendientes otros requisitos funcionales, la auditoría completa y el despliegue.

> Actualización posterior: se implementaron registro e inicio y cierre de sesión locales. Los demás módulos y verificaciones siguen pendientes; ver [AUTH_LOCAL.md](AUTH_LOCAL.md). Las descripciones y resultados inferiores conservan el estado de la revisión anterior.

**Estado: BLOQUEADO POR REQUISITOS OBLIGATORIOS**
**Fecha:** 25 de noviembre de 2026. Este informe describe el workspace local; no acredita publicación ni entrega completa.

## Resumen ejecutivo

El proyecto dispone de conexión MySQL local, endpoint de salud, migraciones, utilidades criptográficas, pruebas parciales y una página pública de estado añadida en PR07. No existen registro, autenticación, notas, perfil, recuperación ni administración. La configuración rechaza el modo de producción y no hay URL pública verificada. No se recomienda entregar el sistema como terminado.

## Ubicaciones y entorno

- **Aplicación pública y `/health` público:** pendientes.
- **Repositorio configurado:** https://github.com/salgueroreymond2-tech/laboratorio-node.js.git; acceso del profesor no verificado. Gran parte de los archivos del workspace no tiene seguimiento en Git.
- **Local:** `/health` respondió HTTP 200 en `127.0.0.1:3001` durante esta revisión; no sustituye una URL de producción.
- **Backend:** parcial; rutas de negocio y autenticación pendientes. **Frontend:** página pública de estado y error, sin pantallas de negocio; ver [PR07](PR07_FRONTEND.md).
- **MySQL:** conexión local y esquema existentes; integración de prueba de lectura aprobada contra `securevault_test_db`. No se verificaron notas, sesiones o datos persistidos por funcionalidades.
- **Producción:** no desplegada. Docker daemon no disponible; CI no ejecutada en GitHub.

## Seguridad y pruebas

Ninguna de las diez categorías OWASP cuenta aún con todos sus controles y evidencias. bcrypt costo 12, AES-256-GCM, tokens y HMAC tienen pruebas unitarias, pero no están integrados con la aplicación. La gestión y rotación de llaves, TLS y cookies siguen pendientes. Ver [informe de seguridad](informe-seguridad.md) y [evidencias](evidence/README.md).

| Verificación                   | Resultado                          | Alcance                                                                  |
| ------------------------------ | ---------------------------------- | ------------------------------------------------------------------------ |
| `npm ci`                       | Aprobado                           | Copia temporal; no se reemplazó `node_modules` del proyecto.             |
| `npm run lint`, `format:check` | Aprobados                          | Reglas y archivos configurados.                                          |
| `npm test`, `test:unit`        | 7/7 cada uno                       | Misma suite, contada una sola vez.                                       |
| `test:security`                | 7/7                                | Incluye dos pruebas sintéticas del script MySQL, con cliente simulado.   |
| `test:integration`             | 1/1                                | Base de pruebas local con variables temporales; solo lectura de esquema. |
| **Total distinto**             | **15/15 aprobadas**                | No demuestra RF-01 a RF-07 ni producción.                                |
| `npm audit --audit-level=high` | 0 altas/críticas; 2 moderadas      | El umbral no significa ausencia total de vulnerabilidades.               |
| `check:release`                | Falló intencionalmente             | Falta aplicación y despliegue completos.                                 |
| Compose / shell                | Configuración y sintaxis aprobadas | Docker no pudo arrancarse; no se modificaron bases existentes.           |

## Cambios de esta revisión

- **Creados:** `scripts/mysql-init-users.sh`, `scripts/export-research.js`, `tests/security/mysql-init.test.js`, `docs/deep-research.pdf`, `docs/demo.md`, `docs/PREGUNTAS_DEFENSA.md`, `docs/CHECKLIST_ENTREGA.md`, `docs/EVALUACION_FINAL.md`, `docs/ENTREGA_PROFESOR.md` y este documento.
- **Modificados:** `compose.yaml`, `scripts/mysql-init.sql`, `.env.example`, `package.json`, `eslint.config.js`, `README.md`, `docs/deep-research.md`, `docs/informe-seguridad.md`, `docs/DEPLOY_PRODUCCION.md`, `docs/PR05_AUDITORIA_SEGURIDAD.md`, `docs/AUDITORIA_FINAL_SECUREVAULT.md`, `docs/evidence/audit/README.md`, `docs/matriz-requisitos.md` y `docs/progreso.md`.
- **Corrección:** se retiraron contraseñas de desarrollo predeterminadas y se exige configuración externa validada para inicialización nueva. No se rotaron contraseñas ni se tocaron volúmenes existentes. Falta prueba real dentro de Docker.
- **Entregables preparados:** investigación actualizada, PDF de dos páginas e informe de seguridad y documentos académicos en estado de borrador. La revisión visual final del PDF está pendiente.

## Estimación y bonificaciones

La [estimación no oficial](EVALUACION_FINAL.md) es **14/100**, con **0/10 bonificaciones verificadas**. El índice estricto anterior es **3,1 %**, calculado como una unidad completa de 32 (RF, pantallas, categorías OWASP completas y despliegue); no mide esfuerzo ni reemplaza la rúbrica. La nota definitiva corresponde al profesor.

## Pendientes y acciones necesarias

1. Implementar y verificar RF-01 a RF-07, frontend integrado, sesiones, CSRF, control de propiedad y auditoría.
2. Probar Docker y CI, gestionar llaves, corregir o evaluar las alertas moderadas y revisar la seguridad completa.
3. Completar datos académicos, informes, evidencias, cuentas sintéticas y demostración; entregar credenciales solo mediante canal privado.
4. Obtener autorización expresa antes de crear infraestructura o publicar; después verificar HTTPS, ZAP, Security Headers y SSL Labs.
5. Revisar y versionar los archivos adecuados sin incluir secretos. No se creó tag, release, commit final ni versión `v1.0.0` porque los criterios no se cumplen.

**Conclusión:** no está listo para entregar como sistema funcional al profesor.
