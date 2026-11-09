# Verificación de calidad — tarjetas «En Revisión» del Sprint 3

**Fecha:** 31 de octubre de 2026 / 4 de noviembre de 2026 (revisado el 6 de noviembre)  
**Verificó:** Romina Poma (encargada de calidad)

Se verificaron las historias contra los **criterios de aceptación de Trello**, el código integrado en `main`, las pruebas automáticas del servidor y del cliente, y la navegación en pantalla.

| Rama | Commit analizado | Cómo se probó |
| :-- | :-- | :-- |
| `main` (integración de los 3) | `7854ac9` (incluye PR #19, #20, #22, #23, #25 y #26) | Integración continua de GitHub sobre una base nueva con las migraciones 001 a 010: servidor **396 de 396** pruebas en 36 archivos y cliente **117 de 117** en 13 archivos. Revisión del código contra cada criterio de Trello y navegación en pantalla. |

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
   - Barra flotante contextual con el conteo de animales seleccionados (`n`) y las acciones disponibles (asignar a un corral, cambiar estado con fecha y motivo, y dar de baja lógica).
   - Toda acción pide confirmación antes de mandarse, diciendo cuántos animales afecta (criterio 3).
   - La baja lógica masiva está restringida exclusivamente al propietario y al Administrador (HU-18 c3).
   - Endpoints: `POST /masivo/animales/estado` y `POST /masivo/animales/baja`. Pruebas en verde: `acciones-masivas.test.js` y `cliente/pruebas/acciones-masivas.test.tsx` (13 de 13).

2. **HU-32 · Ficha e historial del animal (Aprobada).**
   - Pantalla completa con el identificador destacado, chip de estado (`activo`, `vendido`, `muerto`, `archivado`) y datos generales.
   - 4 pestañas organizadas: *Resumen*, *Sanidad*, *Pesajes* e *Historial*.
   - *Sanidad* y *Pesajes*, que son de la fase 3, aparecen con su estado vacío explicado (criterio 3).
   - Historial de eventos ordenado cronológicamente con fecha, descripción, corral origen/destino y autoría de quién registró el cambio.
   - Pruebas en verde: `ficha-animal.test.tsx` (12 de 12) y `servidor/pruebas/ficha-historial.test.js`.

3. **HU-35 · Registro rápido de animal desde el celular (Aprobada).**
   - Ruta `/animales/alta-rapida` optimizada para pantallas móviles angostas (interfaz ágil en la manga).
   - Solicita exclusivamente los datos mínimos requeridos: identificador, categoría y sexo (al elegir la categoría se marca el sexo que corresponde, y se puede cambiar). El corral y el resto de la ficha se completan después.
   - Campos y botones con el alto móvil del sistema de diseño (52 px, por encima de los 48 px pedidos); las acciones van en una barra pegada al borde inferior.
   - Permite encadenar registros sucesivos («Guardar y registrar otro») sin regresar al listado general.
   - Pruebas en verde: `alta-rapida.test.tsx` (8 de 8) y `servidor/pruebas/alta-rapida.test.js`.

4. **HU-45 · Exportación a Excel y CSV (Aprobada).**
   - Botón de exportación en la lista de ganado: se elige qué exportar (animales, corrales, movimientos y cambios de estado) y el formato, `.xlsx` (una hoja por cada cosa, vía `exceljs`) o `.csv` (una sola tabla).
   - Respeta los filtros aplicados en pantalla y la pestaña activa (activos o de baja).
   - Genera el nombre del archivo con el nombre del rancho y la fecha de descarga en la zona horaria del país (por ejemplo `ganado_rancho-el-cerrito_2026-11-06.xlsx`).
   - Pruebas en verde: `exportacion.test.js` y `exportacion.test.tsx` (8 de 8).

---

### Brian Aranibar

1. **HU-30 · Orden y paginación del listado (Aprobada).**
   - Ordenamiento en el servidor por identificador, nombre, sexo, categoría, nacimiento, corral, estado, peso y fecha de alta, ascendente o descendente.
   - Paginación en la base con selector de 25, 50 o 100 por página (máximo 100), así un rodeo grande no se trae entero.
   - Pruebas en verde: `orden-paginacion-animales.test.js` (12 de 12). La prueba que repetía `porPagina` en la dirección quedó corregida en el PR #19.

2. **HU-41 · Importación con reconocimiento inteligente de columnas (Aprobada).**
   - Lector capaz de interpretar encabezados con diferentes nombres o sinónimos comunes (ej. «caravana», «número», «arete» mapean a `identificador`) y tolera errores de tipeo.
   - Pruebas en verde: `columnas-importacion.test.js` (14 de 14).

3. **HU-42 · Confirmación manual de columnas (Aprobada).**
   - Interfaz interactiva para mapear manualmente las columnas del archivo subido cuando no se reconoce automáticamente el encabezado.
   - Integrado en `main` en el PR #19 (commit `796ec5e`). Se prueba en `columnas-importacion.test.js`.

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

## 3. Recorrido manual en el navegador (6 de noviembre)

Criterios de las historias de Aaron probados a mano, sobre una base recién sembrada (`npm run sembrar`), como Carlos (propietario) en la barra de demostración.

| Historia | Qué se hizo | Resultado |
| :-- | :-- | :-- |
| **HU-31** criterio 1 | Elegir 0501 y 0502 de a uno («2 animales elegidos · elegidos de a uno»); elegir la página («Aplicar a 6»); filtrar hembras y «Elegir todo el resultado del filtro» («3 animales elegidos · todo el resultado del filtro»). | Cumple |
| **HU-31** criterios 2 y 3 | La barra muestra la cantidad y las acciones. Cambiar estado a vendido pide «¿Cambiar el estado de 3 animales a Vendido?» antes de aplicar; al confirmar: «Listo, 3 animal(es) pasaron a vendido». | Cumple |
| **HU-32** criterios 1 y 2 | Ficha del 0501: caravana en grande, estado «Vendido», categoría, sexo, edad, peso y corral; pestañas Resumen, Sanidad, Pesajes e Historial. | Cumple |
| **HU-32** criterios 3 y 4 | Pesajes (fase 3) muestra su estado vacío explicado. El historial muestra el cambio recién hecho con quién y cuándo: «Pasó de Activo a Vendido el 06/11/2026 · Carlos Gutierrez Mendoza · 06/11/2026 15:38». | Cumple |
| **HU-35** criterios 1 a 3 | El formulario pide solo Identificador, Categoría y Sexo. Medido con la página en tamaño celular (390 × 844 px): todo lo tocable mide 52 px o más y Terminar y Registrar están a 736 px, en la mitad inferior, sin moverse al completar el formulario. | Cumple |
| **HU-35** criterio 4 | Se registraron 7001 y 7002 seguidos: después de cada alta la caravana queda vacía y con el foco, y categoría y sexo siguen elegidos; abajo, «Registrados ahora · 2 animales». | Cumple |
| **HU-45** criterio 1 | El panel deja elegir Excel o CSV y qué exportar (animales, corrales, movimientos y cambios de estado). | Cumple |
| **HU-45** criterios 2 y 3 | Con el filtro «machos» el CSV trae 3 animales (0503, 0504, 0506); sin filtro, los 5 activos. El archivo se llama `animales_rancho-el-cerrito_2026-11-06.csv` (CSV) o `ganado_rancho-el-cerrito_2026-11-06.xlsx` (Excel). | Cumple |

*Nota:* en la pantalla de escritorio, al completar el formulario de HU-35 desaparece el texto de ayuda y los botones suben unos píxeles. En tamaño celular, que es para lo que está hecha la pantalla, la barra queda fija abajo y no se mueve, así que no hay nada que corregir.

## 4. Veredicto final

**Se aprueban la totalidad de las historias del Sprint 3 de Aaron Taborga, Brian Aranibar y Romina Poma.**

*Observación de tablero:* la tarjeta de **HU-44** quedó archivada el 4/11 en lugar de estar en «Finalizado»; hay que desarchivarla.

Todas las tarjetas correspondientes que se encuentran en la columna **«En Revisión»** de Trello quedan autorizadas para moverse a la columna **«Finalizado»**.
La tarjeta de control **`QA-S3 QA de HU-31, HU-32, HU-35 y HU-45 [Romina]`** queda con sus criterios verificados y cumplidos.

