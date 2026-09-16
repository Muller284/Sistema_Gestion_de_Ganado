# Plan de Pruebas y Control de Calidad — Sprint 1
**Sistema de Gestión de Ganado**  
**Responsable de Calidad (QA):** Romina  
**Versión:** 1.0  
**Fecha:** Septiembre 2026  
**Referencia:** Propuesta v4.0 (Sección 20 - Definición de Terminado), Product Backlog v2 y Guía de Arranque Técnico.

---

## 1. Propósito y Alcance

Este documento establece el marco formal de verificación y aseguramiento de la calidad para el **Sprint 1 (Fase 1: Cimiento, acceso y puesta en marcha)**, con foco crítico e innegociable en las **cinco historias comprometidas para la entrega y demostración del miércoles**:

1. **HU-01:** Entorno de desarrollo y repositorio (Favio)
2. **HU-02:** Base de datos y migraciones (Brian)
3. **HU-03:** Aislamiento de datos entre ranchos (Brian / Romina)
4. **HU-04:** Juego de datos de prueba (Romina)
5. **HU-15:** Creación del rancho (Aaron)

---

## 2. Definición de Terminado (Definition of Done - DoD)

Basado estrictamente en la **Sección 20 de la Propuesta**:

> Ninguna historia de usuario podrá ser movida a la columna **Finalizado** en el tablero de Trello si no cuenta con el visto bueno formal del rol de Calidad (Romina) bajo los siguientes tres pilares:

1. **Cobertura de Pruebas Automatizadas:** Todo desarrollo backend debe incluir pruebas unitarias o de integración que verifiquen el camino principal (*happy path*) y al menos un caso de error o borde.
2. **Cumplimiento de Aislamiento Multi-inquilino (Multi-tenant):** Toda funcionalidad que acceda o persista datos productivos debe pasar exitosamente las pruebas de aislamiento por `rancho_id`.
3. **Validación Criterio por Criterio:** Cada ítem del checklist de criterios de aceptación de la tarjeta debe ser comprobado y marcado por Calidad.

---

## 3. Criterios de Severidad de Fallos

Para evitar debates subjetivos en las reuniones y fijar una vara objetiva:

* **Fallo Bloqueante (Showstopper / Bloquea entrega):**
  * Incumplimiento de cualquier criterio de aceptación estipulado.
  * Fuga de datos entre ranchos (violación de aislamiento).
  * Error que impida levantar el entorno o ejecutar migraciones/semillas con un solo comando.
  * Caída o ruptura de la suite de pruebas (`npm test` en rojo).
  * *Acción:* La historia se rechaza, permanece en *En Proceso* o *En Revisión* y se notifica al responsable.
* **Observación Menor (No bloqueante / Deuda técnica):**
  * Ajustes estéticos menores de espaciado o tipografía en componentes UI que no impidan el flujo.
  * Mensajes de advertencia en consola que no comprometan la estabilidad ni la seguridad.
  * *Acción:* Se anota como ítem de mejora en la tarjeta de Trello para el siguiente sprint.

---

## 4. Matriz de Verificación para la Demostración del Miércoles

A continuación se detallan las listas de comprobación (*checklists*) operativas para cada una de las historias de la entrega:

### HU-01: Entorno de desarrollo y repositorio
* **Responsable:** Favio  
* **Verifica:** Romina (Martes previo a la demo)  
* **Prioridad:** Alta (8 pts) | **Requisito:** RNF-10

| Check | Criterio de Aceptación | Cómo se comprueba | Estado |
| :---: | :--- | :--- | :---: |
| [x] | **Protección de rama main:** La rama principal está protegida y solo se integra mediante revisión de otra persona. | Intentar un `git push origin main` directo desde una cuenta colaboradora; GitHub debe rechazarlo exigiendo Pull Request y aprobación. | **Cumplido** |
| [ ] | **Integración continua (CI):** Cada cambio dispara automáticamente las pruebas. | Abrir un PR en GitHub y comprobar que el workflow de GitHub Actions se dispara y ejecuta `npm test`. | Pendiente Favio (falta `.github/workflows/ci.yml`) |
| [ ] | **Levantamiento con un solo comando:** El sistema completo se levanta desde cero. | Ejecutar `docker compose up` en una terminal limpia; deben iniciar los contenedores de la BD y la app sin pasos manuales adicionales. | Incompleto (falta `servidor/Dockerfile`) |
| [x] | **Instrucciones claras:** El repositorio incluye instrucciones de instalación y ejecución. | Seguir el `README.md` paso a paso en una máquina limpia sin requerir soporte verbal. | **Cumplido** |

