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

## 13. El correo se "envía" por consola hasta que el equipo decida cómo enviarlo

**Fecha:** 20 de septiembre · **Decidió:** Aaron · **Estado:** hecho en HU-07

HU-07 necesita mandar un correo y el equipo todavía no cerró con qué. Esperar
esa decisión habría dejado la historia parada, así que se resolvió con una
capa: `servidor/src/comun/servicio-correo.ts` define la interfaz
`TransporteCorreo` y trae una sola implementación, la de consola, que escribe
el mensaje completo con su enlace en la salida del servidor.

**No finge que el correo se envió.** El mensaje dice, en la propia consola, que
no se envió nada. Y la respuesta del registro devuelve el enlace solo mientras
el transporte sea el de consola: con un servidor de correo de verdad ese campo
llega nulo y el enlace existe únicamente en el correo.

**Cómo se conecta el correo real.** Se agrega una clase que implemente
`TransporteCorreo` y se la elige con la variable `CORREO_TRANSPORTE`. No hay
que tocar ningún otro archivo: ni el servicio de verificación, ni el de
contraseñas, ni los controladores. Si se pone una variable con un valor que no
existe, el servidor no arranca y dice por qué, en lugar de quedarse callado
sin mandar correos.

Esto también deja resuelto HU-09, que es de Brian: la recuperación de
contraseña usa la misma capa y la misma tabla de tokens.

---

## 14. El enlace del correo apunta al cliente, no al servidor

**Fecha:** 20 de septiembre · **Decidió:** Aaron · **Estado:** hecho en HU-07

El enlace de verificación es `<cliente>/#/verificar?token=...`, y la pantalla
del cliente manda el token al servidor por POST.

Lo normal sería que el enlace apuntara directo al servidor. Se hizo al revés
por una razón: un token que sirve para activar una cuenta viaja en la
dirección, y las direcciones quedan escritas en los registros de acceso de
todos los servidores por los que pasa la petición. Yendo al cliente, el token
viaja una sola vez, dentro del cuerpo de un POST.

El token tampoco se guarda en la base: se guarda su huella SHA-256. Si alguien
leyera la tabla `tokens`, no podría reconstruir ningún enlace.

---

## 15. Un solo portero para dos historias

**Fecha:** 20 de septiembre · **Decidió:** Aaron · **Estado:** hecho en HU-07 y HU-10

Dos criterios de aceptación de historias distintas son la misma regla:

- HU-07: "Sin confirmar el correo no se puede usar el sistema."
- HU-10: "No puedo llegar a ninguna otra pantalla antes de cambiarla."

Los dos los impone `GuardiaCuentaLista`, en `servidor/src/comun/`. Se pone en
los controladores que manejan datos del rancho y devuelve un 403 con un campo
`motivo`, para que el cliente sepa a qué pantalla mandar al usuario sin tener
que interpretar el texto del mensaje.

**No se pone en el controlador de usuarios**, a propósito: ahí viven las dos
salidas, confirmar el correo y cambiar la contraseña. Un portero que también
cerrara la salida dejaría la cuenta encerrada para siempre.

El cliente hace lo mismo desde `App.tsx`, preguntando por `GET /usuarios/yo`.
Eso es comodidad, no seguridad: cualquiera puede llamar al servidor sin pasar
por la pantalla. Si la regla no está en el servidor, no está.

---

## 16. El propietario nunca ve la contraseña que restablece

**Fecha:** 20 de septiembre · **Decidió:** Aaron · **Estado:** hecho en HU-10

`POST /usuarios/:id/restablecer-contrasena` genera una clave temporal, la
guarda cifrada, deja al usuario obligado a cambiarla y **se la manda por correo
a su dueño**. La respuesta que ve el propietario dice que se envió y nada más.

No es un detalle de forma. Si el propietario pudiera ver la contraseña de su
colaborador, podría entrar como él, y entonces el "creado por" de HU-23 no
probaría nada. El registro de autoría vale exactamente lo que valga esta regla.

Las contraseñas temporales se generan sin caracteres que se confundan al
dictarlas: sin O ni 0, sin l ni 1.

---

## 17. Dos cuentas nuevas en las semillas

**Fecha:** 20 de septiembre · **Decidió:** Aaron · **Estado:** hecho

