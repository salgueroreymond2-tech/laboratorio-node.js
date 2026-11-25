# Control de Progreso — SecureVault

**Última actualización:** 2026-11-25  
**Fase actual:** Fases 0 y 1 completadas — Esperando autorización para iniciar Fase 2 (Desarrollo seguro)

---

## 1. Diagnóstico Inicial del Workspace

- Al iniciar el proyecto, la carpeta `c:/Users/HP8D8/OneDrive/Desktop/Ray/Laboratorio Nodejs` estaba vacía y sin repositorio Git propio (Git resolvía hacia un `.git` accidental en el directorio padre de usuario).
- Se inicializó un repositorio Git dedicado en el workspace (`main`) vinculado al remoto `https://github.com/salgueroreymond2-tech/laboratorio-node.js.git` con un primer `.gitignore` mínimo.
- Entorno local verificado: Node.js `v22.18.0` (LTS activo), npm `10.9.3`, Docker Desktop instalado (daemon actualmente apagado en el equipo local).

---

## 2. Estado por Fase

| Fase | Estado | Resumen de avance |
|---|---|---|
| **Fase 0 — Deep Research** | Completada | Comparación de Railway, Render y Fly.io + MySQL gestionado (Railway MySQL / TiDB Cloud), respuestas a las 10 preguntas con 22 referencias oficiales verificadas y plan de despliegue propuesto. |
| **Fase 1 — Diseño** | Completada | Definición de arquitectura modular, modelo relacional MySQL (`securevault_db`) con diagrama ER, ADRs (MySQL y plataforma), modelo de amenazas STRIDE + DFD, sistema de diseño UI/UX, flujo Auth/CSRF y matriz inicial de requisitos. |
| **Fase 2 — Desarrollo seguro** | Pendiente (esperando autorización) | Inicialización `package.json`, MySQL + Sequelize, migraciones, criptografía, RF-01 a RF-08, frontend EJS, hardening OWASP, pruebas y bonificaciones. |
| **Fase 3 — Despliegue** | Pendiente | Dockerfile multi-stage no root, GitHub Actions CI/CD, Dependabot, Gitleaks, MySQL en la nube y publicación HTTPS autorizada. |
| **Fase 4 — Verificación** | Pendiente | Pruebas finales, `npm audit`, OWASP ZAP, `securityheaders.com`, Qualys SSL Labs, revisión visual en navegador (1440/768/390 px), informe final y demo. |

---

## 3. Ponderación Académica Estimada (Solo Avance Real Verificable)

> Nota: Esta tabla refleja únicamente el progreso verificable en el workspace actual; no constituye una calificación oficial del docente.

| Criterio | Puntos máximos | Estado actual | Estimación verificable |
|---|---:|---|---:|
| Deep Research | 10 | Documento completo en `docs/deep-research.md` con 3 plataformas y 22 fuentes verificadas. | 10 / 10 |
| Funcionalidad (RF-01 a RF-08) | 10 | Diseñada en arquitectura y matriz; pendiente de implementación en Fase 2. | 0 / 10 |
| OWASP Top 10:2025 | 30 | A06 (Modelo de amenazas STRIDE) documentado; controles de código pendientes de Fase 2. | 2 / 30 |
| Hash y cifrado | 20 | Especificación técnica y ADRs diseñados; pendiente de código y pruebas en Fase 2. | 0 / 20 |
| Despliegue | 20 | Estrategia definida en ADR-0002; pendiente de Fase 3. | 0 / 20 |
| Informe y demostración | 10 | Documentación base iniciada (`AGENTS.md`, `architecture.md`, `threat-model.md`, `matriz-requisitos.md`); faltan informe final, evidencias y `demo.md`. | 2 / 10 |
| **Total ordinario** | **100** | **Avance documental/diseño (Fases 0 y 1)** | **14 / 100** |
| Bonificaciones | Hasta 10 | Diseñadas en modelo (`user_mfa`, `key_version`); pendientes de implementación y verificación. | 0 / 10 |

---

## 4. Registro de Archivos Creados (Fases 0 y 1)

- `.gitignore` — Exclusión inicial (`node_modules/`, `.env`).
- `AGENTS.md` — Reglas permanentes de seguridad, MySQL y arquitectura.
- `docs/deep-research.md` — Informe de investigación de despliegue (Fase 0).
- `docs/adr/0001-database-mysql-sequelize.md` — Decisión arquitectónica sobre MySQL + Sequelize.
- `docs/adr/0002-deployment-platform.md` — Decisión sobre plataforma de despliegue.
- `docs/architecture.md` — Arquitectura modular, diagrama ER MySQL, flujo Auth/CSRF y sistema visual.
- `docs/threat-model.md` — Modelo de amenazas STRIDE, DFD, casos de abuso, límites de negocio y riesgos residuales.
- `docs/matriz-requisitos.md` — Matriz de trazabilidad inicial.
- `docs/progreso.md` — Este documento de seguimiento.

---

## 5. Pendientes y Riesgos Actuales

- **Pendiente crítico:** Autorización del usuario para iniciar la **Fase 2** (creación de `package.json`, instalación de dependencias verificadas, base de datos local con `compose.yaml` y desarrollo vertical).
- **Riesgo de entorno local:** Docker Desktop está instalado pero el daemon no estaba iniciado al momento del diagnóstico; se requerirá encender Docker Desktop (o disponer de MySQL 8 local) para ejecutar migraciones y pruebas de integración reales en Fase 2.