---

### HU-02: Base de datos y migraciones
* **Responsable:** Brian  
* **Verifica:** Romina (Lunes y Martes)  
* **Prioridad:** Alta (13 pts) | **Requisitos:** RNF-06, RNF-09

| Check | Criterio de Aceptación | Cómo se comprueba | Estado |
| :---: | :--- | :--- | :---: |
| [x] | **Tablas del modelo creadas:** Existen las tablas de la Fase 1 según modelo aprobado (11 tablas: `usuarios`, `ranchos`, `tipos_colaborador`, `permisos_tipo`, `permisos_usuario`, `paises`, `franjas_precio`, `modulos`, `tokens`, `sesiones`, `migraciones_aplicadas`). | Inspeccionar el esquema de PostgreSQL tras correr la migración y verificar la existencia de las tablas y sus llaves. | **Cumplido** |
| [x] | **Migraciones versionadas y ordenadas:** Se aplican en orden desde una base vacía. | Ejecutar `npm run migrate` sobre una BD vacía; debe ejecutar `001_fase1_esquema_inicial.sql` sin errores y registrarlo en `migraciones_aplicadas`. | **Cumplido** |
| [x] | **Identificadores generados por cliente:** IDs son UUID, no autoincrementales. | Verificar que las tablas tienen columna `id UUID PRIMARY KEY` sin secuencias (`SERIAL`). | **Cumplido** |
| [x] | **Auditoría y borrado lógico:** Toda tabla tiene `creado_en`, `modificado_en`, `creado_por`, `modificado_por` y `eliminado_en`. | Validar en el DDL y verificar que el trigger `fn_tocar_modificado_en()` actualiza `modificado_en` al hacer `UPDATE`. | **Cumplido** |

---

### HU-03: Aislamiento de datos entre ranchos (CRÍTICA)
* **Responsable:** Brian (Implementación) / Romina (Suite de Pruebas)  
* **Verifica:** Romina  
* **Prioridad:** Alta (8 pts) | **Requisito:** RNF-01

| Check | Criterio de Aceptación | Cómo se comprueba | Estado |
| :---: | :--- | :--- | :---: |
| [x] | **Filtro en un único lugar:** El filtro por rancho se aplica en un único lugar del código. | Inspeccionar `servidor/RepositorioBase.js`; toda consulta concatena obligatoriamente `WHERE rancho_id = $1 AND eliminado_en IS NULL`. | **Cumplido** |
| [x] | **Obligatoriedad de rancho:** No es posible ejecutar una consulta sin indicar el rancho. | Instanciar `RepositorioBase` con `null` o `undefined`; el constructor lanza error `SEGURIDAD CRÍTICA`. | **Cumplido** |
| [x] | **Pruebas automáticas de rechazo:** Existen pruebas automáticas que intentan leer datos de otro rancho y fallan. | Ejecutar `npm test` (`node servidor/pruebas/aislamiento.test.js`). 5 pruebas automáticas pasando en verde verificando intentos de lectura cruzada y retorno de 0 filas. | **Cumplido (100% Verde)** |

---

### HU-04: Juego de datos de prueba
* **Responsable:** Romina  
* **Verifica:** Romina / Brian  
* **Prioridad:** Media (3 pts) | **Ajuste:** Criterio de animales/corrales diferido a Fase 2