Todas las cuentas de prueba tenían el correo confirmado y ninguna debía
cambiar su contraseña, que es justo el estado que HU-07 y HU-10 bloquean: sin
tocar las semillas, ninguna de las dos historias se podía demostrar.

Se agregaron dos, con el mismo criterio de datos verosímiles que usó Romina:

| Cuenta | Para qué | Contraseña |
|---|---|---|
| Lucía Méndez Solíz, propietaria | Se registró y no confirmó el correo (HU-07) | `Ganado2026` |
| Rubén Quispe Mamani, colaborador | Tiene clave temporal sin cambiar (HU-10) | `Temporal2026` |

Las semillas son de Romina. Que revise si le parecen bien; son dos INSERT al
final del archivo y no tocan nada de lo que ya estaba.

---

## 18. El correo se envía con Brevo, por HTTP y sin dependencias

**Fecha:** 20 de septiembre · **Decidió:** Aaron · **Estado:** hecho

El transporte de consola se queda como el de por defecto, para desarrollo y
para las pruebas. Al lado queda uno que envía de verdad, con la API de Brevo.

**Por qué Brevo y no nodemailer con Gmail**, en orden de peso:

1. **No agrega dependencias.** Brevo se usa con una petición HTTP normal, y
   Node ya trae `fetch`. `nodemailer` habría sido un paquete nuevo.
2. **No usa SMTP.** Muchas redes universitarias y varios servicios de hosting
   bloquean los puertos de SMTP; el 443 no lo bloquea nadie. Una contraseña de
   aplicación de Gmail además obliga a tener la verificación en dos pasos
   activada en esa cuenta.
3. **300 correos por día gratis, sin tarjeta**, y se le puede enviar a
   cualquier destinatario, no solo a uno mismo. Para un proyecto de materia
   sobra.

**Cómo se configura**, una sola vez y lo puede hacer cualquiera:

1. Crear una cuenta en brevo.com.
2. Agregar el correo del remitente y confirmarlo con el código de seis dígitos
   que llega a esa dirección.
3. Sacar una clave de API y ponerla en el `.env`:

```
CORREO_TRANSPORTE=brevo
BREVO_API_KEY=...
CORREO_REMITENTE=el.correo.confirmado@gmail.com
CORREO_REMITENTE_NOMBRE=Sistema de Gestión de Ganado
```

Si la variable está en `brevo` y falta la clave o el remitente, **el servidor
no arranca y dice por qué**. Es a propósito: es mejor que no levante a que
levante y los correos se pierdan en silencio. Lo mismo si Brevo rechaza un
envío: el error sube, no se traga.

**Advertencia honesta.** Enviando desde un correo gratuito el mensaje llega,
pero tiene más probabilidad de caer en la carpeta de no deseados, porque un
dominio gratuito no se puede autenticar. Para el producto de verdad hace falta
un dominio propio. Para la materia alcanza; solo hay que mirar esa carpeta si
no aparece.

El correo va con los colores del sistema de diseño y con los estilos escritos
dentro de cada etiqueta, porque los programas de correo descartan las hojas de
estilo. Es el único lugar del proyecto donde se escriben colores a mano, y los
valores son los mismos de `tokens.css`.

---

## 19. Las pantallas se llevaron al diseño de los mockups

**Fecha:** 20 de septiembre · **Decidió:** Aaron · **Estado:** hecho

Hasta ahora las pantallas usaban el sistema de diseño pero no su estructura.
Ahora están como en el Figma, con dos marcos:

**`DisenoAcceso`** — la pantalla partida en dos de los mockups de acceso: a la
izquierda el panel verde con la marca, el titular y el pie; a la derecha una
columna de 336 px con el formulario. Lo usan el registro, la verificación del
correo y el cambio de contraseña. En pantalla chica el panel pasa a ser una
franja arriba.

**`DisenoApp`** — menú lateral verde oscuro, barra superior blanca y el
contenido sobre el fondo arena. Lo usa la pantalla del rancho, y lo van a usar
todas las pantallas internas.

**Tres cosas que se cambiaron respecto del Figma, a propósito:**

1. **Los textos pasan a español estándar.** El Figma dice "Creá tu cuenta",
   "Usá", "lo podés cambiar". La convención del equipo es español estándar, así
   que en el código dice "Crea tu cuenta", "Usa", "lo puedes cambiar". **Hay
   que corregirlo también en el Figma**, o van a quedar distintos y eso se nota
   en la evaluación.
