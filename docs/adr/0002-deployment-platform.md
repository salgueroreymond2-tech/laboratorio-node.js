# ADR-0002: Estrategia de Despliegue (Docker + Railway / Plan B Render + TiDB Cloud)

- **Estado:** Propuesto para Fase 3 (Pendiente de autorización de despliegue)
- **Fecha:** 2026-11-25
- **Contexto:** SecureVault requiere URL pública con HTTPS obligatorio, redirección HTTP→HTTPS, MySQL en la nube con conexión cifrada, gestión segura de secretos, `NODE_ENV=production`, `trust proxy` calibrado y reinicio automático, priorizando costo \$0 o mínimo para entorno académico.

## Decisión
Empaquetar SecureVault mediante **Docker multi-stage con usuario no root** y desplegarlo como opción primaria en **Railway** (Web Service + MySQL gestionado en red privada WireGuard), manteniendo portabilidad inmediata hacia **Render (Free Web Service) + TiDB Cloud Serverless (Starter Free)** como plan de respaldo.

## Justificación
1. **Compatibilidad nativa con MySQL:** Railway aprovisiona MySQL dentro del mismo proyecto y red privada cifrada sin exponer el puerto `3306` a internet.
2. **Seguridad de transporte y proxy:** Comprobar TLS y redirección HTTPS en la plataforma elegida. El ajuste `trust proxy` debe determinarse y verificarse frente a la topología real antes de la publicación; no se presupone un número de saltos.
3. **Portabilidad y mitigación de límites gratuitos:** Al basarse en `Dockerfile` y variables de entorno validadas con Zod, si el crédito de prueba/mensual gratuito de Railway se agota, el mismo contenedor puede desplegarse en Render + TiDB Cloud Starter (MySQL-compatible gratuito con TLS obligatorio) sin modificar código.

## Consecuencias
- **Positivas:** Despliegue reproducible, usuario no root en contenedor (bonificación) y cero secretos dentro de la imagen.
- **Compensaciones:** En capas gratuitas puede existir suspensión por inactividad (*cold start* de segundos al despertar); debe documentarse para la demostración en vivo.
