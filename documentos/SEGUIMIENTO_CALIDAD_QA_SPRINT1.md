# SEGUIMIENTO DE CALIDAD (QA) POR AVANCE — SISTEMA DE GESTIÓN DE GANADO
**Materia:** Proyectos  
**Responsable QA:** Romina Poma Matias  
**Modelo:** Scrum + ISO/IEC 25010  
**Ámbito:** Fase 1 — Cimiento, acceso y puesta en marcha (Sprint 1)  

---

## 1. Tabla de seguimiento de avances

| N° / Fecha de entrega | Sprint y meta | Historias de usuario | Casos de prueba | Defectos nuevos | Defectos abiertos | Escapados | Proceso cumplido | Características ISO 25010 probadas | Riesgos / observaciones | Recomendación | Veredicto |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :--- | :--- | :--- | :---: |
| **Avance 1**<br>30/09/2026 | **S1:** Arquitectura base, registro de propietario, seguridad, autenticación, semillas de prueba y aislamiento multi-rancho | **Plan:** 16<br>**Term.:** 16<br>**100%** | **Ejec.:** 16<br>**Pasados:** 16<br>**100%** | **BUG-01 Alta:** Incompatibilidad de hash Bcrypt vs scrypt en semillas.<br>*(Corregido)*<br>**BUG-02 Media:** Dependencia `react-router-dom` ausente en cliente.<br>*(Corregido)* | **Total:** 0<br>**Críticos:** 0 | **0** | **8 de 8**<br>**100%** | • Adecuación funcional<br>• Seguridad<br>• Fiabilidad<br>• Usabilidad | Riesgo de bloqueo en despliegue si no se configuran variables de entorno `.env` en cada máquina local. | Para el Sprint 2, automatizar la inicialización del archivo `.env` mediante un script de arranque rápido. | **Apto** |

> **Evaluación frente a metas de QA:**
> * Historias cumplidas: **100%** (Meta: ≥ 80%) ✅
> * Casos pasados: **100%** (Meta: ≥ 90%) ✅
> * Críticos abiertos: **0** (Meta: 0) ✅
> * Defectos escapados: **0** (Meta: 0) ✅
> * Proceso cumplido: **100%** (Meta: ≥ 80%) ✅

---

## 2. Checklist de proceso cumplido (Sprint 1)

| # | Punto a verificar | Av. 1 (S1) | Evidencia / Observación |
| :-: | :--- | :---: | :--- |
| **1** | Todas las historias tienen criterios de aceptación antes de empezar | **SÍ** | Las 16 HUs cuentan con criterios definidos en la matriz de historias (HU-01 a HU-16). |
| **2** | Los casos de prueba se diseñaron antes o durante el desarrollo, no al final | **SÍ** | Pruebas de bloqueo (HU-11), aislamiento (HU-03) y semillas (HU-04) creadas en paralelo al desarrollo. |
| **3** | El Test Plan está actualizado con el alcance del sprint | **SÍ** | Cobertura de Fase 1 actualizada al 100% en suites de backend y frontend. |
| **4** | Cada defecto tiene severidad, prioridad y pasos para reproducirlo | **SÍ** | Se documentó BUG-01 (hash de contraseñas) y BUG-02 (enrutador cliente) con solución inmediata. |
| **5** | Los defectos corregidos se volvieron a probar antes de cerrarse | **SÍ** | Verificado con inicio de sesión de Fernando Torrico y compilación exitosa de Vite. |
| **6** | Se ejecutaron pruebas de regresión sobre lo ya entregado | **SÍ** | Suite completa `npm test` ejecutada con 100% verde (`[PASA]`). |
| **7** | El código pasó revisión de otro integrante antes de integrarse | **SÍ** | Ramas individuales integradas a `main` tras validación técnica. |
| **8** | En la Sprint Review solo se mostró lo que cumple la Definition of Done | **SÍ** | Solo se presentan funcionalidades integradas con base de datos, API y frontend funcional. |

**Total puntos cumplidos:** 8 de 8 (100%)

---

## 3. Registro detallado de defectos detectados y resueltos

* **BUG-01 (Alta):** Las contraseñas precargadas en `001_datos_prueba.sql` usaban prefijo `$2a$` (Bcrypt), mientras que el servicio de autenticación exigía `scrypt`.  
  * *Acción correctiva:* Se actualizó la semilla y la base de datos a formato `scrypt` (`Ganado2026`). Estado: **CERRADO**.
* **BUG-02 (Media):** Error `Failed to resolve import "react-router-dom"` al iniciar el cliente web tras fusión de ramas.  
  * *Acción correctiva:* Ejecución de `npm install` en la carpeta `cliente` e inicio limpio del servidor Vite. Estado: **CERRADO**.

---

## 4. Veredicto Final de Calidad
**APTO.** El Sprint 1 cumple con el 100% de los criterios de calidad ISO/IEC 25010 y las políticas de Scrum del proyecto.
