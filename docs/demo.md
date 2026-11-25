# Guion de demostración — SecureVault

La demostración actual se realiza en el equipo local. No hay URL pública ni proveedor de correo real verificados. Utilizar solo cuentas y datos sintéticos; comunicar contraseñas por un canal privado.

1. Abrir `/inicio` y `/health`; explicar que el estado corresponde al servidor y MySQL locales.
2. Iniciar sesión con la cuenta de demostración de usuario; crear una nota sintética, abrirla, editarla y eliminarla confirmando la acción.
3. Abrir el perfil, observar el teléfono enmascarado y mostrar el cambio de contraseña sin divulgar credenciales.
4. Cerrar sesión y entrar con la cuenta administradora sintética. Mostrar el panel, la lista de usuarios y los eventos firmados; explicar que el rol administrador no permite leer notas ajenas.
5. Ejecutar las pruebas disponibles y describir sus límites: la recuperación se probó con un proveedor simulado y la configuración segura de cookies con proxy simulado.
6. Señalar los pendientes: SMTP real, despliegue autorizado, conexión MySQL TLS, HTTPS público, construcción Docker, CI remota y comprobaciones externas de seguridad.

Las rutas y recursos de producción solo pueden incluirse cuando estén verificados. La [ficha de entrega](ENTREGA_PROFESOR.md) y el [informe](informe-seguridad.md) recogen el estado.
