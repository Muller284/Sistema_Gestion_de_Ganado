# Verificación de calidad — tarjetas «En Revisión» del Sprint 2

**Fecha:** 13 de octubre de 2026  **Verificó:** Romina Poma (encargada de calidad)

Se verificaron contra los **criterios de aceptación de Trello**, no contra lo
tildado. Para cada historia: el código, las pruebas automáticas y, cuando hizo
falta, pedidos HTTP a mano contra el servidor levantado.

| Rama | Commit | Cómo se probó |
| :-- | :-- | :-- |
| `main` (Aaron) | `dd025a0` | Dentro de `Poma`, que ya incluye `main`: base nueva, 200 pruebas del servidor y 15 del cliente. |
| `Aranibar` (Brian) | `0398447` (13/10, 19:42) | Copia aparte, base nueva (`npm run migrar` y `npm run sembrar`), servidor en el puerto 3001 y las 12 pruebas del equipo. |

## Resumen

| Historia | Responsable | Veredicto |
| :-- | :-- | :-- |
| HU-20 Tipos de colaborador | Aaron | **Aprobada** |
| HU-24 Acceso total del Admin | Aaron | **Aprobada** |
| HU-25 Español e inglés | Aaron | **Aprobada** |
| HU-09 Recuperación de contraseña | Brian | No aprobada |
| HU-14 Selección de país e idioma | Brian | No aprobada |
| HU-18 Permisos iniciales de solo consulta | Brian | No aprobada |
| HU-19 Permisos por módulo | Brian | No aprobada |
| HU-23 Registro de autoría | Brian | No aprobada |
| HU-27 Registro de animal | Brian | No aprobada |
| HU-29 Listado de animales con filtros | Brian | No aprobada |

## Aaron

**HU-20.** Los cuatro tipos predefinidos existen, se crean tipos propios
eligiendo módulos y el cambio de permisos alcanza a todos los colaboradores del
tipo. `tipos.test.js`: 24 de 24.

**HU-24.** El Admin entra a cualquier rancho con un acceso registrado, no se
puede crear desde Equipo («El rol tiene que ser socio o colaborador») y cada
acceso queda guardado. `admin.test.js`: 18 de 18.

**HU-25.** Los textos están en `idiomas/`; el idioma sale del país y se cambia
en Mi perfil; un idioma nuevo es un archivo más (`import.meta.glob` en el
cliente y lectura de la carpeta en el servidor). `idiomas.test.js` (3 de 3),
`idioma-cuenta.test.js` (9 de 9) y `cliente/pruebas/idiomas.test.ts` (7 de 7).

Observación (no bloquea): el PR #12 se fusionó sin aprobación de otra persona.
Esta verificación cubre esa revisión.

## Brian

### Estado general de la rama

| Comprobación | Resultado |
| :-- | :-- |
| Compilación del servidor y del cliente | Pasa |
| Lint del cliente | **7 errores** (`any`, JSX dentro de try/catch, setState en un efecto) |
| Pruebas del cliente | **2 de 8 fallan**: textos escritos en el código (HU-25) |
| Pruebas del servidor del equipo | **5 fallan que en `main` pasan**: `idiomas` (1), `perfil` (2), `idioma-cuenta` (2) |
| Pruebas nuevas para sus historias | **Ninguna** |

Las fallas de `perfil` e `idioma-cuenta` son un error 500:
`repositorio-usuario.ts:152` pide `t.permisos`, una columna que no existe. Eso
también rompe Mi perfil en la pantalla.

### Por historia

**HU-27 · No aprobada.** En una instalación limpia el alta no funciona: el
controlador consulta `u.permisos` (no existe) y el `INSERT` usa columnas
(`nombre`, `raza`, `sexo`, `categoria`, `corral_asignado`, `peso_inicial`,
`fecha_nacimiento`, `creado_por`) que su migración 008 no crea. La 008 usa
`rancho_id INT`, pero los ranchos son UUID. Respuesta real a un alta del
propietario: `400 «no existe la columna u.permisos»`. Lo que sí mejoró: ya no
toma el rol ni el rancho de cabeceras del cliente, y sin sesión responde 401.

**HU-29 · No aprobada.** Depende de la misma tabla. `GET /animales` del
propietario de otro rancho responde 500. Los filtros no se pudieron probar.

**HU-18 · No aprobada.** Los permisos explícitos se guardan en
`usuarios.permisos`, una columna que ninguna migración crea. En lugar de eso,
hay que usar `permisos_usuario` (como HU-21) y `permisos_tipo_vigentes`.

