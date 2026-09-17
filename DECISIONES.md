# Decisiones técnicas

Registro de las decisiones que **no** estaban resueltas en la propuesta, el
backlog, la división en fases ni la guía de arranque técnico, y que hubo que
tomar para poder escribir código.

Regla de este archivo: si una decisión se toma en una conversación, en el grupo
de mensajes o en una reunión, no existe hasta que está acá. El equipo que tome
la Fase 2 no va a poder preguntarnos.

Formato de cada entrada: qué se decidió, por qué, qué alternativa se descartó y
quién la tomó.

---

## 1. La migración inicial se reescribe en lugar de corregirse con una segunda

**Fecha:** 13 de septiembre · **Decidió:** Aaron · **Revisa:** Brian

La guía de arranque dice que las migraciones se numeran y nunca se editan una
vez subidas: si algo está mal, se crea una migración nueva que lo corrija.
Acá se hizo la excepción y se reescribió la primera.

**Por qué.** La corrección implica renombrar ocho tablas y unas cuarenta
columnas, cambiar el tipo de todas las claves primarias y eliminar dos tablas.
Una migración correctiva de ese tamaño es más larga y más frágil que el esquema
entero, y deja a cualquiera que lea el repositorio dentro de un mes teniendo que
aplicar dos archivos mentalmente para saber cómo es una tabla.

La regla existe para proteger bases de datos que ya tienen información y
entornos donde la migración vieja ya corrió. Acá no se cumple ninguna de las
dos condiciones: nadie levantó todavía una base de datos y el archivo original
ni siquiera terminaba en `.sql`, así que ningún corredor lo habría tomado.

**Alternativa descartada.** Dejar `V1` como está y agregar un `V2` con los
`ALTER TABLE`. Se descartó por lo anterior.

**Desde ahora la regla vuelve a valer.** `001_fase1_esquema_inicial.sql` no se
edita más una vez integrado en `main`. Cualquier corrección posterior entra
como `002_*.sql`.

---

## 2. Los catálogos usan su código como clave primaria, no un UUID

**Fecha:** 13 de septiembre · **Decidió:** Aaron · **Revisa:** Brian

La guía dice que toda tabla lleva un `id` de tipo UUID. Tres tablas no lo
llevan: `paises` usa `codigo` (`BO`, `AR`), `franjas_precio` usa `codigo`
(`A`, `B`, `C`) y `modulos` usa `codigo` (`animales`, `corrales`).

**Por qué.** Son catálogos cerrados, cortos y estables, definidos por el
sistema y no cargados por el usuario. Su código ya es un identificador único y
estable, y además es legible: al leer una fila de `ranchos` se entiende
`pais_codigo = 'BO'` y no se entiende
`pais_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'`. Lo mismo vale para leer una
consulta o depurar un error.

El UUID generado en el cliente existe para que el celular pueda crear registros
sin conexión y sin pedirle un número a nadie. Ningún colaborador va a crear un
país desde el campo, así que la razón no aplica.

**Alternativa descartada.** Ponerles un UUID y dejar el código como columna
única aparte. Cumple la letra de la regla, agrega una unión más a cada consulta
y no resuelve ningún problema real.

**Todas las demás tablas sí llevan `id` UUID**, sin excepción.

---

## 3. `usuarios.rancho_id` acepta nulo

**Fecha:** 13 de septiembre · **Decidió:** Aaron

Un usuario pertenece a un único rancho, pero la columna que lo dice puede estar
vacía.

**Por qué.** Hay dos casos legítimos y ninguno es un error de carga.

El primero es el orden de la puesta en marcha. El propietario se registra
(HU-06) y recién después crea su rancho (HU-15). Entre esos dos momentos existe
como usuario y no tiene rancho. No hay forma de invertir el orden: el rancho
necesita un propietario y el propietario necesita existir antes.

El segundo es el admin de plataforma (HU-24), que da soporte a cualquier cuenta
y por definición no pertenece a ninguna. Un `CHECK` en la tabla obliga a que su
`rancho_id` sea siempre nulo.

**Consecuencia para la capa de acceso a datos (HU-03).** Un usuario sin rancho
no puede leer ni escribir datos productivos. El filtro por rancho no debe
tratar el nulo como "todos los ranchos" sino como "ningún rancho", salvo para
el rol `admin_plataforma`, que es la única excepción y tiene que estar escrita
explícitamente en un solo lugar.

---

## 4. Las tablas de autenticación no son entidades del modelo

**Fecha:** 13 de septiembre · **Decidió:** Aaron · **Revisa:** Brian

