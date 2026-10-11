# Entregable de Calidad (QA) - Sprint 1
**Sistema de Gestión de Ganado**  
**Responsable:** Romina (Control de Calidad)  
**Rama de trabajo:** `Poma`  
**Fecha:** Septiembre 2026  

---

## 1. Resumen de Entregables

En cumplimiento con el Sprint 1 (Fase 1: Cimiento, acceso y puesta en marcha) y los acuerdos técnicos de `DECISIONES.md`, se entrega el paquete completo de Calidad y Datos de Prueba sin dependencias externas bloqueantes:

| Entregable | Historia / Tarea | Ubicación | Descripción |
| :--- | :--- | :--- | :--- |
| **Plan de Pruebas** | QA General (Sprint 1) | [`documentos/PLAN_DE_PRUEBAS.md`](../documentos/PLAN_DE_PRUEBAS.md) | Marco formal con Definición de Terminado (DoD), clasificación de fallos y matriz de verificación checklist para las 5 historias (HU-01, HU-02, HU-03, HU-04, HU-15). |
| **Semillas de Datos** | HU-04 | [`servidor/semillas/001_datos_prueba.sql`](../servidor/semillas/001_datos_prueba.sql) | Script SQL idempotente con dos ranchos reales ("Rancho El Cerrito" en Warnes y "Hacienda La Floresta" en Quillacollo), 4 roles y 4 tipos de colaboradores con UUIDs fijos. |
| **Corredor de Semillas** | HU-04 | [`servidor/sembrar.js`](../servidor/sembrar.js) | Script Node.js para ejecutar la carga de semillas mediante `npm run seed`. |
| **Pruebas de Aislamiento** | HU-03 | [`servidor/pruebas/aislamiento.test.js`](../servidor/pruebas/aislamiento.test.js) | Suite automatizada de 5 pruebas unitarias contra `RepositorioBase` que verifica aislamiento bidireccional y anti-suplantación (100% verde). |

---

## 2. Aislamiento Multi-inquilino (HU-03)

Se implementó la suite de pruebas unitarias en `servidor/pruebas/aislamiento.test.js` que evalúa exhaustivamente el `RepositorioBase.js`:

1. **Test 1:** Bloqueo inmediato ante intento de instanciación con `rancho_id` nulo o indefinido.
2. **Test 2:** Consulta general desde Rancho A solo devuelve usuarios de Rancho A y nunca de Rancho B.
3. **Test 3:** Intento directo de un usuario de Rancho A de acceder al ID de un usuario de Rancho B retorna 0 registros (no encontrado).
4. **Test 4:** Consulta simétrica desde Rancho B confirma aislamiento bidireccional estricto.
5. **Test 5:** Prevención de inyección o contaminación al insertar: el repositorio sobrescribe cualquier intento de suplantar el `rancho_id` y registra la autoría real (`creado_por`).

---

## 3. Semillas de Datos de Prueba (HU-04)

El archivo `servidor/semillas/001_datos_prueba.sql` respeta estrictamente:
* **Dependencia circular resuelta:** Inserción de propietarios con `rancho_id = NULL`, inserción de ranchos apuntando al propietario, y posterior `UPDATE` para asociar el propietario a su rancho.
* **Roles y Tipos de Colaborador:** Cubre `admin_plataforma`, `propietario`, `socio` y `colaborador` con los UUIDs fijos de catálogo (`...0001` a `...0004`).
* **Verosimilitud regional:** Datos acordes al contexto ganadero boliviano (Santa Cruz y Cochabamba) sin datos ficticios.
* **Idempotencia:** Sección de limpieza previa para permitir re-ejecuciones limpias sin duplicidad ni errores de clave única.

---

## 4. Instrucciones de Verificación

Para ejecutar las pruebas y validar el entregable:

```bash
# 1. Posicionarse en la carpeta del servidor
cd servidor

# 2. Ejecutar la suite de pruebas de aislamiento (100% verde)
npm test

# 3. Cargar las semillas en la base de datos (con PostgreSQL activo)
npm run seed
```

---

## 5. Compatibilidad e Integración
* **Cero conflictos:** Los cambios se concentran en las carpetas propias de Calidad (`documentos/`, `servidor/semillas/`, `servidor/pruebas/`, `servidor/sembrar.js`), manteniendo intactos los archivos de Brian (`servidor/migraciones/`, `servidor/migrar.js`, `servidor/RepositorioBase.js`) y Favio/Aaron.
* **Listo para Merge:** La rama `Poma` se encuentra lista para revisión y posterior integración a `main`.
