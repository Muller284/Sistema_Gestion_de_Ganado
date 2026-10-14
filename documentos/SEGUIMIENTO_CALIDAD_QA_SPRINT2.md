# SEGUIMIENTO DE CALIDAD (QA) — SISTEMA DE GESTIÓN DE GANADO
**Materia:** Proyectos
**Responsable QA:** Romina Poma Matias
**Modelo:** Scrum + ISO/IEC 25010
**Ámbito:** Sprint 2 — historias de Romina

> Este documento reemplaza la versión del 07/10, que daba el sprint como
> terminado al 100 % sin que el código lo estuviera (ver la revisión del
> Sprint 2 del 12/10). Los números de abajo salen de correr las pruebas.

---

## 1. Estado de las historias de Romina

| Historia | Título | Pts | Criterios | Pruebas automáticas |
| :-- | :-- | :-: | :-- | :-- |
| HU-21 | Vista de solo lectura del socio | 2 | 3 de 3 | `socio.test.js` (crit. 1 y 2), `permisos.test.js` (crit. 3) |
| HU-22 | Vista limitada del colaborador | 2 | 3 de 3 | `colaborador.test.js`, `permisos.test.js` |
| HU-26 | Unidades y formatos por país | 2 | 3 de 3 | `cliente/pruebas/unidades.test.ts` |
| HU-28 | Datos de la ficha del animal | 3 | 3 de 3 | `animales.test.js` |
| HU-33 | Cambio de estado del animal | 3 | 3 de 3 | `animales.test.js` |
| HU-34 | Baja lógica de registros | 3 | 3 de 3 | `animales.test.js`, `corrales.test.js` |
| HU-36 | Creación de corrales | 3 | 3 de 3 | `corrales.test.js` |
| HU-39 | Historial de movimientos entre corrales | 3 | 3 de 3 | `animales.test.js` |

Todas quedan para **«En Revisión»**: según la regla del equipo, ninguna pasa a
«Finalizado» sin que otra persona la verifique.

La importación CSV (HU-40 a HU-45) no es del Sprint 2. El código que estaba en
la rama se corrigió (textos, sesión, campos de la pantalla), pero **todavía
guarda en memoria**: falta conectarla a la tabla `animales` cuando llegue su
sprint.

## 2. Ejecución de pruebas (13/10/2026, sobre una base nueva)

| Conjunto | Resultado |
| :-- | :-- |
| Servidor, Sprint 1 y Aaron (12 archivos) | 141 de 141 |
| Servidor, Romina (6 archivos) | 59 de 59 |
| **Servidor, total** | **200 de 200** |
| Cliente (`vitest`, incluye idiomas y unidades) | 15 de 15 |
| Compilación del servidor y del cliente (`tsc`) | Sin errores |
| Lint del cliente | 0 errores |

Además se recorrieron a mano en el navegador: crear un corral, registrar un
animal con corral, cambiar su estado (con la confirmación), ver los
historiales, entrar como veterinario (menú limitado y 403 explicado en
Corrales) y abrir los permisos de un socio como propietario.

## 3. Pendiente de calidad

- Verificar las tarjetas de los demás que esperan en «En Revisión».
- Que otra persona revise el PR antes de fusionarlo.
- Coordinar con Brian: la tabla `animales` ya existe en la migración 008
  (ver DECISIONES.md, punto 35).