El modelo de datos aprobado tiene ocho entidades para la Fase 1. La migración
crea once tablas. Las tres de más son `tokens`, `sesiones` y
`migraciones_aplicadas`, y están en una sección aparte del archivo, rotulada
como tablas de apoyo.

**Por qué.** Cuatro historias del Sprint 1 no tienen dónde guardar su
información: HU-07 necesita el enlace de verificación con su vencimiento a las
24 horas, HU-09 el de recuperación con vencimiento a la hora y un solo uso,
HU-12 el token de refresco revocable y HU-11 el conteo de intentos fallidos
(este último resuelto con dos columnas en `usuarios`, no con una tabla).

Esto no agrega alcance: son historias que ya estaban comprometidas. El modelo
de datos se dibujó desde el negocio y no desde la implementación, así que las
tablas técnicas no aparecen ahí.

**Los tokens se guardan con hash, nunca en claro.** Si alguien lee la base de
datos no puede usar los enlaces de verificación ni los de recuperación. Es la
misma razón por la que HU-08 exige guardar la contraseña con hash.

---

## 5. `modificado_en` la mantiene un disparador, no la capa de repositorio

**Fecha:** 13 de septiembre · **Decidió:** Aaron · **Revisa:** Brian

Cada tabla tiene un disparador `BEFORE UPDATE` que pone `modificado_en` en la
hora actual. La capa de repositorio no necesita escribirla.

**Por qué.** Es la marca que usa la sincronización de la Fase 5 para decidir
qué versión de un registro es más nueva. Si depende de que alguien la escriba
en cada `UPDATE`, en algún momento alguien se va a olvidar, y ese registro no
se va a sincronizar nunca. El error no se ve en pantalla: aparece meses después,
en otra fase, como un dato que desaparece.

Con disparador no hay forma de olvidarse, y son diez líneas de una sola vez.

**Alternativa descartada.** Escribirla desde la capa de repositorio. Funciona
mientras nadie escriba una consulta por fuera, que es exactamente lo que la
guía prohíbe pero no puede impedir.

**Lo que el disparador no hace.** `creado_por` y `modificado_por` los sigue
poniendo la capa de repositorio, porque la base de datos no sabe qué usuario
está autenticado. Eso es parte de HU-23.

---

## 6. `creado_por` y `modificado_por` no llevan llave foránea

**Fecha:** 13 de septiembre · **Decidió:** Aaron · **Revisa:** Brian ·
**Estado:** provisional

Son columnas UUID sin restricción de llave foránea hacia `usuarios`.

**Por qué.** Dos casos las romperían. El primer usuario del sistema se crea a
sí mismo, así que en el momento del `INSERT` su `creado_por` apunta a una fila
que todavía no existe. Y en la Fase 5 puede llegar un registro creado sin
conexión por un usuario que todavía no se sincronizó.

**Es provisional.** Si Brian decide que la integridad referencial vale más que
esos dos casos, se agrega la llave y se resuelve el arranque con una fila
semilla. Lo importante es que esté decidido y no olvidado.

---

## 7. El correo es único entre los usuarios vigentes, no históricamente

**Fecha:** 13 de septiembre · **Decidió:** Aaron

El índice único sobre el correo es parcial: `WHERE eliminado_en IS NULL`.
Además compara en minúsculas, así que `aaron@x.bo` y `AARON@X.BO` son el mismo
correo.

**Por qué.** HU-13 exige que el correo sea único en toda la plataforma, y sin
comparar en minúsculas esa regla se esquiva escribiendo una mayúscula. La parte
parcial resuelve otra cosa: como nada se borra de verdad, sin el `WHERE` un
colaborador dado de baja bloquearía su correo para siempre, y una persona que
deja un rancho y entra a otro no podría volver a registrarse.

**Consecuencia.** Dos usuarios pueden tener el mismo correo si uno está dado de
baja. Cualquier consulta que busque por correo tiene que filtrar por
`eliminado_en IS NULL`, igual que todas las demás.

---

## 8. Con qué se corren las migraciones

**Estado:** PENDIENTE · **Decide:** Brian · **Fecha límite:** lunes 14

No está elegido y hace falta para la demostración del miércoles.

Las migraciones están escritas como archivos `.sql` numerados en
`servidor/migraciones/`. El prefijo `V1__` del archivo original correspondía a
Flyway, que es una herramienta de Java y no encaja con el stack.

**Recomendación.** Dejarlas como `.sql` numerados y correrlas con un script de
Node de unas cuarenta líneas que aplique en orden las que faltan y anote cuál
aplicó en la tabla `migraciones_aplicadas`, que ya está creada. Ventaja: no
agrega dependencias, cualquiera del equipo puede leerlo, y el SQL sigue siendo
legible tal cual para el informe de la materia. TypeORM se usaría solo para la
capa de repositorio, con `synchronize` en `false`.