| Check | Criterio de Aceptación | Cómo se comprueba | Estado |
| :---: | :--- | :--- | :---: |
| [x] | **Carga por comando único:** Un solo comando carga los datos de prueba. | Ejecutar `npm run seed` (`node servidor/sembrar.js`); el script ejecuta `001_datos_prueba.sql` y notifica éxito. | **Cumplido** |
| [x] | **Al menos dos ranchos:** Carga al menos dos ranchos distintos para verificar el aislamiento. | Se cargan: 1) `Rancho El Cerrito` (Warnes, Santa Cruz) y 2) `Hacienda La Floresta` (Quillacollo, Cochabamba). | **Cumplido** |
| [x] | **Usuarios de los cuatro roles:** Incluye `admin_plataforma`, `propietario`, `socio` y `colaborador`. | Se insertan usuarios reales para cada uno de los 4 roles con contraseñas seguras y hashes listos. | **Cumplido** |
| [x] | **Cuatro tipos de colaborador:** Incluye Veterinario, Encargado de campo, Encargado de almacén y Administrativo. | Se mapean los UUIDs fijos predefinidos `11111111-1111-4111-8111-000000000001` al `0004` con sus permisos predeterminados. | **Cumplido** |
| [x] | **Datos verosímiles:** Nombres y localidades reales de Bolivia. | Coordenadas reales, departamentos bolivianos reales y nombres verosímiles (sin "test1" ni "prueba"). | **Cumplido** |

---

### HU-15: Creación del rancho
* **Responsable:** Aaron  
* **Verifica:** Romina (Martes tarde)  
* **Prioridad:** Alta (5 pts) | **Requisito:** RF-04

| Check | Criterio de Aceptación | Cómo se comprueba | Estado |
| :---: | :--- | :--- | :---: |
| [ ] | **Campos requeridos:** Formulario pide nombre, departamento, localidad, superficie y tipo de producción. | Probar el formulario UI enviando campos vacíos y corroborar validaciones requeridas. | Pendiente Frontend |
| [ ] | **Ubicación opcional:** Latitud y longitud son opcionales pero coherentes. | Guardar rancho sin coordenadas (debe permitir); guardar con coordenadas (deben guardarse ambas). | Pendiente Frontend |
| [ ] | **Bloqueo de navegación:** No se puede acceder a otra pantalla sin crear el rancho. | Ingresar con el usuario propietario recién creado (con `rancho_id` nulo); el sistema redirige forzosamente a `/crear-rancho`. | Pendiente Frontend |
| [ ] | **Unicidad:** Una cuenta maneja un solo rancho. | Intentar crear un segundo rancho con el mismo propietario; la BD y la API rechazan con error `ux_ranchos_propietario`. | Pendiente Frontend |

---

## 5. Dictamen Técnico de QA sobre HU-11 (Bloqueo por intentos fallidos)

Durante el análisis de calidad de los criterios del Sprint 1, Romina identifica una **incompatibilidad técnica directa** entre dos historias:

* **HU-11:** *"El aviso indica cuántos intentos quedan antes del bloqueo."*
* **HU-08:** *"Si no lo son, el mensaje no revela si el error fue el correo o la contraseña."*

### Veredicto de Seguridad y Calidad:
Si el sistema avisa *"Te quedan 2 intentos antes del bloqueo"*, un atacante puede enviar correos arbitrarios y descubrir inmediatamente cuáles cuentas existen en el sistema (ataque de enumeración de usuarios), violando directamente el requisito de seguridad **RNF-14** y la historia **HU-08**.

### Propuesta Oficial de Romina para la Reunión de Equipo:
1. Modificar el criterio de aceptación de HU-11 a:
   > *"Cuando el ingreso queda bloqueado tras 5 intentos fallidos consecutivos, el sistema muestra un mensaje indicando que la cuenta ha sido temporalmente bloqueada por 15 minutos, sin confirmar si la contraseña o el correo existían previamente."*
2. El contador de `intentos_fallidos` se gestiona en la base de datos de manera opaca al usuario.

---

## 6. Procedimiento para Ejecutar las Pruebas de la Demostración

Cualquier miembro del equipo o evaluador puede reproducir la verificación completa de calidad ejecutando en la raíz del proyecto:

```bash
# 1. Ejecutar la suite de pruebas de aislamiento (HU-03)
npm test

# 2. Cargar las semillas de datos de prueba en la base de datos (HU-04)
npm run seed
```

**Resultado esperado:**
Todas las pruebas de aislamiento finalizan en **[PASS]**, veredicto en verde, y los 2 ranchos y 11 usuarios quedan cargados y aislados sin conflictos.
