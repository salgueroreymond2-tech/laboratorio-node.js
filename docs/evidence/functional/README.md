# Evidencia funcional

- **ID:** EV-RF08-LOCAL; **requisito:** RF-08; **fecha:** 2026-11-25; **entorno:** servidor local.
- **Método:** consulta HTTP `GET /health` y pruebas unitarias con base simulada.
- **Resultado:** HTTP 200 con `{"status":"ok"}` en local; 503 genérico ante fallo simulado. **Estado:** verificado solo en local.
- **Archivos:** `src/app.js`, `tests/unit/app.test.js`.

## Actualización PR08

Las pruebas de integración en `securevault_test_db` utilizan cuentas sintéticas y cubren acceso, notas cifradas y aislamiento, perfil, cambio de contraseña, roles, auditoría HMAC, bloqueo, recuperación con proveedor simulado y cuentas idempotentes. Las cuentas locales de demostración se comprobaron en `/acceso`, `/notas`, `/perfil` y `/admin` según su rol. Estas comprobaciones no verifican producción ni SMTP real.
