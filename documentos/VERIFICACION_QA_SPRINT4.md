# Verificación de calidad — Sprint 4 (fase 3) y asistente con IA

**Fecha:** 25 de noviembre de 2026  
**Verificó:** Romina Poma (encargada de calidad)  
**Sobre:** `main` en `8b904b1` (PR #34), con las 14 historias del Sprint 4 integradas (PR #24 a #31) y el asistente (PR #32).

## Cómo se probó

| Qué | Cómo | Resultado |
| :-- | :-- | :-- |
| Pruebas del servidor | Las 44 suites de `npm test`, una por una, sobre una base recién migrada (001 a 013) y sembrada, con el servidor como en la integración continua (sin `USUARIO_DEMO_ID`, asistente contra el Gemini simulado del puerto 4599). | **509 de 509** |
| Pruebas del cliente | `vitest run`, `tsc -b`, `lint` y `build`. | **218 de 218**, sin errores |
| Integración continua | Último `main` (PR #34, 23/11). | En verde |
| Recorrido manual | Cada criterio de Trello en el navegador, con el usuario que pide cada tarjeta (barra de demostración): Carlos (propietario), María René (socia), Dr. Jorge (veterinario), Roberto (encargado de campo), Gonzalo (almacén) y Fernando (otro rancho). Las pantallas para el celular, en 390 × 844 px. | Ver abajo |

---

## 1. Resumen

| Historia | Responsable | Pts | Veredicto |
| :-- | :-- | :--: | :-- |
| **HU-47** Esquemas de vacunación | Aaron | 5 | **Aprobada** |
| **HU-50** Calendario sanitario en lista | Aaron | 8 | **Aprobada** |
| **HU-51** Avisos de vencimientos | Aaron | 3 | **Aprobada** |
| **HU-54** Ganancia diaria y evolución del peso | Aaron | 5 | **Aprobada** |
| **HU-56** Comparativa por corral y categoría | Aaron | 8 | **Aprobada** |
| **HU-57** Panel del propietario | Aaron | 8 | **Aprobada** |
| **HU-58** Panel según el rol | Aaron | 3 | **Aprobada** |
| **HU-59** Calendario sanitario mensual | Aaron | 3 | **Aprobada** |
| **HU-53** Pesaje individual y masivo | Brian | 5 | **Aprobada** (observación menor B-2) |
| **HU-55** Pesaje rápido desde el celular | Brian | 3 | **Aprobada** |
| **HU-46** Catálogo de productos sanitarios | Romina | 3 | **Aprobada** (autoverificada) |
| **HU-48** Aplicación individual | Romina | 3 | **Aprobada** (autoverificada) |
| **HU-49** Aplicación masiva | Romina | 5 | **Aprobada** (autoverificada) |
| **HU-52** Vacuna desde el celular | Romina | 3 | **Aprobada** (autoverificada) |
| **Asistente con IA** (RF-38 a RF-42) | Aaron | — | Pruebas automáticas **aprobadas**; preguntas con el modelo real en la sección 4 |

*Autoverificada:* las historias de Romina las revisó la misma persona que las hizo. Conviene que Aaron o Brian les den una segunda mirada.

---

## 2. Detalle por historia

### Aaron

**HU-47 · Esquemas de vacunación.** Como el Dr. Jorge.
1. Cada esquema muestra producto, categorías, sexo, edad, dosis y días entre dosis («Ternera · solo hembras · de 3 a 8 meses · Una dosis»). Cumple.
2. Refuerzo periódico: «Aftosa (todo el rodeo) · refuerzo cada 180 días». Cumple.
3. Se cambió el refuerzo de Aftosa a 200 días: las aplicaciones registradas del esquema quedaron iguales antes y después; se devolvió a 180. Cumple.
4. El paso 3 de la guía («Define tus vacunas») está habilitado y su «Continuar» lleva a `#/sanidad/esquemas`. Cumple.

**HU-50 · Calendario sanitario en lista.**
1. Calcula la próxima dosis de cada animal y esquema (9 dosis en El Cerrito). Cumple.
2. Estados: Vencida 7, Próxima 0, Programada 2. Cumple.
3. Filtros: producto «Brucelosis RB51» deja 1 dosis (0505); corral «Potrero del Río» deja 2 (0503, 0504); fechas del 01/10 al 30/11 dejan 5 de 9. Cumple.
4. Con 2.000 animales más, el calendario respondió en **36 ms** (6.030 dosis); el límite es 2 s. Cumple.

**HU-51 · Avisos de vencimientos.**
1. Al entrar: «Hay 7 dosis de vacunación vencidas» (la API da 7 vencidas y 0 próximas; con 0 próximas esa parte no se muestra). Cumple.
2. «Ver las vencidas» abre el calendario con el filtro Vencida ya puesto (`/sanidad?estado=vencida`). Cumple.
3. Roberto y Gonzalo, sin sanidad, no ven el aviso y la API les responde 403. Cumple.

**HU-54 · Ganancia diaria y evolución del peso.**
1. Se registró 480 kg al 0501 el 25/11; la ganancia contra el pesaje anterior (468 kg el 30/10) fue «+0,46 kg/día en 26 días» = (480 − 468) / 26. Cumple.
2. La pestaña Pesajes tiene la tabla con la ganancia de cada pesaje y el gráfico «Evolución del peso». Cumple.
3. Un animal con un solo pesaje (QA01) dice «Con un solo pesaje todavía no se puede calcular la ganancia diaria: hace falta otro para comparar». Cumple.

**HU-56 · Comparativa por corral y categoría.**
1. Por corral (Potrero Las Lomas 468,3 kg, +0,28 kg/día; Potrero del Río 386,5 kg, +0,45 kg/día) y por categoría (Novillo, Vaca, Ternera, Toro), en el período elegido. Cumple.
2. Lista los que están por debajo de su grupo con cuánto les falta («0506 … le falta 0,21 kg/día»). Cumple.
3. Gonzalo (sin pesajes) recibe 403; Fernando ve solo sus 2 animales, nada de El Cerrito. Cumple.

**HU-57 · Panel del propietario.** Como Carlos.
1. Existencias por categoría (Vaca 2, Novillo 2, Ternera 1, Toro 1) y por corral (4 de 20 y 2 de 10). Cumple.
2. Altas y bajas por mes: «7 altas y 1 bajas en los últimos 12 meses», con el gráfico mensual. Cumple.
3. Cobertura de vacunación («0 % al día», 7 vencidas) y próximos vencimientos (0501 y 0502, 29/01/2027). Cumple.
4. Peso promedio por mes («436,5 kg … +11,8 kg respecto de septiembre»). Cumple.
5. Sin datos, cada indicador dice qué falta: no hay en las semillas un rancho vacío con esos módulos; lo cubre `cliente/pruebas/paneles.test.tsx` («criterio 5: sin datos, cada indicador dice qué falta cargar»), en verde. Cumple (por prueba automática).

**HU-58 · Panel según el rol.**
1. La socia ve el panel completo y ningún botón de acción en la página, solo enlaces para ver. Cumple.
2. Roberto ve existencias, corrales, rodeo y peso, sin vacunación; el Dr. Jorge, sin corrales. Cumple.
3. La API del panel no le entrega la sección de sanidad a Roberto, la de corrales al Dr. Jorge ni ninguna a Gonzalo. Cumple.

**HU-59 · Calendario sanitario mensual.**
1. Cada día con dosis muestra cuántas y su estado con color (08/11: 4 dosis vencidas; 29/01/2027: 2 programadas). Cumple.
2. Al tocar el 8 de noviembre aparece la lista de ese día (0501, 0502, 0503 y 0506). Cumple.
3. Se pasa al mes siguiente y al anterior (enero de 2027, octubre de 2026). Cumple.

### Brian

**HU-53 · Pesaje individual y masivo.** Como Roberto.
1. El peso se escribe en kg (la unidad de Bolivia) y con una fecha futura no deja registrar. Cumple, con la observación B-2.
2. En el masivo, cada animal elegido tiene su campo «Peso nuevo» junto a su peso actual. Cumple.
3. Después de pesar 480 kg, el peso de la ficha pasó a 480 kg. Cumple.
4. El pesaje aparece en la tabla de la pestaña y en el historial con quién lo registró («Se pesó: 480 kg el 25/11/2026 · Roberto Justiniano Saucedo»). Cumple.

**HU-55 · Pesaje rápido desde el celular.** En 390 × 844 px.
1. Solo caravana y peso, y se guarda con un toque. Cumple.
2. Todo lo tocable mide 52 px o más; después de guardar, la caravana queda vacía y con el foco (probado con dos animales seguidos). Cumple.
3. Muestra la ganancia del animal recién pesado: 0502, «+0,58 kg/día» = (470 − 455) / 26; para QA01 explica que es su primer pesaje. Cumple.

### Romina (autoverificadas, sobre `main` después de la integración)

**HU-46.** El catálogo lista los 4 productos con tipo y dosis; los que usa un esquema dicen «En uso en un esquema» y no ofrecen la baja; la Ivermectina sí. Pruebas: 10 de 10.

**HU-48.** La pestaña Sanidad lista las aplicaciones con quién las aplicó; se registró Ivermectina al 0501 y el historial la muestra junto con los pesajes de Brian, en orden. Pruebas: 11 de 11.

**HU-49.** El veterinario ve en la barra «Registrar pesaje» y «Aplicar producto» (las dos acciones integradas). Pruebas: 8 de 8.

**HU-52.** En 390 × 844 px: buscó el 0503, registró Ivermectina, el botón principal no se movió (647 px antes y al registrar) y la caravana volvió a quedar vacía y con el foco.

---

## 3. Bugs y observaciones

| Id | Prioridad | Historia | Qué pasa | Responsable | Estado |
| :-- | :-- | :-- | :-- | :-- | :-- |
| B-1 | Baja | HU-32 / HU-53 | Después de registrar un pesaje en la ficha de un animal, al abrir la ficha de **otro** animal sigue el aviso verde del anterior («Listo, registraste el pesaje de 0501» en la ficha de QA01). El aviso no se borra al cambiar de animal. | Taborga Rafael (Aaron) | Pendiente |
| B-2 | Baja | HU-53 | Con una fecha futura, «Registrar pesaje» queda deshabilitado, pero no aparece ningún mensaje que diga por qué. | Aranibar Brian | Pendiente |

Ninguno impide aprobar las historias.

---

## 4. Asistente con inteligencia artificial (RF-38 a RF-42)

En Trello todavía no tiene tarjeta con criterios. Se probó lo básico: que se le pueda preguntar por los datos del rancho y que conteste bien, respetando lo que cada rol puede ver.

**Pruebas automáticas (sin gastar la cuota de Gemini).** `servidor/pruebas/asistente.test.js` **21 de 21** y `cliente/pruebas/asistente.test.tsx` en verde, contra un Gemini simulado: responde usando las herramientas de solo lectura, no ofrece herramientas de módulos que el rol no ve, no sale del rancho, cuenta la cuota del mes, reenvía las llamadas a herramientas como pide Gemini 3 y la voz (transcribir y leer).

**Pantalla.** `/asistente` carga con las cuatro preguntas de ejemplo, el campo de pregunta, «Hablar», «Preguntar» y «0 de 30 consultas usadas este mes».

**Preguntas con el modelo real.** Pendiente: la base local no tiene `ASISTENTE_CLAVE`. Ver la sección 5 de este informe cuando se complete.

---

## 5. Veredicto

**Se aprueban las 14 historias del Sprint 4.** Pueden pasar de «En Revisión» a «Finalizado». B-1 y B-2 quedan registrados como mejoras menores en `SQA_GANADO.xlsx`.