**HU-19 · No aprobada.** Criterio 3 («rechaza operaciones sobre módulos no
habilitados aunque se intente desde fuera de la interfaz»): solo hay controles
dentro de animales, y no funcionan por lo anterior. Ya existe
`servidor/src/comun/permisos-modulo.ts` (DECISIONES.md, punto 35), que lo
resuelve para cualquier módulo y está probado.

**HU-09 · No aprobada.** Criterio 3 («al cambiar la contraseña se cierran las
demás sesiones»): el código agregado busca `this.tokens.dataSource`, que
`RepositorioToken` no tiene (usa `Pool`). La consulta nunca corre y el error se
traga con `.catch(() => {})`. Además borra de `tokens` y no de `sesiones`.
Hay que usar `RepositorioSesion.revocarTodasDeUsuario` (decisión 29).

**HU-14 · No aprobada.** Criterio 2 («se puede cambiar después desde los
ajustes»): la pantalla de Mi perfil tiene el selector de país, pero
`PATCH /usuarios/yo/perfil` responde 500 (la columna `t.permisos`).

**HU-23 · No aprobada.** Criterio 2 («el dato de autoría se muestra en la
ficha»): solo aparece en la ficha del rancho, y el servidor no manda
`creado_por_nombre` ni `modificado_por_nombre`, así que siempre dice «Sistema» y
«—». Los textos están escritos en el código (rompe la prueba de HU-25).

### Qué tiene que pasar para aprobarlas

1. Usar la tabla `animales` de la migración 008 de `Poma` (UUID, identificador
   único por rancho, autoría, baja lógica) en vez de su 008.
2. Poner `GuardiaCuentaLista` y `PermisosModulo` en sus controladores, y sacar
   `usuarios.permisos` y `tipos_colaborador.permisos`.
3. HU-09: revocar con `RepositorioSesion`.
4. HU-23: devolver los nombres de autoría desde el servidor y mostrarlos con `t()`.
5. Agregar pruebas automáticas por historia y dejar en verde lint y pruebas.

Las siete vuelven a **«En Proceso»** hasta que eso esté.

---

## Re-verificación del 21/10/2026

Brian corrigió lo marcado arriba en el PR #18 (commit `13e7a22`, fusionado el
19/10). Se verificó `main` en `700785b`, que ya incluye además el Sprint 3 de
Romina (PR #16) y HU-32/HU-35 de Aaron (PR #20).

### Cómo se probó

- Base nueva: `npm run migrar` (8 migraciones, una sola 008) y `npm run sembrar`.
- Las 27 suites del servidor, una tras otra: **282 de 282**. Brian sumó 7
  archivos de pruebas propios (`sesiones-contrasena`, `pais-perfil`,
  `baja-propietario`, `permisos-importacion`, `registro-animal`,
  `filtros-animales`, `autoria-animales`).
- Cliente: compilación sin errores, lint en 0, **39 de 39** pruebas, build correcto.
- Integración continua de `main`: en verde.
- Además, a mano contra el servidor, se repitieron los mismos ataques y
  pedidos que fallaron el 12 y el 13/10:

| Historia | Lo que fallaba | Hoy |
| :-- | :-- | :-- |
| HU-09 | El refresco viejo seguía sirviendo después de cambiar la contraseña | 401: la sesión vieja queda cerrada |
| HU-14 | `GET` y `PATCH /usuarios/yo/perfil` daban 500 | 200, y el país se cambia desde Mi perfil |
| HU-18 | Un colaborador con edición podía dar de baja; permisos en el navegador | 403 al colaborador; las cabeceras falsas no dan permisos |
| HU-19 | El servidor no rechazaba operaciones sobre módulos no habilitados | El veterinario recibe 403 al registrar, aunque mande `x-usuario-rol: propietario` |
| HU-23 | La ficha decía siempre «Sistema» | La ficha muestra quién registró y quién modificó |
| HU-27 | El alta fallaba en una base nueva | Alta con caravana, número interno y RFID; 409 si se repite en el rancho; permitido en otro rancho |
| HU-29 | `GET /animales` daba 500; filtros en el navegador | Búsqueda y filtros en el servidor; el otro rancho no se ve ni con `x-rancho-id` |
| PR #17 | Borraba `.env.ejemplo` | `.env.ejemplo` está en `main` |

### Veredicto

**Las siete historias de Brian quedan aprobadas por calidad** (HU-09, 14, 18,
19, 23, 27 y 29) y pueden pasar a «Finalizado».

Observación, no bloquea: con `USUARIO_DEMO_ID` en el `.env`, un pedido sin
sesión se atiende como el usuario de demostración. Es el modo de desarrollo
del Sprint 1 y vale para todos los módulos; antes de publicar el sistema hay
que quitar esa variable.
