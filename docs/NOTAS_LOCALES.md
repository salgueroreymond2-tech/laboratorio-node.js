# Notas privadas locales

Después de iniciar sesión, `/notas` permite crear, ver, editar y eliminar notas. La eliminación requiere confirmación. Los formularios aceptan un título de 1 a 120 caracteres y contenido de 1 a 4000 caracteres; el listado muestra hasta 100 notas por página.

El servidor valida los datos, requiere sesión y restringe las consultas por propietario, incluso para administradores. El título y el contenido se cifran con AES-256-GCM con IV aleatorio y contexto asociado a la cuenta, nota y campo. Las rutas mutadoras están protegidas por CSRF, las vistas escapan HTML y las respuestas privadas utilizan `Cache-Control: no-store`.

`NOTES_ENCRYPTION_KEY` debe ser una clave aleatoria independiente de 32 bytes expresada en 64 caracteres hexadecimales. En este equipo se guardó en `.env.app`, que está excluido de Git. **Guarda una copia de seguridad de esta clave en un lugar seguro y privado; no la compartas ni la reemplaces:** perderla impide descifrar las notas, incluso si existe una copia de la base de datos. No existe aún rotación de claves ni recuperación de notas eliminadas.

La prueba de integración usa la base aislada `securevault_test_db` y usuarios sintéticos. Comprueba el CRUD, el cifrado en MySQL, CSRF, HTML escapado, paginación y el aislamiento de otra cuenta administradora. Esto no sustituye una auditoría integral ni una implementación de producción. El servidor de desarrollo escucha solo en localhost; el modo de producción preparado aún no se ha verificado en infraestructura real.