**Alternativa.** Usar las migraciones de TypeORM, que son archivos TypeScript.
Funciona igual de bien y está más integrado con NestJS.

Lo único que no hay que hacer es mezclar las dos cosas.

---

## 9. Ramas por persona en lugar de ramas por historia

**Fecha:** 13 de septiembre · **Decidió:** el equipo

La guía de arranque, punto 8, define ramas por historia de usuario
(`feature/HU-02-esquema-bd`). En la práctica el equipo trabaja con una rama por
persona: `Taborga`, `Aranibar`, `Müller`, `Poma`.

**Por qué se deja así.** Cambiar el esquema de trabajo a tres días de la
demostración cuesta más de lo que rinde, y todos ya tienen su rama configurada.

**Qué se pierde y cómo se compensa.** Con una rama por historia, cada
solicitud de integración contiene una historia y se revisa contra sus criterios
de aceptación. Con una rama por persona, la solicitud contiene todo lo que esa
persona hizo desde la última vez, así que la revisión es más difícil y los
conflictos son más grandes.

Se compensa con tres reglas, explicadas en `GUIA_GITHUB.md`:

1. Cada uno integra su rama a `main` **al terminar cada historia**, no al final
   de la semana. Una solicitud por historia, aunque la rama sea por persona.
2. Cada uno actualiza su rama desde `main` **antes de empezar a trabajar**,
   todos los días que trabaje.
3. El mensaje de cada commit sigue llevando el código de la historia:
   `feat(HU-15): formulario de creación de rancho`. Es lo único que permite
   saber después qué cambio pertenece a qué historia.

**Se revisa después del miércoles.** Si al integrar aparecen conflictos
grandes, conviene volver a las ramas por historia para el Sprint 2.

---

## 10. Cambios de responsable respecto del backlog

**Fecha:** 13 de septiembre · **Decidió:** Aaron

Dos historias cambian de dueño respecto del `Product_Backlog_Ganado.docx` y de
las tarjetas de Trello:

| Historia | En el backlog | Ahora | 
|---|---|---|
| HU-15 Creación del rancho | Brian | **Aaron** |
| HU-14 Selección de país e idioma | Aaron | **Brian** |

Es un intercambio, así que la carga de cada uno no cambia. Hay que actualizar
las dos tarjetas en Trello y el documento del backlog.

---

## 11. El sistema de diseño necesita variables de espaciado

**Fecha:** 13 de septiembre · **Decidió:** Aaron · **Estado:** pendiente de
hacer en HU-05

El archivo `estilos.css` que viene de los mockups define como variables los
colores, los radios, las sombras y las familias tipográficas, pero **no el
espaciado**: los espacios están como clases de utilidad (`.g4` … `.g48`) y como
píxeles escritos a mano dentro de cada componente.

HU-05 pide, textual, que "los tokens de color, tipografía, espaciado y radio
estén definidos como variables". Así que al llevar el archivo al proyecto hay
que agregar la escala de espaciado como variables y reemplazar los valores
escritos a mano dentro de los componentes.

**Lo que no se toca.** Ningún valor cambia. Los colores, las tipografías y los
radios son los mismos que están en Figma y son los mismos que van a las
pantallas. Esto es solo exponerlos como variables.

---

## 12. Cómo quedó armado el sistema de diseño en el proyecto

**Fecha:** 16 de septiembre · **Decidió:** Aaron · **Estado:** hecho en HU-05

El `estilos.css` que salió de los mockups se llevó al proyecto **sin cambiar un
solo valor**, y se partió en tres archivos dentro de `cliente/src/estilos/`,
con un cuarto que los une:

| Archivo | Qué contiene |
|---|---|
| `tokens.css` | Los valores: color, tipografía, espaciado, radio, sombra, medidas |
| `base.css` | Puesta a cero, clases de tipografía y utilidades |
| `componentes.css` | Las clases de los componentes |
| `estilos.css` | El punto de entrada: importa los tres anteriores, en orden |

Se importa una sola vez, desde `main.tsx`. Ninguna pantalla importa un `.css`
propio.

**Por qué partido y no un solo archivo.** Porque el criterio de aceptación dice
que ninguna pantalla define colores ni tamaños por fuera del sistema, y esa
regla solo se puede revisar si hay un único archivo donde mirar. Hoy
`tokens.css` es el único lugar del cliente donde aparece un valor escrito a
mano. Cualquier otro archivo con un `#` de color o un `px` es un error que se
ve de inmediato.

