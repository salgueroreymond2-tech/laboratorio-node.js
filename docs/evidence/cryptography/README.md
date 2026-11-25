# Evidencia criptográfica

- **ID:** EV-CRYPTO-LOCAL; **requisitos:** A04, A08; **fecha:** 2026-11-25; **entorno:** Node.js local, datos sintéticos.
- **Método:** `npm run test:unit` y `npm run test:security`; archivos `tests/unit/crypto.test.js`, `tests/unit/password.test.js`, `tests/security/crypto-validation.test.js`.
- **Resultado:** verificaciones unitarias de bcrypt costo 12, límite de 72 bytes UTF-8, AES-GCM, AAD, rechazo de alteración, token aleatorio y HMAC aprobadas. **Estado:** parcial; no están integrados en flujos de usuarios, notas, recuperación ni bitácora.
- La prueba de IV no demuestra unicidad absoluta; el prefijo `v1` no es rotación de llaves. La independencia de llaves no está validada.
