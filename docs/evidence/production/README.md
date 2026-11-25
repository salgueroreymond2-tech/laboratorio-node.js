# Producción

- **ID:** EV-PROD-PEND; **requisito:** despliegue HTTPS; **fecha:** 2026-11-25; **entorno:** producción no disponible.
- **Método:** revisión de configuración y documentación; no se ha proporcionado ni identificado URL pública verificada.
- **Resultado:** sin calificación TLS o de cabeceras; ZAP, SSL Labs y Security Headers pendientes. **Estado:** bloqueado hasta completar la aplicación y contar con despliegue autorizado.

- **Actualización PR08:** las cookies seguras y el proxy se probaron en un servidor local simulado. No existe conexión a Railway ni verificación de MySQL/TLS, HTTPS público, Docker o CI remota. No se extrapolan los resultados locales a producción.
