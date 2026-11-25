# AGENTS.md — Reglas Permanentes de SecureVault

Este documento define las reglas obligatorias de arquitectura, seguridad, calidad y operación que todo desarrollador o agente debe respetar al trabajar en **SecureVault**.

## 1. Base de datos única y reglas de persistencia
- **Motor exclusivo:** MySQL (`securevault_db`) con el driver `mysql2` y ORM `Sequelize`.
- **Prohibido sustituir MySQL** por PostgreSQL, MongoDB, SQLite, Firebase o Supabase.
- **Migraciones obligatorias:** Todo cambio de esquema debe hacerse mediante migraciones versionadas en `migrations/`. Queda prohibido usar `sequelize.sync({ force: true })` o `sequelize.sync({ alter: true })` en producción.
- **Consultas seguras:** Todas las consultas deben usar parámetros vinculados / métodos seguros de Sequelize; nunca interpolar entradas de usuario en SQL.
- **Privilegios mínimos:** El usuario de aplicación en MySQL debe contar únicamente con los permisos DML necesarios (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) sobre `securevault_db`, sin privilegios administrativos globales ni DDL en tiempo de ejecución.

## 2. Seguridad por defecto (OWASP Top 10:2025)
- **Denegación por defecto:** Toda ruta protegida debe pasar por `requireAuth`, y cuando aplique, por `requireRole` y `requireOwnership`.
- **Anti-IDOR:** Toda operación sobre notas o recursos privados debe validar explícitamente la propiedad (`owner_id === req.session.userId`). Un administrador **no** tiene acceso automático a notas privadas de otros usuarios.
- **Protección CSRF:** Toda petición mutadora (`POST`, `PUT`, `PATCH`, `DELETE`) debe validar token CSRF vigente (`csrf-csrf`).
- **Validación estricta:** Todas las entradas externas (formularios, parámetros, queries) deben validarse con esquemas `Zod` y listas blancas de campos permitidos.
- **Cabeceras y cookies:** Usar `helmet` con CSP estricta sin `unsafe-inline` en scripts, desactivar `X-Powered-By`, y emitir cookies con `HttpOnly`, `SameSite=Lax` (o `Strict`) y `Secure` en producción.
- **Fail closed:** Ante fallos críticos de configuración o seguridad, el sistema debe abortar o denegar acceso, nunca degradar a un estado inseguro.

## 3. Estándares criptográficos y prohibiciones
- **Contraseñas:** Hash con `bcrypt` y factor de costo mínimo 12. Rechazar entradas de más de 72 bytes UTF-8 para evitar el truncamiento silencioso de bcrypt.
- **Datos sensibles (notas, teléfono, secretos MFA):** Cifrado autenticado `AES-256-GCM` centralizado en `src/lib/crypto.js`, con llave de 32 bytes, IV aleatorio único de 12 bytes por operación, tag de 16 bytes, versionado (`v1.iv.tag.ciphertext`) y AAD contextual cuando corresponda.
- **Tokens de recuperación:** Almacenar únicamente el hash `SHA-256` del token generado con `crypto.randomBytes(32)`.
- **Integridad de eventos:** Firmar registros de `security_events` con `HMAC-SHA256` usando una llave independiente de la llave de cifrado.
- **Prohibiciones absolutas:**
  - Nunca subir `.env`, llaves, contraseñas reales ni tokens a Git.
  - Nunca usar MD5, SHA-1, SHA-256 para contraseñas, AES-ECB, `crypto.createCipher()`, IVs reutilizados ni `Math.random()` para tokens.
  - Nunca registrar contraseñas, tokens, cookies, llaves ni texto plano descifrado en logs.

## 4. Arquitectura modular
- Mantener la separación de responsabilidades en `src/`: `config/`, `routes/`, `middlewares/`, `validators/`, `controllers/`, `services/`, `repositories/`, `models/`, `lib/`, `views/`, `public/`.
- No incluir lógica de negocio ni acceso directo a base de datos en vistas EJS ni en archivos de rutas.
- Mantener el monolito modular; evitar microservicios o frameworks frontend SPA innecesarios.

## 5. Pruebas, calidad y flujo de trabajo
- **ES Modules** (`"type": "module"`) en Node.js LTS.
- Todo código nuevo debe cumplir `ESLint` y `Prettier`.
- Toda funcionalidad vertical debe incluir pruebas en `tests/` (unitarias, integración y/o seguridad) ejecutadas contra una base de datos MySQL de pruebas independiente (nunca sobre producción).
- Realizar commits pequeños, frecuentes y descriptivos; verificar siempre `git status` y `npm audit` antes de considerar una tarea cerrada.
- No declarar ninguna funcionalidad como verificada sin haber ejecutado y comprobado sus pruebas reales.
- Solicitar autorización explícita antes de desplegar a producción, modificar infraestructura externa o ejecutar operaciones destructivas.