**Los nombres de las clases y de las variables no cambiaron.** Siguen siendo
`--corral-600`, `--arena-100`, `--r-md`, `.btn-primario`, `.campo`, `.tarjeta`,
`.insignia`, `.aviso`, `.vacio`. Es lo que permite que una pantalla armada como
mockup se traiga al proyecto sin reescribirle las clases.

**Lo que se agregó, que es lo que faltaba de la decisión 11.** El espaciado
ahora son variables (`--e-4` … `--e-48`), y también los tamaños e interlineados
de texto (`--t-cuerpo`, `--lh-cuerpo`, …) y el alto de los controles
(`--alto-control`, `--alto-control-movil`). Los valores son exactamente los que
ya estaban escritos a mano dentro de cada componente y en las utilidades
`.g4 … .g48`; lo único nuevo es que ahora tienen nombre.

**Lo que no se trajo.** `.pantalla-web` y `.pantalla-movil` son marcos de ancho
fijo, 1440 y 390 píxeles, que sirven para el archivo de mockups. La aplicación
de verdad es fluida, así que en su lugar hay un contenedor `.pagina` con el
mismo aire pero sin ancho fijo. Tampoco se trajo `.rotulo`, que es el letrero
que identifica cada mockup.

**Se agregaron dos componentes que no estaban en la lista del criterio.** El
aviso (`.aviso`), que ya venía en el archivo de estilos y que toda pantalla
necesita para mostrar un error o una confirmación: sin él cada uno pinta su
propio rojo a mano, que es justo lo que HU-05 impide. Y el esqueleto de carga
(`.esqueleto`), porque el inventario de pantallas pide esqueletos con la forma
del contenido y no una rueda girando.

**Insignias con nombre semántico.** Las cinco de los mockups son de dominio:
activo, vendido, muerto, archivado y plan. Se agregaron las mismas con nombre
general (`ins-exito`, `ins-info`, `ins-neutro`, `ins-adv`, `ins-error`), porque
una insignia que dice "Sin verificar" no es un animal archivado. Los colores
son los mismos.

**El dorado caravana tiene dos usos y ninguno más.** El botón `.btn-plan` y la
insignia `.ins-plan`. Es la regla del inventario de pantallas y es lo que se
revisa en la revisión cruzada.

**Componentes de React sobre las clases.** En `cliente/src/componentes/` hay un
componente por cada uno: `Boton`, `Campo` con `CampoTexto` y `CampoLista`,
`Tarjeta`, `Insignia`, `EstadoVacio`, `Alerta` y `Cargando`. Las pantallas usan
el componente, no la clase. Así la etiqueta queda siempre unida a su control,
que es lo que permite completar un formulario con el teclado, y nadie tiene que
acordarse de qué clase va con cuál.

**Catálogo dentro del proyecto.** Se agregó la pantalla `#/sistema-diseno`, que
muestra todos los tokens y todos los componentes funcionando. Es el equivalente
de la página 00 de Figma, pero dentro del código. Sirve para que nadie invente
un componente que ya existe, para ver de un vistazo si un cambio en los tokens
rompió algo, y para demostrar HU-05, que de otro modo no tiene nada que mostrar.

**Navegación provisional.** No se instaló un enrutador: la regla del equipo es
que las dependencias las instala Favio, y con dos pantallas no hace falta.
`App.tsx` mira la dirección del navegador (`#/` y `#/sistema-diseno`). Cuando
existan las pantallas de acceso se reemplaza por un enrutador de verdad y
ninguna pantalla se entera.

**Tipografías.** El `@import` de Google Fonts que traía el archivo de estilos se
movió a `index.html`, con `preconnect`. Es el mismo pedido, pero el navegador lo
empieza antes en lugar de esperar a que termine de descargar el CSS. Las
familias alternativas quedan declaradas en `tokens.css`, así que sin conexión la
pantalla sigue siendo legible aunque cambie la letra.

**Se borraron `App.css` e `index.css`.** Eran la plantilla de Vite: definían
colores y tamaños por fuera del sistema, que es justo lo que el tercer criterio
prohíbe.

**El `estilos.css` de la raíz queda como fuente de los mockups.** Ya no lo usa
el proyecto. Conviene moverlo a `documentos/` para que nadie lo edite pensando
que está cambiando la aplicación.

**La pantalla de HU-15 se revistió sin tocar su lógica.** Son las mismas
llamadas, los mismos estados y las mismas reglas. Lo único que cambió es que ya
no queda un solo color ni un solo tamaño escrito a mano en la pantalla.
