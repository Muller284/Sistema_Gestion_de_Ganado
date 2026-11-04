# Verificación de calidad — tarjetas «En Revisión» del Sprint 3

**Fecha:** 31 de octubre de 2026 / 4 de noviembre de 2026  
**Verificó:** Romina Poma (encargada de calidad)

Se verificaron las historias contra los **criterios de aceptación de Trello**, el código integrado en `main`, las pruebas automáticas del servidor y del cliente, y la navegación en pantalla.

| Rama | Commit analizado | Cómo se probó |
| :-- | :-- | :-- |
| `main` (integración de los 3) | `c36e50b` (incluye PR #19, #20, #22, #23) | Base de datos PostgreSQL con migraciones 001 a 010. 63 pruebas de cliente Vitest en verde (`alta-rapida`, `ficha-animal`, `importacion`, `razas`, `categorias`, `unidades`, `idiomas`, `carga`). Suites de pruebas del servidor y validación funcional de pantallas. |

---

## 1. Resumen ejecutivo

| Historia | Responsable | Estimación | Veredicto |
| :-- | :-- | :--: | :-- |
| **HU-31** Acciones masivas sobre animales | Aaron | 5 pts | **Aprobada** |
| **HU-32** Ficha e historial del animal | Aaron | 8 pts | **Aprobada** |
| **HU-35** Registro de animal desde el celular | Aaron | 5 pts | **Aprobada** |
| **HU-45** Exportación a Excel y CSV | Aaron | 5 pts | **Aprobada** |
| **HU-30** Orden y paginación del listado | Brian | 5 pts | **Aprobada** |
| **HU-41** Reconocimiento de columnas en importación | Brian | 13 pts | **Aprobada** |
| **HU-42** Confirmación manual de columnas | Brian | 8 pts | **Aprobada** |
| **HU-37** Asignación de animales a corrales | Romina | 5 pts | **Aprobada** |
| **HU-38** Aviso de sobrepoblación | Romina | 3 pts | **Aprobada** |
| **HU-40** Plantilla de importación en Excel | Romina | 2 pts | **Aprobada** |
| **HU-43** Vista previa e informe de errores | Romina | 13 pts | **Aprobada** |
| **HU-44** Detección de duplicados | Romina | 5 pts | **Aprobada** |

*Nota sobre Sprint 2:* Las historias de Romina que permanecían en «En Revisión» (HU-21, HU-22, HU-26, HU-28, HU-33, HU-34, HU-36 y HU-39) ya fueron integradas en el PR #13 y re-validadas; se aprueban para pasar a «Finalizado».

---

## 2. Detalle por integrante

### Aaron Taborga (QA asignado a Romina en tarjeta QA-S3)

1. **HU-31 · Acciones masivas sobre animales (Aprobada).**
   - Se puede seleccionar un animal individualmente, por página o el filtro completo.
   - Barra flotante contextual con el conteo de animales seleccionados (`n`) y las acciones disponibles (reasignar corral, cambiar estado y dar de baja lógica con motivo).
   - La baja lógica masiva está restringida exclusivamente al propietario y al Administrador (HU-18 c3).
   - Endpoints: `POST /masivo/animales/estado` y `POST /masivo/animales/baja`. Pruebas en verde: `acciones-masivas.test.js` y `cliente/pruebas/acciones-masivas.test.tsx`.

2. **HU-32 · Ficha e historial del animal (Aprobada).**
   - Pantalla completa con el identificador destacado, chip de estado (`activo`, `vendido`, `muerto`) y datos generales.
   - 4 pestañas organizadas: *Resumen*, *Historial*, *Sanidad* y *Pesajes*.
   - Historial de eventos ordenado cronológicamente con fecha, descripción, corral origen/destino y autoría de quién registró el cambio.
   - Pruebas en verde: `ficha-animal.test.tsx` (12 de 12 pasan en Vitest).

3. **HU-35 · Registro rápido de animal desde el celular (Aprobada).**
   - Ruta `/animales/alta-rapida` optimizada para pantallas móviles angostas (interfaz ágil en la manga).
   - Solicita exclusivamente los datos mínimos requeridos: identificador, categoría (que sugiere o autocompleta el sexo) y corral.
   - Permite encadenar registros sucesivos («Guardar y registrar otro») sin regresar al listado general.
   - Pruebas en verde: `alta-rapida.test.tsx` (8 de 8 pasan en Vitest).

4. **HU-45 · Exportación a Excel y CSV (Aprobada).**
   - Botón de exportación en la lista de ganado con soporte para formato `.xlsx` (Excel real vía `exceljs`) y `.csv`.
   - Respeta los filtros aplicados en pantalla y la pestaña activa (activos o de baja).
   - Genera el nombre del archivo con el identificador del rancho y la fecha de descarga.
   - Pruebas en verde: `exportacion.test.js` y `exportacion.test.tsx`.

---

### Brian Aranibar

1. **HU-30 · Orden y paginación del listado (Aprobada).**
   - Ordenamiento por columnas (identificador, categoría, peso, fecha de ingreso) en el servidor.
   - Paginación eficiente con selector de elementos por página (10, 25, 50, 100), optimizado para manejar rodeos grandes sin degradación de rendimiento.

2. **HU-41 · Importación con reconocimiento inteligente de columnas (Aprobada).**
   - Lector capaz de interpretar encabezados con diferentes nombres o sinónimos comunes (ej. «caravana», «número», «arete» mapean a `identificador`).

3. **HU-42 · Confirmación manual de columnas (Aprobada).**
   - Interfaz interactiva para mapear manualmente las columnas del archivo subido cuando no se reconoce automáticamente el encabezado.
   - Integrado en `main` en el PR #19 (commit `796ec5e`).

---

### Romina Poma

1. **HU-37 · Asignación de animales a corrales (Aprobada).**
   - Asignación individual y masiva desde el listado de ganado y desde la propia pantalla de detalle del corral (`POST /corrales/:id/animales`).
   - Registra el movimiento histórico de cada animal con fecha y usuario responsable.

2. **HU-38 · Aviso de sobrepoblación (Aprobada).**
   - Alerta visual no bloqueante (aviso amarillo/ámbar) cuando la cantidad de animales supera la capacidad establecida del corral.
   - Permite al usuario continuar si lo decide conscientemente.

3. **HU-40 · Plantilla de importación en Excel (Aprobada).**
   - Descarga directa de plantilla `.xlsx` generada con `exceljs` conteniendo encabezados estandarizados, fila de ejemplo explicativa y metadatos de validación.

4. **HU-43 · Vista previa e informe de errores (Aprobada).**
   - Proceso de importación seguro en 2 pasos: primero previsualiza en memoria las filas correctas, erróneas y repetidas sin tocar la base de datos.
   - Permite descargar un archivo de informe de errores detallando fila por fila el motivo del fallo.

5. **HU-44 · Detección de duplicados (Aprobada).**
   - Detección automática de identificadores ya existentes en el rancho activo.
   - Selector de resolución para el usuario: *Omitir repetidos* o *Actualizar existentes*.
   - Pruebas en verde: `servidor/pruebas/importacion.test.js` (14 de 14) y `cliente/pruebas/importacion.test.ts` (4 de 4).

---

## 3. Veredicto final

**Se aprueban la totalidad de las historias del Sprint 3 de Aaron Taborga, Brian Aranibar y Romina Poma.**

Todas las tarjetas correspondientes que se encuentran en la columna **«En Revisión»** de Trello quedan autorizadas para moverse a la columna **«Finalizado»**.
La tarjeta de control **`QA-S3 QA de HU-31, HU-32, HU-35 y HU-45 [Romina]`** queda con sus criterios verificados y cumplidos.

