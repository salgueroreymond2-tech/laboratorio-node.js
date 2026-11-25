# Integración del frontend — PR07

| Pantalla o función | Estado e integración |
| --- | --- |
| Inicio público | Implementado en `/inicio` y para navegadores en `/`; EJS con datos del propio proyecto. |
| Estado del servicio | Consulta real GET `/health`; informa disponibilidad o error. No consulta ni muestra información privada. |
| Error 404 | Vista HTML para navegadores y respuesta JSON para clientes API. |
| Inicio de sesión, registro y cierre | Integrados localmente con sesiones MySQL y protección CSRF; ver [AUTH_LOCAL.md](AUTH_LOCAL.md). La recuperación está preparada, pero no se ha configurado SMTP real. |
| Cuenta y CRUD de notas | Implementados localmente: creación, listado paginado, lectura, edición y eliminación de notas cifradas con control de propiedad. Ver [NOTAS_LOCALES.md](NOTAS_LOCALES.md). |
| Perfil y seguridad de cuenta | Perfil local con teléfono cifrado, revelación autorizada y cambio de contraseña que invalida otras sesiones. |
| Administración, bitácora y alertas | Panel local con autorización por rol, listado de usuarios, cambios de rol y eventos firmados. Alertas y búsquedas administrativas siguen pendientes. |

El diseño evita formularios desconectados y cifras ficticias. La funcionalidad local requiere verificación adicional en producción antes de presentarse como servicio público.
