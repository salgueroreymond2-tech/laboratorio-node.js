#!/bin/sh
# MySQL ejecuta este archivo solo al inicializar un volumen vacío.
# Las contraseñas se limitan a caracteres seguros antes de interpolarlas en SQL.
sv_validate_password() {
  value=$1
  [ "${#value}" -ge 24 ] || return 1
  case "$value" in *[!A-Za-z0-9_-]*|'') return 1 ;; esac
}
for value in "${MYSQL_ROOT_PASSWORD:-}" "${SV_APP_PASSWORD:-}" "${SV_MIGRATOR_PASSWORD:-}" "${SV_TEST_PASSWORD:-}"; do
  if ! sv_validate_password "$value"; then
    echo 'Las contraseñas MySQL deben tener al menos 24 caracteres ASCII alfanuméricos, guion o guion bajo.' >&2
    exit 1
  fi
done

MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql --protocol=socket --user=root <<SQL
CREATE USER IF NOT EXISTS 'sv_app'@'%' IDENTIFIED BY '$SV_APP_PASSWORD';
GRANT SELECT, INSERT, UPDATE, DELETE ON securevault_db.* TO 'sv_app'@'%';
CREATE USER IF NOT EXISTS 'sv_migrator'@'%' IDENTIFIED BY '$SV_MIGRATOR_PASSWORD';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, REFERENCES ON securevault_db.* TO 'sv_migrator'@'%';
CREATE USER IF NOT EXISTS 'sv_test'@'%' IDENTIFIED BY '$SV_TEST_PASSWORD';
GRANT ALL PRIVILEGES ON securevault_test_db.* TO 'sv_test'@'%';
SQL
