# Auditoría de dependencias y secretos

**Actualización PR06:** los valores predeterminados identificados en la revisión manual se retiraron de Compose y del SQL de inicialización. Se verificaron sintaxis y comportamiento con datos sintéticos; no se arrancó Docker ni se rotaron contraseñas de volúmenes o cuentas existentes. Gitleaks volvió a revisar los archivos modificados sin detecciones; esto no prueba ausencia total de secretos.

- **ID:** EV-AUDIT-20261125; **requisitos:** A03, A04; **fecha:** 2026-11-25; **entorno:** Node.js local.
- **Método:** `npm audit --audit-level=high` y Gitleaks 8.30.1 con redacción completa. Su archivo se verificó mediante SHA-256 publicado por el proyecto.
- **Resultado npm:** cero altas/críticas; dos moderadas transitivas relacionadas con Sequelize/uuid. Código 0 con el umbral `high` no significa ausencia de vulnerabilidades.
- **Resultado Gitleaks:** siete commits en referencias locales escaneados sin detecciones; escaneos separados de `src/`, `scripts/`, `.github/`, `docs/`, `tests/`, `migrations/` y `compose.yaml` sin detecciones. **Limitación importante:** la revisión manual sí identificó contraseñas de desarrollo codificadas en Compose y `scripts/mysql-init.sql`; el escáner no las detectó. Se mantienen bloqueadas para uso/versionado hasta corregirlas.
- `.env` y `.env.app` están ignorados; no se imprimieron ni copiaron sus valores. No se exploraron todas las cuentas, remotos ni entornos externos. **Estado:** parcial.
