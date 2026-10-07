# SEGUIMIENTO DE CALIDAD (QA) POR AVANCE — SISTEMA DE GESTIÓN DE GANADO
**Materia:** Proyectos  
**Responsable QA:** Romina Poma Matias  
**Modelo:** Scrum + ISO/IEC 25010  
**Ámbito:** Fase 2 — Roles, permisos e importación masiva (Sprint 2)  

---

## 1. Tabla de seguimiento de avances

| N° / Fecha de entrega | Sprint y meta | Historias de usuario | Casos de prueba | Defectos nuevos | Defectos abiertos | Escapados | Proceso cumplido | Características ISO 25010 probadas | Riesgos / observaciones | Recomendación | Veredicto |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :--- | :--- | :--- | :---: |
| **Avance 2**<br>07/10/2026 | **S2:** Permisos de rol Socio (HU-21: solo lectura), permisos de rol Colaborador (HU-22), módulo de importación masiva de ganado por CSV (HU-40 a HU-45), resolución de duplicados y 6 pantallas Figma. | **Plan:** 8<br>**Term.:** 8<br>**100%** | **Ejec.:** 17<br>**Pasados:** 17<br>**100%** | **BUG-03 Baja:** Validación de caravana duplicada en el mismo lote CSV.<br>*(Corregido)* | **Total:** 0<br>**Críticos:** 0 | **0** | **8 de 8**<br>**100%** | • Adecuación funcional<br>• Seguridad (control de acceso)<br>• Fiabilidad<br>• Usabilidad | Validación de pesos y fechas en archivos CSV con formato de fecha regional (DD/MM/YYYY vs YYYY-MM-DD). | Mantener soporte para ambos formatos de fecha en el validador de importación durante la carga de lotes. | **Apto** |

> **Evaluación frente a metas de QA:**
> * Historias cumplidas: **100%** (Meta: ≥ 80%) ✅
> * Casos pasados: **100%** (Meta: ≥ 90%) ✅
> * Críticos abiertos: **0** (Meta: 0) ✅
> * Defectos escapados: **0** (Meta: 0) ✅
> * Proceso cumplido: **100%** (Meta: ≥ 80%) ✅

---

## 2. Checklist de proceso cumplido (Sprint 2)

| # | Punto a verificar | Av. 2 (S2) | Evidencia / Observación |
| :-: | :--- | :---: | :--- |
| **1** | Todas las historias tienen criterios de aceptación antes de empezar | **SÍ** | Criterios definidos para HU-21, HU-22 y HU-40 a HU-45. |
| **2** | Los casos de prueba se diseñaron antes o durante el desarrollo, no al final | **SÍ** | Se crearon `socio.test.js`, `colaborador.test.js` e `importacion.test.js` en paralelo. |
| **3** | El Test Plan está actualizado con el alcance del sprint | **SÍ** | Alcance de Sprint 2 documentado con cobertura de endpoints y roles. |
| **4** | Cada defecto tiene severidad, prioridad y pasos para reproducirlo | **SÍ** | Documentado BUG-03 con resolución en el parser de CSV. |
| **5** | Los defectos corregidos se volvieron a probar antes de cerrarse | **SÍ** | Verificado con la suite automatizada de importación. |
| **6** | Se ejecutaron pruebas de regresión sobre lo ya entregado | **SÍ** | Se ejecutaron pruebas de Sprint 1 (`npm test`) y de Sprint 2 (`npm run test:sprint2`). |
| **7** | El código pasó revisión de otro integrante antes de integrarse | **SÍ** | Cambios desarrollados en la rama aislada `Poma`. |
| **8** | En la Sprint Review solo se mostró lo que cumple la Definition of Done | **SÍ** | Demostración enfocada en control de acceso y carga masiva funcional. |

**Total puntos cumplidos:** 8 de 8 (100%)

---

## 3. Matriz de Cobertura de Pruebas Automatizadas (Sprint 2)

```bash
# Ejecutar la suite completa de Sprint 2
cd servidor
npm run test:sprint2
```

* **`socio.test.js` (HU-21 - 6 pruebas):**
  * Consulta permitida de rancho (`GET /ranchos/mio`) y equipo (`GET /equipo`).
  * Bloqueo 403 ante intento de alta (`POST /equipo`).
  * Bloqueo 403 ante intento de suspensión (`PATCH /equipo/:id/estado`).
  * Bloqueo 403 ante intento de reseteo de clave (`POST /usuarios/:id/restablecer-contrasena`).
  * Bloqueo 403 ante intento de edición de rancho (`PATCH /ranchos/:id`).
* **`colaborador.test.js` (HU-22 - 5 pruebas):**
  * Consulta de su propio perfil permitida (`GET /usuarios/yo/perfil`).
  * Bloqueo 403 al intentar acceder a la administración del equipo (`GET /equipo`).
  * Bloqueo 403 al intentar invitar usuarios (`POST /equipo`).
  * Bloqueo 403 al intentar modificar o dar de baja el rancho (`PATCH` / `DELETE /ranchos/:id`).
* **`importacion.test.js` (HU-40 a HU-45 - 6 pruebas):**
  * Descarga de plantilla CSV oficial (`GET /importacion/plantilla`).
  * Validación sintáctica y de datos obligatorios (`POST /importacion/validar`).
  * Reporte de errores por fila con caravana faltante o sexo erróneo.
  * Detección de animales duplicados en el lote y en la base de datos.
  * Ejecución con resolución de duplicados (`omitir` vs `actualizar`).
  * Bloqueo de importación para rol socio (solo lectura).

---

## 4. Veredicto Final de Calidad
**APTO.** El Sprint 2 cumple con el 100% de los criterios de calidad ISO/IEC 25010 (Seguridad, Adecuación Funcional, Fiabilidad y Usabilidad) y la Definición de Terminado (DoD).
