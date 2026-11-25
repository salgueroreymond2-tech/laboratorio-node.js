-- Bases separadas para desarrollo y pruebas; se ejecuta solo en un volumen nuevo.
CREATE DATABASE IF NOT EXISTS securevault_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS securevault_test_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Las cuentas y sus contraseñas se crean en 02-users.sh desde variables de entorno.
