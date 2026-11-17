# Sistema de Gestión de Ganado

Plataforma web y móvil para que los productores ganaderos lleven el control de
su rancho: animales, corrales, sanidad, pesajes, equipo de trabajo y un
asistente con inteligencia artificial.

Proyecto de Sistemas I · Universidad Privada del Valle · Noviembre de 2026.
Equipo: Rafael Taborga (Aaron), Brian Aranibar y Romina Poma.

Este README es el **manual técnico** del proyecto, con la estructura de la
plantilla de la materia. La versión en Word y el manual de usuario están en
[`documentos/manuales/`](documentos/manuales/).

**Arranque rápido** (detalle en el punto 10):

```bash
cp .env.ejemplo .env
docker compose up -d --build
docker compose exec servidor npm run migrar
docker compose exec servidor npm run sembrar
# sistema en http://localhost:8080 · usuario carlos.gutierrez@elcerrito.bo · clave Ganado2026
```

## Contenido

1. [Integrantes - Roles](#1-integrantes---roles)
2. [Introducción](#2-introducción)
3. [Descripción / objetivo del proyecto](#3-descripción--objetivo-del-proyecto)
4. [Link al Video ilustrativo en YouTube](#4-link-al-video-ilustrativo-en-youtube)
5. [Listado de los Requisitos Funcionales del Sistema](#5-listado-de-los-requisitos-funcionales-del-sistema)
6. [Arquitectura del software](#6-arquitectura-del-software)
7. [Base de datos](#7-base-de-datos)
8. [Listado de Roles más sus credenciales](#8-listado-de-roles-más-sus-credenciales-de-todos-los-admin--users-del-sistema)
9. [Requisitos del sistema](#9-requisitos-del-sistema)
10. [Instalación y configuración](#10-instalación-y-configuración)
11. [Procedimiento de hosteado / hosting](#11-procedimiento-de-hosteado--hosting-configuración)
12. [GIT](#12-git)
13. [Dockerizado](#13-dockerizado)
14. [Personalización y configuración](#14-personalización-y-configuración)
15. [Seguridad](#15-seguridad)
16. [Glosario de términos](#16-glosario-de-términos)
17. [Referencias y recursos adicionales](#17-referencias-y-recursos-adicionales)
18. [Herramientas de Implementación](#18-herramientas-de-implementación)
19. [Bibliografía](#19-bibliografía)

## 1. Integrantes - Roles

El equipo trabajó con Scrum en cuatro sprints de dos semanas. Todos programan; el rol indica de qué área responde cada uno además de sus historias.

| Integrante | Rol | Responsabilidad |
| --- | --- | --- |
| Rafael Taborga (Aaron) | Líder de equipo y encargado de Git (desde el 1/10/2026) | Coordina, planifica y revisa cada sprint, integra el trabajo y mantiene el repositorio, la integración continua y las dependencias. |
| Brian Aranibar | Encargado de base de datos | Dueño del modelo de datos y de la capa de acceso; revisa que ninguna consulta se salte el filtro por rancho. |
| Romina Poma | Encargada de calidad (QA) | Dueña del plan de pruebas, de las pruebas de aislamiento y de la verificación de cada historia antes de darla por terminada. |
| Favio Müller | Encargado de Git hasta el 1/10/2026 | Armó el repositorio y la integración continua del Sprint 1. Dejó el equipo en octubre de 2026. |

## 2. Introducción

Este manual describe cómo está construido el Sistema de Gestión de Ganado y cómo se instala, se configura, se publica y se mantiene. Está escrito para quien tenga que continuar el desarrollo, levantarlo en otra máquina o revisar sus decisiones técnicas.

El uso de cada pantalla está en el **Manual de usuario**, que es un documento aparte. Las decisiones técnicas con su motivo están, numeradas, en `DECISIONES.md` (se citan como DECISIONES §n).

Los comandos sirven en PowerShell, Git Bash, macOS y Linux, salvo donde se indica.

## 3. Descripción / objetivo del proyecto

Es una plataforma web, que también se usa desde el celular, para que un productor ganadero lleve el control de su rancho: animales, corrales, sanidad y calendario de vacunación, pesajes y ganancia de peso, con su equipo de trabajo y permisos por persona. Funciona en varios países, con el idioma, las unidades y el formato de fecha de cada uno.

**Objetivo general.** Desarrollar una plataforma web y móvil que permita a los productores ganaderos registrar y controlar la actividad diaria de su rancho, trabajando en equipo con roles diferenciados y con un asistente de inteligencia artificial que responde preguntas sobre los datos del propio rancho.

**Alcance de esta entrega.** Las 59 historias de usuario de los cuatro sprints, que cubren las fases 1 a 3, más el asistente con IA de la fase 5:

| Fase | Contenido |
| --- | --- |
| Fase 1 | Cuentas, registro y verificación de correo, ingreso, ranchos, países, guía de configuración, equipo, tipos de colaborador, permisos, acceso de soporte del Admin e idiomas. |
| Fase 2 | Animales con ficha e historial, corrales, alta rápida desde el celular, acciones masivas, importación desde Excel y exportación. |
| Fase 3 | Sanidad (productos, esquemas, calendario, aplicaciones individuales y masivas, vacuna desde el celular), pesajes (individual, masivo, rápido, evolución y comparativa) y panel de indicadores. |
| Fase 5 (parte) | Asistente con IA que responde en lenguaje natural sobre los datos del rancho. |

Quedan para una versión posterior la fase 4 (planes, prueba de 10 días, cobro y panel de administración completo) y el trabajo sin conexión de la fase 5. El modelo de datos ya está preparado para ambas: identificadores generados en el cliente, autoría y baja lógica en todas las tablas.

## 4. Link al Video ilustrativo en YouTube

Video de 2 a 5 minutos que muestra el sistema funcionando.

> **Pendiente.** Enlace: [completar con el enlace de YouTube].

## 5. Listado de los Requisitos Funcionales del Sistema

Son los 71 requisitos funcionales de la propuesta (versión 4.0), con su estado en esta entrega: 44 implementados, 6 en parte, 18 de la fase 4 y 3 de la fase 5, que quedan para después.

**Cuenta y puesta en marcha**

| Código | Requisito | Estado |
| --- | --- | --- |
| RF-01 | Registro con correo y contraseña; exige confirmar el correo. | **Implementado** |
| RF-02 | Quien se registra queda como propietario. | **Implementado** |
| RF-03 | El país define idioma, moneda, unidades, formato de fecha y zona horaria. | **Implementado** |
| RF-04 | Hay que crear el rancho antes de usar el resto. | **Implementado** |
| RF-05 | Guía de configuración con cuatro pasos y progreso. | **Implementado** |
| RF-06 | Recuperación de contraseña por correo. | **Implementado** |
| RF-07 | Cambio de contraseña obligatorio en el primer ingreso de los usuarios creados. | **Implementado** |
| RF-08 | Un correo pertenece a un solo rancho. | **Implementado** |

**Usuarios y permisos**

| Código | Requisito | Estado |
| --- | --- | --- |
| RF-09 | El propietario da de alta socios y colaboradores. | **Implementado** |
| RF-10 | Los usuarios nacen en consulta y el propietario habilita la carga por módulo. | **Implementado** |
| RF-11 | Cuatro tipos de colaborador predefinidos y tipos propios. | **Implementado** |
| RF-12 | Suspender, reactivar y forzar el cambio de contraseña. | **Implementado** |
| RF-13 | Cada registro guarda quién lo creó, quién lo modificó y cuándo. | **Implementado** |
| RF-14 | El propietario nunca ve las contraseñas del equipo. | **Implementado** |
| RF-15 | Una cuenta, un rancho. | **Implementado** |

**Animales**

| Código | Requisito | Estado |
| --- | --- | --- |
| RF-16 | Alta de animales de a uno o masiva. | **Implementado** |
| RF-17 | Identificador único en el rancho: caravana, número interno o RFID. | **Implementado** |
| RF-18 | Raza, sexo, categoría, nacimiento, origen, estado y corral. | **Implementado** |
| RF-19 | Ficha con el historial completo. | **Implementado** |
| RF-20 | Estados activo, vendido, muerto y archivado; nada se borra. | **Implementado** |

**Corrales**

| Código | Requisito | Estado |
| --- | --- | --- |
| RF-21 | Corrales con capacidad, superficie y ocupación. | **Implementado** |
| RF-22 | Asignación de animales de a uno o masiva. | **Implementado** |
| RF-23 | Aviso cuando un corral supera su capacidad. | **Implementado** |

**Sanidad y vacunación**

| Código | Requisito | Estado |
| --- | --- | --- |
| RF-24 | Catálogo de productos sanitarios por rancho. | **Implementado** |
| RF-25 | Esquemas de vacunación propios con dosis e intervalos. | **Implementado** |
| RF-26 | Aplicaciones individuales o masivas, con quién las aplicó. | **Implementado** |
| RF-27 | Calendario sanitario con avisos de vencimiento. | **Implementado** |

**Pesajes**

| Código | Requisito | Estado |
| --- | --- | --- |
| RF-28 | Pesajes por animal con fecha. | **Implementado** |
| RF-29 | Ganancia diaria de peso entre dos pesajes. | **Implementado** |
| RF-30 | Comparación de peso por animal, corral y categoría. | **Implementado** |

**Importación y exportación**

| Código | Requisito | Estado |
| --- | --- | --- |
| RF-31 | Importación desde Excel y CSV con plantilla. | **Implementado** |
| RF-32 | Reconoce las columnas por el encabezado y pide confirmar solo las desconocidas. | **Implementado** |
| RF-33 | Validación fila por fila, vista previa e informe de errores. | **Implementado** |
| RF-34 | Detecta filas duplicadas antes de confirmar. | **Implementado** |
| RF-35 | Exportación de los datos del rancho a Excel. | **Implementado** |

**Paneles**

| Código | Requisito | Estado |
| --- | --- | --- |
| RF-36 | Existencias, evolución del rodeo, cobertura, vencimientos y peso. | **Implementado** |
| RF-37 | El panel se adapta al rol. | **Implementado** |

**Asistente con IA**

| Código | Requisito | Estado |
| --- | --- | --- |
| RF-38 | Responde preguntas en lenguaje natural sobre el rancho. | **Implementado** |
| RF-39 | Solo lee: no crea, modifica ni borra. | **Implementado** |
| RF-40 | Responde solo sobre los módulos del rol. | **Implementado** |
| RF-41 | No consulta internet ni otros ranchos. | **Implementado** |
| RF-42 | Cuota de consultas por usuario y por mes, a la vista. | **Parcial**. La cuota es una sola para todos (configurable); por plan llega con la fase 4. |

**Suscripción y cobro**

| Código | Requisito | Estado |
| --- | --- | --- |
| RF-43 | Prueba de 10 días del plan Profesional. | **Fase 4** |
| RF-44 | Al terminar la prueba pasa al plan Gratis sin perder datos. | **Fase 4** |
| RF-45 | Cuatro planes con límites. | **Fase 4** |
| RF-46 | Cobro real con pasarela de pago. | **Fase 4** |
| RF-47 | Precio según la franja del país. | **Fase 4**. El catálogo de franjas ya existe. |
| RF-48 | Siete días de gracia al vencer un plan pago. | **Fase 4** |
| RF-49 | Al bajar de plan no se elimina nada. | **Fase 4** |
| RF-50 | Al subir de plan se restaura todo. | **Fase 4** |
| RF-51 | Cinco momentos para ofrecer mejorar el plan. | **Fase 4** |
| RF-52 | Estado de la suscripción y consumo de cada límite. | **Fase 4** |

**Trabajo sin conexión**

| Código | Requisito | Estado |
| --- | --- | --- |
| RF-53 | Registro sin conexión de animales, vacunas, pesajes y movimientos. | **Fase 5**. Las pantallas de celular ya existen; falta guardar sin señal. |
| RF-54 | Consulta sin conexión de lo descargado. | **Fase 5** |
| RF-55 | Sincronización automática al volver la señal. | **Fase 5** |

**Administración de la plataforma**

| Código | Requisito | Estado |
| --- | --- | --- |
| RF-56 | Tablero del Admin con cuentas, ingresos y consumo. | **Fase 4** |
| RF-57 | Búsqueda de cuentas con su ficha. | **Parcial**. Lista y búsqueda de ranchos para dar soporte. |
| RF-58 | Administración de planes y límites. | **Fase 4** |
| RF-59 | Administración de franjas de precio. | **Fase 4** |
| RF-60 | Suscripciones, pagos y catálogos generales. | **Fase 4** |
| RF-61 | Acceso de soporte a un rancho, registrado. | **Implementado** |
| RF-62 | Registro de auditoría de lo que hace cada Admin. | **Parcial**. Quedan registradas las entradas y salidas con su motivo. |

**Cancelación y conservación**

| Código | Requisito | Estado |
| --- | --- | --- |
| RF-63 | Cancelar la suscripción. | **Fase 4** |
| RF-64 | Cuenta cancelada en solo lectura 12 meses. | **Fase 4** |
| RF-65 | Aviso 30 días antes de la baja definitiva. | **Fase 4** |
| RF-66 | Exportar los datos en cualquier momento. | **Parcial**. La exportación existe; falta el estado de cuenta cancelada. |

**Avisos**

| Código | Requisito | Estado |
| --- | --- | --- |
| RF-67 | Correos de verificación, alta, recuperación, prueba y pagos. | **Parcial**. Verificación, alta de usuario y recuperación; los de prueba y pagos, con la fase 4. |
| RF-68 | Avisos en la aplicación: vencimientos, prueba, límites y sincronización. | **Parcial**. Vencimientos sanitarios y corrales sobrepoblados. |
| RF-69 | Activar o desactivar los correos no esenciales. | **Fase 4** |

**Seguridad de acceso**

| Código | Requisito | Estado |
| --- | --- | --- |
| RF-70 | Sesión de 30 días sin actividad y cierre manual. | **Implementado** |
| RF-71 | Bloqueo de 15 minutos tras cinco intentos fallidos. | **Implementado** |

## 6. Arquitectura del software

### Estructura general

Es una aplicación web de tres capas. El cliente es una aplicación de una sola página en React que se adapta al celular. El servidor es una API REST en NestJS que concentra las reglas de negocio, los permisos y el asistente. La base de datos es PostgreSQL.

![Figura 1. Componentes principales y cómo se comunican.](documentos/manuales/img/arquitectura.png)

*Figura 1. Componentes principales y cómo se comunican.*

### Componentes principales

| Componente | Qué hace |
| --- | --- |
| Cliente (cliente/) | Pantallas en paginas/, componentes reutilizables en componentes/, llamadas a la API en servicios/ y estilos con los tokens del sistema de diseño en estilos/. |
| Guardia de cuenta | GuardiaCuentaLista: valida el token y que la cuenta esté lista (correo verificado, sin cambio de contraseña pendiente, no suspendida). |
| Módulos del servidor | 18 módulos en servidor/src/modulos/, cada uno con controlador, servicio y repositorio. |
| Permisos | PermisosModulo: nivel de cada usuario en cada módulo (ninguno, ver, editar) y exigir() en cada servicio. |
| Asistente | Módulo que habla con el modelo de lenguaje y le da siete herramientas de solo lectura sobre los servicios de los demás módulos. |
| Base de datos | 24 tablas y una vista, creadas por 12 migraciones SQL. |
| Servicios externos | Brevo para correos y Gemini o Groq para el asistente; ambos opcionales. |

### Módulos del servidor

| Módulo | Responsabilidad |
| --- | --- |
| usuarios | Registro, verificación, ingreso, sesiones, perfil, contraseñas, alta de colaboradores. |
| ranchos · paises · guia | Rancho, catálogo de países y guía de configuración. |
| equipo · tipos · permisos | Socios y colaboradores, tipos de colaborador y permisos por módulo. |
| admin | Acceso de soporte del Admin de plataforma, con motivo y registro. |
| animales · corrales · masivo | Animales, corrales y acciones sobre varios animales. |
| importacion · exportacion | Carga desde Excel o CSV y descarga en xlsx o csv. |
| sanidad · vacunacion | Productos, aplicaciones, esquemas, calendario y avisos. |
| pesajes · indicadores | Pesajes, panel de inicio y comparativa de peso. |
| asistente | Preguntas en lenguaje natural sobre el rancho. |

### Interacción entre componentes

1. El cliente llama a la API desde `servicios/api.ts` con el token en `Authorization: Bearer` y el idioma en `Accept-Language`.
1. Un middleware fija el idioma de la respuesta y la guardia valida la sesión.
1. El controlador pasa la petición al servicio, que exige el permiso del módulo con `permisos.exigir(quien, modulo, 'ver' | 'editar')`.
1. El repositorio ejecuta SQL parametrizado, siempre filtrado por el `rancho_id` de la sesión.
1. La respuesta vuelve en JSON; los errores, con código HTTP y mensaje traducido.

**El asistente.** Recibe la pregunta, arma el contexto (rancho, fecha, rol y módulos visibles) y se la manda al modelo con las herramientas que el usuario puede usar. El modelo pide herramientas por nombre y con filtros; el servidor las ejecuta con los mismos servicios de las pantallas y le devuelve los datos; el modelo redacta la respuesta. Como mucho cinco idas y vueltas (DECISIONES §48).

### Patrones de diseño utilizados

| Patrón | Dónde y para qué |
| --- | --- |
| Módulos e inyección de dependencias | NestJS arma cada módulo con sus proveedores; los servicios reciben sus repositorios por constructor. Facilita probar y cambiar piezas. |
| Repositorio | Todo el SQL vive en las clases Repositorio*: los servicios no saben de SQL y el filtro por rancho está en un solo lugar por módulo. |
| Capa de servicio | Las reglas de negocio y los permisos están en los Servicio*; los controladores solo reciben y responden. |
| Guardia y middleware (cadena de responsabilidad) | Cada petición pasa por el middleware de idioma y por GuardiaCuentaLista antes de llegar al controlador. |
| Estrategia | ServicioCorreo envía por consola o por Brevo según CORREO_TRANSPORTE, con la misma interfaz. |
| Adaptador | ProveedorAsistente adapta Gemini y Groq al formato de chat de OpenAI; cambiar de proveedor es cambiar variables. |
| Fachada | HerramientasAsistente expone al modelo siete herramientas simples sobre seis servicios distintos. |
| Componentes reutilizables y servicios (cliente) | Boton, Campo, Tarjeta, Alerta, DisenoApp y gráficos en SVG; las pantallas no llaman a fetch directamente sino a servicios/. |

Se siguen los principios SOLID sobre todo en las tres piezas que la propuesta marcó como críticas: el filtro por rancho (responsabilidad única en los repositorios), el motor de permisos (un solo servicio que todos usan) y el asistente (depende de una abstracción del proveedor, no de uno concreto).

## 7. Base de datos

### a. Diagrama completo y actual

PostgreSQL 18 con 24 tablas y la vista permisos_tipo_vigentes. Los dos diagramas muestran todas las tablas y sus relaciones; las columnas se resumen en la tabla de abajo.

![Figura 2. Cuentas, ranchos, equipo, permisos y consultas al asistente.](documentos/manuales/img/er1.png)

*Figura 2. Cuentas, ranchos, equipo, permisos y consultas al asistente.*

![Figura 3. Animales, corrales, sanidad y pesajes.](documentos/manuales/img/er2.png)

*Figura 3. Animales, corrales, sanidad y pesajes.*

**Convenciones.** Identificadores UUID; los catálogos fijos usan su código como llave. Cada entidad tiene creado_en, creado_por, modificado_en (lo actualiza un disparador), modificado_por y eliminado_en para la baja lógica. Las tablas del rancho llevan rancho_id y llaves foráneas compuestas (rancho_id, animal_id), para que la base rechace mezclar ranchos.

| Tabla | Contenido |
| --- | --- |
| usuarios | Cuentas: rol, rancho, tipo de colaborador, intentos fallidos, bloqueo, país e idioma. |
| sesiones, tokens | Sesiones de refresco y tokens de un solo uso. |
| ranchos, paises, franjas_precio | El rancho y el catálogo regional. |
| modulos, tipos_colaborador, permisos_tipo, permisos_usuario | Permisos por módulo, por tipo y por persona; la vista permisos_tipo_vigentes los combina. |
| accesos_admin, pasos_guia | Accesos de soporte y avance de la guía. |
| corrales, animales, categorias_animal, razas | El ganado y sus catálogos. |
| movimientos_corral, cambios_estado_animal | Historial de cada animal. |
| productos_sanitarios, esquemas_vacunacion, aplicaciones_sanitarias | Sanidad. |
| pesajes | Pesajes por animal y fecha. |
| consultas_asistente | Preguntas y respuestas del asistente; también cuenta la cuota del mes. |
| migraciones_aplicadas | Control del corredor de migraciones. |

### b. Carpeta con la base de datos en el GIT

La carpeta `base-de-datos/` tiene los scripts para crear la base y cargar los datos de ejemplo sin levantar el servidor:

| Archivo | Contenido |
| --- | --- |
| `01_esquema.sql` | Tablas, vista, funciones, disparadores e índices. |
| `02_datos_ejemplo.sql` | Dos ranchos, 14 usuarios de todos los roles, animales, corrales, productos, esquemas, aplicaciones y pesajes. |
| `03_script_simple.sql` | El script resumido de la sección c. |
| `README.md` | Cómo cargarlos y cómo volver a generarlos. |

Esos archivos salen de las migraciones (`servidor/migraciones/`, 001 a 012) y las semillas (`servidor/semillas/`), que son la fuente: el servidor las aplica con `npm run migrar` y `npm run sembrar`.

```bash
docker exec -i ganado_postgres psql -U ganado_usuario -d gestion_ganado < base-de-datos/01_esquema.sql
docker exec -i ganado_postgres psql -U ganado_usuario -d gestion_ganado < base-de-datos/02_datos_ejemplo.sql
```

En PowerShell se usa `Get-Content archivo.sql | docker exec -i …` en lugar de `<`.

### c. Script simple

Versión resumida del núcleo del modelo (rancho, corrales, animales y pesajes), en un esquema aparte para no tocar las tablas del sistema. Es `base-de-datos/03_script_simple.sql`.

```sql
-- ============================================================================
--  SISTEMA DE GESTION DE GANADO
--  Script simple: el nucleo del modelo (rancho, corrales, animales, pesajes)
--  con datos de ejemplo. Es el que va copiado en el manual tecnico.
--
--  Es una version RESUMIDA para leer y probar en cualquier PostgreSQL: crea
--  todo dentro de un esquema aparte (ganado_demo) y no toca las tablas del
--  sistema. El modelo completo esta en 01_esquema.sql y los datos de prueba
--  completos en 02_datos_ejemplo.sql (los mismos que cargan las migraciones y
--  las semillas de servidor/).
--
--  Uso:  psql -U ganado_usuario -d gestion_ganado -f 03_script_simple.sql
-- ============================================================================

BEGIN;

DROP SCHEMA IF EXISTS ganado_demo CASCADE;
CREATE SCHEMA ganado_demo;
SET search_path TO ganado_demo;

-- Cada tabla lleva el rancho, autoria y baja logica, como en el sistema.
CREATE TABLE ranchos (
    id            UUID PRIMARY KEY,
    nombre        VARCHAR(120) NOT NULL,
    superficie    NUMERIC(12,2),
    creado_en     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    eliminado_en  TIMESTAMPTZ
);

CREATE TABLE corrales (
    id            UUID PRIMARY KEY,
    rancho_id     UUID NOT NULL REFERENCES ranchos(id),
    nombre        VARCHAR(80) NOT NULL,
    capacidad     INTEGER CHECK (capacidad > 0),
    superficie_ha NUMERIC(10,4),
    creado_en     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    eliminado_en  TIMESTAMPTZ,
    UNIQUE (id, rancho_id)
);

CREATE TABLE animales (
    id               UUID PRIMARY KEY,
    rancho_id        UUID NOT NULL REFERENCES ranchos(id),
    identificador    VARCHAR(50) NOT NULL,
    sexo             VARCHAR(10) NOT NULL CHECK (sexo IN ('macho', 'hembra')),
    categoria_codigo VARCHAR(20) NOT NULL,
    fecha_nacimiento DATE,
    corral_id        UUID,
    peso_kg          NUMERIC(10,2),
    estado           VARCHAR(20) NOT NULL DEFAULT 'activo'
                     CHECK (estado IN ('activo', 'vendido', 'muerto', 'archivado')),
    creado_en        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    eliminado_en     TIMESTAMPTZ,
    UNIQUE (id, rancho_id),
    -- El corral tiene que ser del mismo rancho (aislamiento en la base).
    FOREIGN KEY (corral_id, rancho_id) REFERENCES corrales(id, rancho_id)
);

-- La caravana es unica dentro del rancho, entre los animales vigentes.
CREATE UNIQUE INDEX ux_animales_identificador
    ON animales (rancho_id, identificador) WHERE eliminado_en IS NULL;

CREATE TABLE pesajes (
    id           UUID PRIMARY KEY,
    rancho_id    UUID NOT NULL,
    animal_id    UUID NOT NULL,
    fecha        DATE NOT NULL,
    peso_kg      NUMERIC(10,2) NOT NULL CHECK (peso_kg > 0),
    eliminado_en TIMESTAMPTZ,
    FOREIGN KEY (animal_id, rancho_id) REFERENCES animales(id, rancho_id)
);

-- Datos de ejemplo -------------------------------------------------------------
INSERT INTO ranchos (id, nombre, superficie) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Rancho El Cerrito', 850.50);

INSERT INTO corrales (id, rancho_id, nombre, capacidad, superficie_ha) VALUES
  ('cc000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Potrero Las Lomas', 20, 25),
  ('cc000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Potrero del Río', 10, 12);

INSERT INTO animales (id, rancho_id, identificador, sexo, categoria_codigo, fecha_nacimiento, corral_id, peso_kg) VALUES
  ('d1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', '0501', 'hembra', 'vaca',    '2021-03-14', 'cc000000-0000-4000-8000-000000000001', 468),
  ('d1000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', '0503', 'macho',  'novillo', '2024-07-20', 'cc000000-0000-4000-8000-000000000002', 402),
  ('d1000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', '0504', 'macho',  'novillo', '2024-08-11', 'cc000000-0000-4000-8000-000000000002', 371);

INSERT INTO pesajes (id, rancho_id, animal_id, fecha, peso_kg) VALUES
  ('f1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003', '2026-09-15', 378),
  ('f1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003', '2026-10-30', 402);

COMMIT;

-- Consulta de ejemplo: animales por corral y ganancia diaria entre pesajes.
SELECT c.nombre AS corral, COUNT(a.id) AS animales
  FROM ganado_demo.corrales c
  LEFT JOIN ganado_demo.animales a ON a.corral_id = c.id AND a.eliminado_en IS NULL
 GROUP BY c.nombre;

SELECT a.identificador,
       ROUND((MAX(p.peso_kg) - MIN(p.peso_kg)) / NULLIF(MAX(p.fecha) - MIN(p.fecha), 0), 3) AS ganancia_kg_dia
  FROM ganado_demo.pesajes p
  JOIN ganado_demo.animales a ON a.id = p.animal_id
 GROUP BY a.identificador;
```

## 8. Listado de Roles más sus credenciales de todos los Admin / Users del sistema

Son las cuentas de los datos de ejemplo. La contraseña de todas es **Ganado2026**, salvo la de Rubén Quispe.

| Persona | Rol | Correo | Contraseña |
| --- | --- | --- | --- |
| Soporte Central | Admin de plataforma | soporte@plataforma.bo | Ganado2026 |
| Carlos Gutiérrez Mendoza | Propietario (Rancho El Cerrito) | carlos.gutierrez@elcerrito.bo | Ganado2026 |
| María René Aguilera | Socia | mrene.aguilera@elcerrito.bo | Ganado2026 |
| Dr. Jorge Soliz | Colaborador · Veterinario | jorge.soliz@elcerrito.bo | Ganado2026 |
| Roberto Justiniano | Colaborador · Encargado de campo | roberto.justiniano@elcerrito.bo | Ganado2026 |
| Gonzalo Chávez | Colaborador · Encargado de almacén | gonzalo.chavez@elcerrito.bo | Ganado2026 |
| Valeria Mercado | Colaboradora · Administrativa | valeria.mercado@elcerrito.bo | Ganado2026 |
| Fernando Torrico | Propietario (Hacienda La Floresta) | fernando.torrico@lafloresta.bo | Ganado2026 |
| Patricia Villarroel | Socia (La Floresta) | patricia.villarroel@lafloresta.bo | Ganado2026 |
| Dra. Lucía Morales | Colaboradora (La Floresta) | lucia.morales@lafloresta.bo | Ganado2026 |
| Ariel Camacho | Propietario sin rancho | ariel.camacho@correo.bo | Ganado2026 |
| Lucía Méndez | Propietaria sin verificar el correo | lucia.mendez@correo.bo | Ganado2026 |
| Rubén Quispe | Colaborador con clave temporal | ruben.quispe@elcerrito.bo | Temporal2026 |

Qué puede cada rol:

| Rol | Alcance |
| --- | --- |
| Admin de plataforma | Lista los ranchos y entra a uno solo con un acceso registrado y un motivo, que el propietario ve. Adentro puede lo mismo que el propietario, hasta salir o por 8 horas. |
| Propietario | Todo su rancho: datos, equipo, permisos, importación, exportación y bajas. |
| Socio | Ve todo el rancho; modifica solo los módulos que el propietario le habilite. |
| Colaborador | Entra a los módulos de su tipo: veterinario (sanidad y pesajes, ve animales), encargado de campo (animales, corrales y pesajes), encargado de almacén (almacén) y administrativo (consulta e importación). |

**Base de datos.** El usuario y la contraseña de PostgreSQL son los que se ponen en `.env` (`DB_USUARIO` y `DB_CONTRASENA`). En el ejemplo del repositorio: `ganado_usuario` / `cambiar_esta_clave`; conviene cambiarla en cada máquina.

## 9. Requisitos del sistema

### Requerimientos de Hardware (mínimo): cliente

- Computadora con procesador de doble núcleo, 4 GB de RAM y pantalla de 1280 × 720 o más.
- Celular con Android 10 o iOS 15 en adelante, pantalla desde 360 px de ancho.
- Conexión a internet.

### Requerimientos de Software: cliente

- Navegador actualizado: las dos últimas versiones de Chrome, Edge, Firefox o Safari, con JavaScript habilitado.
- No requiere instalar nada más.

### Requerimientos de Hardware (server / hosting / BD)

| Uso | Mínimo | Recomendado |
| --- | --- | --- |
| Servidor de la API | 1 vCPU, 512 MB de RAM | 1 vCPU, 1 GB de RAM |
| PostgreSQL | 1 vCPU, 512 MB de RAM, 1 GB de disco | 2 GB de RAM, 10 GB de disco |
| Máquina de desarrollo con Docker | 4 núcleos, 8 GB de RAM, 10 GB libres | 16 GB de RAM, disco SSD |

### Requerimientos de Software (server / hosting / BD)

| Software | Versión |
| --- | --- |
| Node.js | 24 LTS |
| PostgreSQL | 18 (funciona desde la 16) |
| Docker y Docker Compose | Docker Desktop 4 o Docker Engine con Compose v2 |
| Git | Cualquier versión reciente |
| Sistema operativo | Windows 10/11, macOS o Linux |
| Opcional | Cuenta de Brevo (correos reales) y clave de Gemini o Groq (asistente) |

## 10. Instalación y configuración

### Instalación

1. Clonar el repositorio y entrar a la carpeta.
1. Copiar `.env.ejemplo` como `.env` y completar los valores.
1. Instalar las dependencias del servidor y del cliente (siempre npm ci).
1. Levantar la base de datos con Docker.
1. Aplicar las migraciones y cargar los datos de ejemplo.
1. Levantar el servidor y el cliente.

```bash
git clone https://github.com/Muller284/Sistema_Gestion_de_Ganado.git
cd Sistema_Gestion_de_Ganado
cp .env.ejemplo .env

cd servidor
npm ci
cd ..
cd cliente
npm ci
cd ..

docker compose up -d postgres

cd servidor
npm run migrar        # aplica las migraciones que falten
npm run sembrar       # borra y vuelve a cargar los datos de ejemplo
npm run start:dev     # API en http://localhost:3000

# en otra terminal
cd cliente
npm run dev           # sistema en http://localhost:5173
```

> **Importante.** `npm run sembrar` borra y vuelve a cargar los datos de ejemplo. Sirve para dejar la demostración como al principio; no se debe correr sobre una base con datos reales.

### Variables de entorno

| Variable | Uso |
| --- | --- |
| DB_USUARIO, DB_CONTRASENA, DB_NOMBRE, DB_PUERTO | Credenciales y puerto del PostgreSQL de Docker. |
| DATABASE_URL | Conexión del servidor a la base. |
| PUERTO_SERVIDOR, PUERTO_CLIENTE | Puertos de la API (3000) y del cliente en Docker (8080). |
| JWT_SECRETO | Clave con la que se firman las sesiones. Larga y distinta en cada máquina. |
| URL_CLIENTE | Dirección del cliente, para los enlaces de los correos. |
| CORREO_TRANSPORTE, BREVO_API_KEY, CORREO_REMITENTE | consola (el correo se imprime en la terminal) o brevo (se envía de verdad). |
| ASISTENTE_URL, ASISTENTE_MODELO, ASISTENTE_CLAVE | Proveedor del asistente. Sin clave, el sistema funciona y el asistente avisa que no está configurado. |
| ASISTENTE_CONSULTAS_MES | Consultas al asistente por usuario y por mes (30). |
| USUARIO_DEMO_ID | Usuario de demostración sin token. Se quita en producción. |

### Conexión con otros sistemas

**Asistente (Gemini, gratis).** Con una cuenta de Google, entrar a aistudio.google.com/apikey, crear una clave y ponerla en `ASISTENTE_CLAVE`. La URL y el modelo ya vienen en el ejemplo. Para usar Groq se cambian las tres variables (están comentadas en `.env.ejemplo`). Reiniciar el servidor.

**Correo (Brevo).** Crear la cuenta, verificar un remitente, generar una clave de API, completar las tres variables y probar con `npm run probar:correo -- tu.correo@gmail.com` (DECISIONES §18 y §30).

### Problemas frecuentes

| Síntoma | Solución |
| --- | --- |
| ECONNREFUSED al migrar o al arrancar | La base no está levantada: `docker compose up -d postgres`. |
| Puerto 5432 o 3000 ocupado | Cambiar `DB_PUERTO` o `PUERTO_SERVIDOR` en `.env` y ajustar DATABASE_URL. |
| postgres:18 no arranca con datos viejos | El volumen es de otra versión: `docker compose down -v`. |
| Los correos no llegan | Con CORREO_TRANSPORTE=consola se imprimen en la terminal del servidor. |
| El asistente dice que no está configurado | Falta ASISTENTE_CLAVE en .env o no se reinició el servidor. |
| El asistente dice que llegó al límite gratuito | Se agotó la cuota gratuita del proveedor por ese día o minuto; esperar o cambiar de proveedor. |

## 11. PROCEDIMIENTO DE HOSTEADO / HOSTING (configuración)

> **Pendiente.** El sistema todavía no está publicado. Este es el procedimiento previsto; al publicarlo se completan las direcciones reales y se confirma cada paso.

El plan es publicar con Firebase. Firebase Hosting sirve el cliente gratis, pero para correr un servidor Node (Cloud Functions o Cloud Run) Firebase exige el plan Blaze, que pide una tarjeta. Como el proyecto no puede gastar, el servidor y la base van en servicios con capa gratuita que no la piden:

| Parte | Dónde | Capa gratuita |
| --- | --- | --- |
| Sitio web | Firebase Hosting | Plan Spark, sin tarjeta. |
| API | Render (servicio web) | 750 horas al mes; se duerme a los 15 minutos sin tráfico y tarda cerca de un minuto en despertar. |
| Base de datos | Neon (PostgreSQL) | 1 GB por proyecto; se suspende a los 5 minutos sin uso y vuelve sola. |
| Otros | Gemini API y Brevo | Capa gratis de Gemini; Brevo gratis con límite diario de correos. |

Se publica en este orden, porque cada parte necesita la dirección de la anterior: base de datos, API y sitio web.

### B.D.

1. Crear una cuenta en neon.com y un proyecto con PostgreSQL 17 o 18, en la región más cercana.
1. Copiar la cadena de conexión que da Neon (termina en `?sslmode=require`).
1. Desde la computadora, con esa cadena como DATABASE_URL, aplicar las migraciones y cargar los datos de ejemplo:

```bash
cd servidor
DATABASE_URL="postgresql://usuario:clave@servidor.neon.tech/neondb?sslmode=require" npm run migrar
DATABASE_URL="postgresql://usuario:clave@servidor.neon.tech/neondb?sslmode=require" npm run sembrar
```

En PowerShell: `$env:DATABASE_URL="…"; npm run migrar`. Credenciales: las que muestra Neon en el panel del proyecto (usuario dueño de la base).

### API / servicios Web

1. Crear una cuenta en render.com y un «New Web Service» conectado al repositorio de GitHub, rama main.
1. Runtime Node. Build command: `cd servidor && npm ci && npm run construir`. Start command: `cd servidor && node dist/main.js`.
1. Variables de entorno: `DATABASE_URL` (la de Neon), `JWT_SECRETO`, `URL_CLIENTE` (la de Firebase), `CORREO_TRANSPORTE`, `ASISTENTE_CLAVE` y, si se usa, las de Brevo. El puerto lo pone Render en PORT y el servidor lo toma solo.
1. Desplegar y probar `https://<servicio>.onrender.com/paises`.

### Sitio Web.

1. Crear un proyecto en console.firebase.google.com (plan Spark).
1. Instalar la herramienta y entrar: `npm install -g firebase-tools` y `firebase login`.
1. Vincular el repositorio con el proyecto: `firebase use --add`. El archivo `firebase.json` ya está en la raíz: publica `cliente/dist` y manda toda ruta a index.html.
1. Compilar el cliente apuntando a la API publicada y desplegar:

```bash
cd cliente
VITE_API=https://<servicio>.onrender.com npm run build
cd ..
firebase deploy --only hosting
```

En PowerShell la variable se pone antes: `$env:VITE_API="https://<servicio>.onrender.com"; npm run build`.

El sitio queda en `https://<proyecto>.web.app`. Esa dirección va en `URL_CLIENTE` de Render.

### Otros

- **Gemini:** la clave se crea en aistudio.google.com/apikey y va solo en las variables de Render, nunca en el cliente.
- **Brevo:** remitente verificado y clave de API en las variables de Render.
- **Credenciales de acceso:** las cuentas de Firebase, Render y Neon son de quien publica; las cuentas del sistema son las del punto 8.

## 12. GIT

Repositorio: `https://github.com/Muller284/Sistema_Gestion_de_Ganado`.

### Versión final entregada del proyecto, integrada en la RAMA MAIN

Todo el trabajo se integra a main por pull request, con la integración continua en verde (pruebas del servidor y del cliente, lint y compilación).

> **Pendiente.** Commit de la versión final en main: [completar con el identificador del commit o la etiqueta, por ejemplo v1.0].

### Entrega compilados ejecutables

Es una aplicación web: lo «ejecutable» son los compilados del cliente y del servidor, y las imágenes de Docker.

```bash
cd cliente
npm run build            # cliente/dist: archivos estáticos para cualquier servidor web
cd ../servidor
npm run construir        # servidor/dist: se ejecuta con node dist/main.js
cd ..
docker compose build     # imágenes ganado_servidor y ganado_cliente
```

> **Pendiente.** Enlace a los compilados: [completar, por ejemplo una versión (Release) de GitHub con cliente-dist.zip y servidor-dist.zip].

### Ramas Actualizada por cada Developer

Cada integrante trabaja en su propia rama y abre un pull request hacia main (DECISIONES §9).

| Rama | Integrante | Último trabajo integrado |
| --- | --- | --- |
| Taborga | Rafael Taborga (Aaron) | Paneles, comparativa de peso, calendario mensual y asistente con IA. |
| Aranibar | Brian Aranibar | Pesajes individual, masivo y registro rápido (HU-53 y HU-55). |
| Poma | Romina Poma | Productos sanitarios, aplicaciones y vacuna desde el celular (HU-46, 48, 49 y 52). |
| Müller | Favio Müller | Inicio de sesión y manejo de sesión (Sprint 1). |
| main | — | Versión integrada y probada. |

## 13. Dockerizado

El backend, el frontend y la base de datos están dockerizados y se levantan juntos con Docker Compose.

### a. Proceso de dockerizado, configuración

| Servicio | Imagen | Configuración |
| --- | --- | --- |
| postgres | postgres:18 | Usuario, clave y base desde .env. Volumen postgres_data para los datos. Puerto DB_PUERTO (5432). Chequeo de salud con pg_isready. |
| servidor | servidor/Dockerfile (node:24-alpine) | npm ci y npm run start:dev. Toma .env, se conecta al servicio postgres y monta idiomas/ en solo lectura. Puerto PUERTO_SERVIDOR (3000). |
| cliente | cliente/Dockerfile (node:24-alpine + nginx:1.27-alpine) | Dos etapas: compila con Vite y sirve dist/ con nginx (cliente/nginx.conf). VITE_API se fija al construir. Puerto PUERTO_CLIENTE (8080). |

La imagen del cliente se construye desde la raíz del repositorio porque necesita `idiomas/`; lo que no hace falta mandar está en `cliente/Dockerfile.dockerignore`.

### b. Como hacer Correr, Acceso credenciales

```bash
cp .env.ejemplo .env            # y completar las claves
docker compose up -d --build    # base, servidor y cliente
docker compose exec servidor npm run migrar
docker compose exec servidor npm run sembrar
```

El sistema queda en `http://localhost:8080` y la API en `http://localhost:3000`. Para apagar: `docker compose down`; para borrar también la base: `docker compose down -v`.

#### i. Base de datos

```bash
docker exec -it ganado_postgres psql -U ganado_usuario -d gestion_ganado
```

Usuario y contraseña: `DB_USUARIO` y `DB_CONTRASENA` de `.env`. Desde una herramienta gráfica (pgAdmin, DBeaver): servidor localhost, puerto `DB_PUERTO`.

#### ii. Roles Admin, User, etc

Las cuentas del punto 8: Admin de plataforma (soporte@plataforma.bo), propietarios, socios y colaboradores, con la contraseña Ganado2026.

#### iii. Base de datos con datos válidos y legibles

`npm run sembrar` carga dos ranchos de ejemplo con nombres, caravanas, corrales, productos, esquemas, aplicaciones y pesajes legibles y coherentes entre sí (fechas, pesos y categorías que cuadran). La alternativa sin servidor son los scripts de `base-de-datos/` (punto 7).

## 14. Personalización y configuración

| Qué | Cómo se cambia |
| --- | --- |
| Variables del sistema | En `.env` (punto 10): puertos, base, sesiones, correo y asistente. Se reinicia el servidor. |
| Idioma de la interfaz | Cada usuario lo elige en Mi perfil o en el menú de su cuenta. Se agregan idiomas copiando idiomas/es.json con otro código y traduciendo los valores (DECISIONES §34). |
| País, unidades y formato de fecha | El país del rancho define kilos o libras, hectáreas o acres, el formato de fecha y la zona horaria. El catálogo está en la tabla paises. |
| Tipos de colaborador y permisos | El propietario, desde Equipo · Tipos y permisos: ajusta los predefinidos, crea los suyos y habilita módulos a cada socio. |
| Razas, productos y esquemas | Cada rancho agrega sus razas al registrar un animal, y sus productos y esquemas en Sanidad. |
| Asistente | Proveedor y modelo con ASISTENTE_URL y ASISTENTE_MODELO; cuota mensual con ASISTENTE_CONSULTAS_MES. |
| Correo | CORREO_TRANSPORTE=consola o brevo, y el nombre del remitente con CORREO_REMITENTE_NOMBRE. |
| Apariencia | Colores, espacios y tipografía en cliente/src/estilos/tokens.css; la página /sistema-diseno muestra todos los componentes. |

> **Límites de referencia.** Sesión de acceso de 15 minutos y de refresco de 30 días; bloqueo de 15 minutos tras 5 intentos; contraseña de 8 caracteres con mayúscula y número; importación de hasta 5000 filas; acciones masivas hasta 5000 animales; pesaje masivo hasta 500; peso hasta 3000 kg; cuerpo de petición hasta 8 MB; pregunta al asistente hasta 500 caracteres.

## 15. Seguridad

### Autenticación y sesiones

- Registro con verificación de correo obligatoria antes de entrar a cualquier pantalla.
- Token de acceso JWT de 15 minutos firmado con JWT_SECRETO, y sesión de refresco de 30 días guardada como hash y revocable.
- Cambiar o restablecer la contraseña cierra todas las sesiones del usuario.
- Contraseñas con scrypt y sal; nadie las ve, tampoco el propietario. Clave temporal obligatoria de cambiar.
- Bloqueo de 15 minutos tras 5 intentos fallidos.

### Permisos de acceso

- Permisos por módulo con dos niveles (ver y editar), decididos en el servidor en cada petición; la pantalla solo oculta botones por comodidad.
- Dar de baja registros es solo del propietario y del Admin en soporte.
- El Admin entra a un rancho con un acceso registrado, con motivo y vencimiento, que el propietario puede ver.

### Protección de los datos

- Aislamiento entre ranchos: el rancho sale de la sesión, todas las consultas filtran por él y las llaves foráneas compuestas lo refuerzan en la base. Lo prueba aislamiento.test.js.
- SQL siempre parametrizado; nada se borra físicamente; cada registro guarda quién lo creó y modificó.
- El asistente solo lee, usa los mismos servicios con sus permisos, no ve identificadores internos y trata los textos de los datos como datos, no como instrucciones. La clave del proveedor no sale del servidor.

### Prácticas recomendadas antes de producción

1. Quitar el modo de demostración: la cabecera `x-usuario-id`, `USUARIO_DEMO_ID` y la barra de demostración del cliente.
1. Usar un `JWT_SECRETO` largo y propio, y no subir nunca `.env` al repositorio.
1. Restringir CORS al dominio del cliente (hoy `origin: true`) y servir todo por HTTPS.
1. Pasar el asistente a la capa paga del proveedor si se usan datos reales: en la capa gratis de Gemini, Google puede usar lo enviado para mejorar sus productos.
1. Programar copias de seguridad de la base (pg_dump) y probar la restauración.

## 16. Glosario de términos

| Término | Significado |
| --- | --- |
| API REST | Interfaz del servidor a la que el cliente le pide y le manda datos en JSON por HTTP. |
| Baja lógica | Marcar un registro como eliminado sin borrarlo, para poder restaurarlo. |
| Caravana | Arete con el número que identifica al animal. |
| Categoría | Ternero, ternera, torito, vaquilla, novillo, vaca, toro o buey; depende del sexo y la edad. |
| CORS | Regla del navegador que decide qué sitios pueden llamar a la API. |
| Docker / Compose | Herramientas que empaquetan cada parte en un contenedor y las levantan juntas. |
| Esquema de vacunación | Qué producto aplicar, a qué animales, cuántas dosis y cada cuánto. |
| Ganancia diaria (GDP) | Kilos que gana un animal por día entre dos pesajes. |
| Herramienta (asistente) | Función del servidor que el modelo de lenguaje puede pedir para obtener datos. |
| JWT | Token firmado que prueba la identidad del usuario por poco tiempo. |
| Migración | Archivo SQL numerado que cambia el esquema de la base en orden. |
| Modelo de lenguaje | Programa de IA que entiende y redacta texto; aquí, Gemini o los de Groq. |
| Semilla | Datos de ejemplo que se cargan para desarrollar y demostrar. |
| UUID | Identificador único de 128 bits que se puede generar sin consultar la base. |

## 17. Referencias y recursos adicionales

### Del propio proyecto

- `README.md`: este manual, en el repositorio.
- `DECISIONES.md`: las 48 decisiones técnicas con su motivo.
- `documentos/PLAN_DE_PRUEBAS.md` y los informes de QA de cada sprint.
- `documentos/manuales/`: manual de usuario y este manual en Word.

### Documentación técnica

| Recurso | Enlace |
| --- | --- |
| NestJS | https://docs.nestjs.com |
| React | https://react.dev |
| Vite | https://vite.dev |
| PostgreSQL | https://www.postgresql.org/docs/ |
| node-postgres | https://node-postgres.com |
| Docker Compose | https://docs.docker.com/compose/ |
| Gemini API (compatibilidad con OpenAI) | https://ai.google.dev/gemini-api/docs/openai |
| Groq | https://console.groq.com/docs |
| Firebase Hosting | https://firebase.google.com/docs/hosting |
| Render | https://render.com/docs |
| Neon | https://neon.com/docs |
| Brevo API | https://developers.brevo.com |

## 18. Herramientas de Implementación

### Lenguajes de programación

- TypeScript 6 (servidor y cliente) y JavaScript (scripts de migración, semillas y pruebas del servidor).
- SQL (PostgreSQL) para migraciones y consultas.
- HTML y CSS con variables (tokens del sistema de diseño).

### Frameworks

| Framework o biblioteca | Versión | Uso |
| --- | --- | --- |
| NestJS | 12 | Servidor: módulos, controladores, inyección de dependencias. |
| React | 19 | Interfaz de usuario. |
| Vite | 8 | Desarrollo y compilación del cliente. |
| react-router-dom | 7 | Rutas del cliente. |
| node-postgres (pg) | 8 | Conexión a PostgreSQL. |
| exceljs | 4 | Importación y exportación de Excel. |
| Leaflet | 1.9 | Mapa del rancho con OpenStreetMap. |
| Vitest y Testing Library | 5 | Pruebas del cliente. |

### APIs de terceros, etc.

| Servicio | Uso |
| --- | --- |
| Gemini API (Google) o Groq | Modelo de lenguaje del asistente, por el formato de chat de OpenAI con herramientas. |
| Brevo | Envío de correos de verificación, alta y recuperación. |
| OpenStreetMap | Mapas de la ubicación del rancho. |
| GitHub Actions | Integración continua: pruebas en cada pull request y en main. |
| Docker Hub | Imágenes base postgres:18, node:24-alpine y nginx:1.27-alpine. |
| Trello y Figma | Gestión del backlog y diseño de pantallas. |

## 19. Bibliografía

Docker Inc. (2026). Docker Compose documentation. https://docs.docker.com/compose/

Fowler, M. (2002). Patterns of enterprise application architecture. Addison-Wesley.

Gamma, E., Helm, R., Johnson, R. y Vlissides, J. (1994). Design patterns: Elements of reusable object-oriented software. Addison-Wesley.

Google. (2026). Gemini API: OpenAI compatibility y Function calling. https://ai.google.dev/gemini-api/docs

Google. (2026). Firebase Hosting documentation. https://firebase.google.com/docs/hosting

Martin, R. C. (2017). Clean architecture: A craftsman's guide to software structure and design. Prentice Hall.

Meta Platforms. (2026). React documentation. https://react.dev

NestJS. (2026). NestJS documentation. https://docs.nestjs.com

OWASP Foundation. (2021). OWASP Top 10. https://owasp.org/Top10/

PostgreSQL Global Development Group. (2026). PostgreSQL 18 documentation. https://www.postgresql.org/docs/18/

Schwaber, K. y Sutherland, J. (2020). The Scrum guide. https://scrumguides.org

## Anexo A. Rutas de la API

- Base: `http://localhost:3000`. Todo es JSON.
- `Authorization: Bearer <token>` en las rutas privadas y `Accept-Language: es | en` para el idioma de los mensajes.
- Errores: 400 datos inválidos, 401 sin sesión, 403 sin permiso, 404 no existe, 409 conflicto, 429 cuota agotada, 503 servicio externo no disponible.
- Públicas: GET /paises y las rutas de registro, ingreso, verificación y recuperación.

93 rutas en total:

#### Usuarios, sesión y contraseñas

| Método | Ruta | Qué hace |
| --- | --- | --- |
| POST | `/usuarios/registro` | Registro de un propietario nuevo. |
| POST | `/usuarios/ingreso` | Inicio de sesión: devuelve token de acceso y de refresco. |
| POST | `/usuarios/refresco` | Renueva el token de acceso. |
| POST | `/usuarios/cierre` | Cierra la sesión (revoca el refresco). |
| GET | `/usuarios/yo` | Usuario de la sesión, con rol y rancho. |
| GET | `/usuarios/yo/perfil` | Datos de Mi perfil. |
| PATCH | `/usuarios/yo/perfil` | Edita nombre, país e idioma. |
| POST | `/usuarios/verificacion` | Confirma el correo con el código del enlace. |
| POST | `/usuarios/verificacion/reenvio` | Reenvía el correo de verificación. |
| POST | `/usuarios/mi-contrasena` | Cambia la contraseña propia. |
| POST | `/usuarios/:id/restablecer-contrasena` | El propietario genera una clave temporal para un miembro. |
| POST | `/usuarios/recuperacion-contrasena` | Pide el correo de recuperación. |
| POST | `/usuarios/recuperacion-contrasena/ejecutar` | Fija la contraseña nueva con el enlace. |
| POST | `/usuarios/colaboradores` | Alta de colaborador con clave temporal. |

#### Ranchos

| Método | Ruta | Qué hace |
| --- | --- | --- |
| POST | `/ranchos` | Crea el rancho del propietario. |
| GET | `/ranchos` | Ranchos visibles para el usuario. |
| GET | `/ranchos/mio` | Rancho del usuario con sus cifras. |
| GET | `/ranchos/:id` | Datos de un rancho. |
| PATCH | `/ranchos/:id` | Edita el rancho. |
| DELETE | `/ranchos/:id` | Baja lógica del rancho. |

#### Países

| Método | Ruta | Qué hace |
| --- | --- | --- |
| GET | `/paises` | Catálogo de países con moneda, unidades y formato (público). |

#### Guía de configuración

| Método | Ruta | Qué hace |
| --- | --- | --- |
| GET | `/guia` | Estado de la guía de configuración inicial. |
| POST | `/guia/pasos/:paso/visita` | Marca un paso de la guía como visitado. |
| POST | `/guia/pasos/:paso/completar` | Marca un paso como completado. |
| POST | `/guia/pasos/:paso/reabrir` | Vuelve a abrir un paso. |
| POST | `/guia/pausa` | Pausa la guía. |

#### Equipo

| Método | Ruta | Qué hace |
| --- | --- | --- |
| GET | `/equipo` | Socios y colaboradores del rancho. |
| POST | `/equipo` | Da de alta a un socio o colaborador. |
| PATCH | `/equipo/:id/estado` | Activa o suspende a un miembro del equipo. |

#### Tipos de colaborador

| Método | Ruta | Qué hace |
| --- | --- | --- |
| GET | `/equipo/modulos` | Módulos sobre los que se dan permisos. |
| GET | `/equipo/tipos` | Tipos de colaborador con sus permisos. |
| POST | `/equipo/tipos` | Crea un tipo de colaborador. |
| PUT | `/equipo/tipos/:id` | Edita nombre y permisos de un tipo. |
| POST | `/equipo/tipos/:id/restablecer` | Devuelve un tipo predefinido a sus permisos de fábrica. |
| DELETE | `/equipo/tipos/:id` | Elimina un tipo propio sin colaboradores. |
| PATCH | `/equipo/:id/tipo` | Asigna un tipo a un colaborador. |

#### Permisos

| Método | Ruta | Qué hace |
| --- | --- | --- |
| GET | `/permisos/mios` | Nivel de acceso del usuario en cada módulo. |
| GET | `/permisos/socios/:id` | Permisos de un socio. |
| PUT | `/permisos/socios/:id` | Guarda los permisos de un socio. |

#### Administración de plataforma

| Método | Ruta | Qué hace |
| --- | --- | --- |
| GET | `/admin/ranchos` | Lista los ranchos de la plataforma (solo admin). |
| POST | `/admin/ranchos/:id/accesos` | Abre un acceso de soporte a un rancho, con motivo. |
| POST | `/admin/accesos/:id/salida` | Cierra el acceso de soporte. |
| GET | `/admin/accesos/de-mi-rancho` | El propietario ve qué accesos de soporte hubo a su rancho. |
| GET | `/admin/accesos` | Historial de accesos del admin. |

#### Animales

| Método | Ruta | Qué hace |
| --- | --- | --- |
| GET | `/animales/categorias` | Catálogo de categorías (ternero, vaquilla, novillo…). |
| GET | `/animales/razas` | Razas disponibles para el rancho. |
| GET | `/animales/categorias/reglas` | Reglas de categoría según sexo y edad. |
| GET | `/animales` | Listado paginado con filtros, búsqueda y orden. |
| GET | `/animales/:id` | Ficha completa del animal. |
| POST | `/animales` | Registra un animal (formulario o alta rápida). |
| PATCH | `/animales/:id` | Edita los datos del animal. |
| POST | `/animales/:id/movimientos` | Mueve el animal a otro corral. |
| POST | `/animales/:id/estado` | Cambia el estado (activo, vendido, muerto…). |
| DELETE | `/animales/:id` | Baja lógica del animal. |
| POST | `/animales/:id/restaurar` | Deshace la baja. |

#### Corrales

| Método | Ruta | Qué hace |
| --- | --- | --- |
| GET | `/corrales` | Lista los corrales del rancho. |
| GET | `/corrales/carga` | Ocupación de cada corral frente a su capacidad. |
| POST | `/corrales` | Crea un corral. |
| PATCH | `/corrales/:id` | Edita un corral. |
| DELETE | `/corrales/:id` | Baja lógica del corral. |
| POST | `/corrales/:id/restaurar` | Deshace la baja del corral. |
| POST | `/corrales/:id/animales` | Asigna varios animales al corral. |

#### Acciones masivas

| Método | Ruta | Qué hace |
| --- | --- | --- |
| POST | `/masivo/animales/estado` | Cambia el estado de varios animales. |
| POST | `/masivo/animales/baja` | Da de baja a varios animales. |

#### Importación

| Método | Ruta | Qué hace |
| --- | --- | --- |
| GET | `/importacion/plantilla` | Descarga la plantilla de Excel. |
| POST | `/importacion/vista-previa` | Lee el archivo y devuelve filas válidas, con error y duplicadas. |
| POST | `/importacion/confirmar` | Carga las filas válidas. |

#### Exportación

| Método | Ruta | Qué hace |
| --- | --- | --- |
| GET | `/exportacion` | Exporta animales, corrales, movimientos y estados en xlsx o csv. |

#### Sanidad: productos y aplicaciones

| Método | Ruta | Qué hace |
| --- | --- | --- |
| GET | `/sanidad/productos` | Catálogo de productos sanitarios. |
| POST | `/sanidad/productos` | Crea un producto propio del rancho. |
| PATCH | `/sanidad/productos/:id` | Edita un producto. |
| DELETE | `/sanidad/productos/:id` | Baja lógica del producto. |
| GET | `/sanidad/aplicaciones/opciones` | Productos y esquemas para el formulario de aplicación. |
| POST | `/sanidad/aplicaciones/masiva` | Registra una aplicación a varios animales. |
| GET | `/sanidad/animales/buscar` | Busca un animal por caravana (vacuna rápida). |
| GET | `/sanidad/animales/:id/aplicaciones` | Historial sanitario de un animal. |
| POST | `/sanidad/animales/:id/aplicaciones` | Registra una aplicación individual. |

#### Sanidad: esquemas y calendario

| Método | Ruta | Qué hace |
| --- | --- | --- |
| GET | `/sanidad/esquemas` | Esquemas de vacunación del rancho. |
| POST | `/sanidad/esquemas` | Crea un esquema. |
| PATCH | `/sanidad/esquemas/:id` | Edita un esquema. |
| DELETE | `/sanidad/esquemas/:id` | Baja lógica del esquema. |
| GET | `/sanidad/calendario` | Dosis pendientes (lista paginada con filtros). |
| GET | `/sanidad/calendario/mes` | Dosis por día de un mes (vista mensual). |
| GET | `/sanidad/avisos` | Avisos de dosis vencidas y próximas. |

#### Pesajes

| Método | Ruta | Qué hace |
| --- | --- | --- |
| GET | `/pesajes/animales/:id` | Pesajes de un animal. |
| POST | `/pesajes` | Registra un pesaje individual. |
| POST | `/pesajes/rapido` | Pesaje rápido desde el celular. |
| POST | `/pesajes/masivo/animales` | Animales que se pueden pesar en lote. |
| POST | `/pesajes/masivo` | Registra pesajes de varios animales. |

#### Indicadores y paneles

| Método | Ruta | Qué hace |
| --- | --- | --- |
| GET | `/indicadores/panel` | Cifras y gráficos del panel de inicio. |
| GET | `/indicadores/pesajes/comparativa` | Comparativa de peso por corral o categoría. |

#### Asistente con IA

| Método | Ruta | Qué hace |
| --- | --- | --- |
| GET | `/asistente` | Si el asistente está configurado, la cuota del mes y los módulos que puede consultar. |
| POST | `/asistente/preguntas` | Pregunta en lenguaje natural; responde con los datos del rancho. |

## Anexo B. Pruebas e integración continua

Servidor: 43 archivos y 487 pruebas que hablan con la base real y el servidor levantado. Cliente: 19 archivos y 202 pruebas con Vitest. La integración continua (.github/workflows/pruebas.yml) las corre en cada pull request y en main, junto con el lint y la compilación.

```bash
cd servidor
npm test                    # con la base sembrada y el servidor levantado
npm run probar:asistente    # o una sola
cd ../cliente
npm run lint
npm test
npm run build
```

Las pruebas del asistente usan un proveedor simulado en el puerto 4599: el servidor tiene que arrancar con `ASISTENTE_URL=http://localhost:4599/v1` y `ASISTENTE_CLAVE=prueba`. Si apunta a un proveedor real, esas pruebas se omiten para no gastar la cuota gratis.
