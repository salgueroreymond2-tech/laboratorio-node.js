# ADR-0001: Uso exclusivo de MySQL con Sequelize y mysql2

- **Estado:** Aceptado (Fase 1 — Diseño)
- **Fecha:** 2026-11-25
- **Contexto:** El documento académico sugiere PostgreSQL (Prisma/Knex/pg) o MongoDB (Mongoose), permitiendo explícitamente justificar alternativas tecnológicas. Adicionalmente, los lineamientos técnicos del proyecto exigen **MySQL (`securevault_db`)** con ORM **Sequelize**, driver **mysql2**, migraciones versionadas y usuario de aplicación con privilegios mínimos.

## Decisión
Utilizar **MySQL 8.x** como único motor de base de datos relacional (`securevault_db`), operado mediante **Sequelize ORM** sobre **mysql2**, junto con **`express-mysql-session`** para persistencia de sesiones en servidor.

## Justificación técnica y académica
1. **Integridad referencial estricta:** SecureVault modela relaciones de propiedad críticas (`users` → `notes`, `users` → `user_profiles`, `users` → `password_reset_tokens`). MySQL garantiza claves foráneas (`FOREIGN KEY`), restricciones `UNIQUE` (correo normalizado), tipos estrictos y transacciones ACID —ventaja directa frente a bases documentales sin esquema como MongoDB cuando se previene IDOR y corrupción de relaciones.
2. **Prevención de inyección SQL (OWASP A05):** Sequelize y `mysql2` utilizan consultas parametrizadas (*prepared statements* / parámetros vinculados), eliminando la concatenación de strings SQL.
3. **Ecosistema maduro de sesiones y migraciones:** `express-mysql-session` reutiliza el pool de `mysql2` para almacenar, expirar e invalidar sesiones desde el servidor (RF-02), mientras `sequelize-cli` / Umzug versionan migraciones y seeders reproducibles sin usar `sync({ force: true })` ni `sync({ alter: true })` en producción.
4. **Cifrado en tránsito y mínimo privilegio:** `mysql2` soporta conexiones TLS hacia bases gestionadas en la nube y permite separar el usuario de aplicación (solo DML sobre `securevault_db`) del usuario de migraciones.

## Consecuencias
- **Positivas:** Modelo relacional auditable, compatibilidad nativa con Railway MySQL y TiDB Cloud, y trazabilidad clara para la defensa académica.
- **Compensaciones:** Requiere mantener migraciones ordenadas en `migrations/` y disponer de un contenedor MySQL local (`compose.yaml`) para desarrollo y pruebas aisladas.