2. **Los módulos que todavía no existen se ven, apagados y con su fase.**
   Animales, corrales, sanidad, pesajes y equipo aparecen en el menú lateral
   pero no se pueden abrir. Es la misma idea que HU-16 pide para la guía de
   configuración: dejar visible lo que viene, en lugar de un menú que crece de
   golpe y no se entiende. En el Figma el menú está completo sin distinguir qué
   funciona.
3. **Las cifras que dependen de la fase 2 muestran un guion**, no un número
   inventado. El panel del Figma muestra 128 animales y 374 kg de peso
   promedio; esos datos no existen todavía y poner números falsos en algo que
   se demuestra en vivo es pedir que pregunten de dónde salieron.

**La barra de demostración.** Abajo de todo, en letra chica, hay una barra
negra para cambiar de usuario y mostrar el sistema desde cada rol sin abrir la
consola del navegador. No forma parte del producto: está en un solo archivo,
`componentes/BarraDemostracion.tsx`, y cuando exista HU-08 se borra ese archivo
y su uso en `App.tsx`, y no hay que tocar nada más.

---

## 20. Los iconos son de Lucide, copiados a mano, no instalados

**Fecha:** 20 de septiembre de 2026
**Historia:** HU-05
**Quién:** Rafael Taborga

**De dónde salen.** De **Lucide** (<https://lucide.dev>), versión 1.47.0. Es la
librería de iconos que continúa a Feather; es la que usa, entre otros,
shadcn/ui. Licencia **ISC**: se pueden usar, copiar y modificar en cualquier
proyecto, comercial o no, sin pedir permiso y sin tener que mostrar el crédito
en la pantalla. Aun así queda escrito acá y en la cabecera de
`cliente/src/componentes/Iconos.tsx`, porque el dibujo es de ellos.

**Por qué copiados y no instalados.** Las dependencias las instala Favio: es la
regla del equipo. Copiar los trazos de los veinticuatro iconos que usamos no
agrega ninguna dependencia, no suma peso al paquete final —entra solo lo que se
usa— y deja el icono a la vista para leerlo y corregirlo. Si más adelante hacen
falta muchos más, se instala `lucide-react` y este archivo se borra.

**Cómo se usan.** `<Icono nombre="corral" />`. Todos son de 24 × 24, sin
relleno, con el trazo del color del texto que los rodea (`currentColor`) y el
grosor que fija la clase `.ico` en `base.css`. Ninguno lleva color propio: el
color lo decide la pantalla.

**Dónde se pusieron.**

| Lugar | Icono |
|---|---|
| Menú lateral | casa, animal (res), corral (cerco), sanidad (jeringa), balanza, equipo |
| Barra superior | el del módulo abierto |
| Bloque de cuenta | corona, en dorado. Es lo único dorado del menú: el dorado es de los planes |
| Avisos | tilde, cruz, triángulo, información, corona |
| Cifras del panel | regla, brote, res, cerco |
| Siguientes pasos | tilde para lo hecho, círculo punteado para lo que falta |
| Botones | lápiz, caja, más, sobre, avión, flecha de entrada |
| Pantallas de acceso | emblema redondo arriba del título: sobre, llave, tilde, persona |
| Marca | la caravana (la etiqueta del animal) |

**Por qué el aviso lleva icono.** No es adorno. El color solo no alcanza para
quien no distingue el rojo del verde; la forma del icono sí se distingue. Por
eso el icono nunca va solo: siempre acompaña al texto.

**Dónde verlos todos.** En `#/sistema-diseno` hay una tarjeta "Iconos" con los
veinticuatro y el nombre con el que se piden. Si alguien necesita uno que no
está, se agrega ahí primero, copiando el trazo de lucide.dev/icons, y no se
dibuja a mano en la pantalla.

**Lo que se borró.** Los círculos vacíos del menú lateral (`.punto`), que
estaban de relleno, y los dos iconos que yo había dibujado a mano
(`IconoMarca` y `IconoCorral`). Los dibujados a mano quedaban parecidos a
Lucide pero no iguales, y esa diferencia se nota cuando están al lado.
