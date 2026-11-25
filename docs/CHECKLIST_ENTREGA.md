# Checklist de entrega académica

Fecha: 25 de noviembre de 2026. No marcar como verificado sin evidencia actual.

| Requisito                     | Estado           | Evidencia y explicación                                                                            |
| ----------------------------- | ---------------- | -------------------------------------------------------------------------------------------------- |
| .env en historial Git         | Parcial          | Gitleaks revisó siete commits locales sin detecciones; no garantiza ausencia en todos los remotos. |
| npm audit sin altas/críticas  | Verificado local | Última auditoría: 0 altas/críticas y 2 moderadas; volver a ejecutar antes de entrega.              |
| Notas ajenas inaccesibles     | Pendiente        | No existe CRUD ni prueba IDOR.                                                                     |
| Contraseñas hasheadas         | Parcial          | bcrypt costo 12 pasa pruebas unitarias; no hay cuentas funcionales.                                |
| Notas ilegibles en BD         | Pendiente        | AES-GCM pasa pruebas unitarias; no hay persistencia de notas integrada.                            |
| HTTPS y cookies seguras       | Bloqueado        | No hay despliegue público ni sesiones.                                                             |
| Errores públicos genéricos    | Parcial          | 503 simulado y health local; no hay verificación pública.                                          |
| Login 429                     | Pendiente        | No hay login ni limitación integrada.                                                              |
| Logs sin datos sensibles      | Pendiente        | Falta implementación y prueba de redacción completa.                                               |
| README de despliegue          | Parcial          | Hay guía propuesta; no existe despliegue reproducido y probado.                                    |
| RF-01 a RF-08                 | Parcial          | Solo RF-08 local comprobado.                                                                       |
| OWASP A01–A10                 | Parcial          | Ninguna categoría completa; ver [PR05](PR05_AUDITORIA_SEGURIDAD.md).                               |
| Informe y evidencias          | Parcial          | Documentos y pruebas locales; faltan resultados finales y capturas reales.                         |
| URL y cuentas de demostración | Bloqueado        | No existen URL verificada ni cuentas integradas.                                                   |
| Repositorio y presentación    | Parcial          | Muchos archivos sin seguimiento; guion es borrador.                                                |
