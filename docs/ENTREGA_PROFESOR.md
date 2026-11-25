# Ficha de entrega — SecureVault

**Estado: borrador funcional local; publicación y evaluación final pendientes.**

- **Proyecto:** SecureVault, aplicación académica de notas privadas.
- **Repositorio configurado:** https://github.com/salgueroreymond2-tech/laboratorio-node.js.git. No se ha verificado el acceso del docente; muchos cambios locales todavía no están publicados en Git.
- **Estado de las ramas:** en la última revisión, la aplicación estaba en el PR #1 y `main` contenía solo el proyecto inicial de documentación. El despliegue registrado utilizaba ese commit anterior; no se ha confirmado que la aplicación esté publicada.
- **URL pública y `/health` público:** pendientes de despliegue y verificación. No se dispone de una URL real.
- **Prueba local:** con el servidor iniciado, abrir `http://127.0.0.1:3003/acceso` en este equipo; el puerto habitual configurado puede diferir al reiniciar. El acceso local no es una URL pública.
- **Cuentas:** existen dos cuentas sintéticas locales, una de usuario y otra administrativa. Sus credenciales se conservan en archivos privados fuera de Git y deben entregarse por un canal privado, nunca dentro de este documento. No se han creado cuentas de producción.
- **Disponible localmente:** registro, inicio y cierre de sesión, notas cifradas, perfil, cambio de contraseña, panel administrativo, listado de usuarios, cambios de rol y eventos de acceso firmados. El administrador no tiene acceso automático a notas ajenas.
- **Recuperación por correo:** implementada y probada con un proveedor simulado; el envío real está deshabilitado hasta configurar y probar un proveedor. La aplicación admite SMTP, pero los planes Free, Trial y Hobby de Railway lo bloquean y todavía no hay integración de correo por API HTTPS.
- **Tecnologías:** Node.js, Express, EJS, Sequelize, MySQL, bcrypt y AES-256-GCM.
- **Seguridad:** sesiones en MySQL, cookies `HttpOnly` y `SameSite`, CSRF, validación, control de propiedad, límites de acceso y firmas HMAC de eventos seleccionados. Las cookies `Secure` se han probado con proxy simulado; HTTPS y TLS hacia MySQL no se han verificado en un despliegue real.
- **Pruebas locales:** 10 unitarias, 8 de seguridad y 9 de integración aprobadas. npm audit informó dos alertas moderadas; no hay comprobaciones externas verificadas.
- **Documentos:** [investigación](deep-research.md), [informe de seguridad](informe-seguridad.md), [matriz](matriz-requisitos.md), [evidencias](evidence/README.md), [demostración](demo.md) y [estado](ESTADO_FINAL_PROYECTO.md).
- **Datos académicos:** integrantes, asignatura y docente pendientes de completar por el equipo.

No se recomienda presentar esta ficha como evidencia de una aplicación pública hasta que la URL, HTTPS, MySQL y los flujos sean verificados externamente.
