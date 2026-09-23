# Plan de Pruebas y Control de Calidad — Sprint 1
**Sistema de Gestión de Ganado**  
**Responsable de Calidad (QA):** Romina  
**Versión:** 2.0  
**Fecha:** 23 de Septiembre de 2026  
**Referencia:** Propuesta v4.0 (Sección 20 - Definición de Terminado), Product Backlog v2 y DECISIONES.md.

---

## 1. Propósito y Alcance

Este documento establece el marco formal de verificación y aseguramiento de la calidad para el **Sprint 1 (Fase 1: Cimiento, acceso y puesta en marcha)**, auditando de manera exhaustiva el código, los esquemas de base de datos, los componentes de interfaz de usuario y las suites de pruebas automatizadas del proyecto.

El Sprint 1 comprende **16 historias de usuario (73 puntos)**. Este informe consolida la auditoría técnica de las **9 historias completadas e integradas**, la implementación de **HU-11**, y el estado de avance de las historias pendientes para el cierre del sprint (Domingo 27 de Septiembre).

---

## 2. Definición de Terminado (Definition of Done - DoD)

Basado estrictamente en la **Sección 20 de la Propuesta**:

> Ninguna historia de usuario podrá ser movida a la columna **Finalizado** en el tablero de Trello si no cuenta con el visto bueno formal del rol de Calidad (Romina) bajo los siguientes tres pilares:

1. **Cobertura de Pruebas Automatizadas:** Todo desarrollo backend y frontend debe incluir pruebas unitarias o de integración que verifiquen el camino principal (*happy path*) y al menos un caso de error o borde.
2. **Cumplimiento de Aislamiento Multi-inquilino (Multi-tenant):** Toda funcionalidad que acceda o persista datos productivos debe pasar exitosamente las pruebas de aislamiento por `rancho_id`.
3. **Validación Criterio por Criterio:** Cada ítem del checklist de criterios de aceptación de la tarjeta debe ser comprobado y marcado por Calidad.

---

## 3. Resumen Ejecutivo de Calidad — Sprint 1

| Historia | Responsable | Pts | Estado QA | Veredicto Técnico |
| :--- | :---: | :---: | :---: | :--- |
| **HU-01: Entorno de desarrollo y repositorio** | Favio | 8 | ✅ **Aprobada** | Dockerfile, compose, README y CI en `.github/workflows/pruebas.yml` activos. |
| **HU-02: Base de datos y migraciones** | Brian | 13 | ✅ **Aprobada** | 11 tablas creadas con UUIDs, triggers de auditoría y corredor `migrar.js`. |
| **HU-03: Aislamiento entre ranchos** | Brian / Romina | 8 | ✅ **Aprobada** | `RepositorioBase.js` fuerza el filtro y suite de 5 tests pasando en verde. |
| **HU-04: Juego de datos de prueba** | Romina | 3 | ✅ **Aprobada** | Semillas de 2 ranchos bolivianos y 11 usuarios con script `sembrar.js`. |
| **HU-05: Sistema de diseño** | Aaron | 5 | ✅ **Aprobada** | Tokens CSS, componentes base en React, tipografía y paleta accesibles. |
| **HU-06: Registro de propietario** | Aaron | 5 | ✅ **Aprobada** | Formulario, validaciones en tiempo real, hash scrypt y creación en BD. |
| **HU-07: Verificación de correo** | Aaron | 3 | ✅ **Aprobada** | Generación y consumo de tokens, servicio de correo y activación de cuenta. |
| **HU-10: Cambio obligatorio de contraseña** | Aaron | 3 | ✅ **Aprobada** | Flag `debe_cambiar_contrasena`, bloqueo de navegación y reseteo forzado. |
| **HU-15: Creación del rancho** | Aaron | 5 | ✅ **Aprobada** | Formulario completo, datos opcionales/coherentes, unicidad por propietario. |
| **HU-11: Bloqueo por intentos fallidos** | Romina | 2 | ✅ **Aprobada** | Lógica de 5 intentos fallidos, bloqueo de 15 min y suite unitaria en verde. |
| **HU-08: Inicio de sesión** | Favio | 5 | ⏳ *En desarrollo* | Esperada para el Martes 22 / Miércoles 23. |
| **HU-12: Manejo de sesión y cierre** | Favio | 5 | ⏳ *En desarrollo* | Esperada para el Martes 22 / Miércoles 23. |
| **HU-13: Perfil y datos personales** | Brian | 3 | ⏳ *En desarrollo* | Esperada para el Martes 22. |
| **HU-14: Configuración regional y país** | Brian | 3 | ⏳ *En desarrollo* | Esperada para el Martes 22. |
| **HU-09: Recuperación de contraseña** | Brian | 5 | ⏳ *En desarrollo* | Esperada para el Jueves 24. |
| **HU-23: Registro de eventos de auditoría** | Brian | 5 | ⏳ *En desarrollo* | Esperada para el Jueves 24. |

---

## 4. Matriz Detallada de Verificación — Historias Auditadas

### HU-01: Entorno de desarrollo y repositorio (Favio — 8 pts)
* **[x] Protección de rama main:** `main` está protegida con regla de PR y revisión obligatoria en GitHub.
* **[x] Integración continua (CI):** Implementada en `.github/workflows/pruebas.yml` (compila cliente/servidor y ejecuta pruebas sobre PostgreSQL 18).
* **[x] Levantamiento con un solo comando:** `docker-compose.yml` y `servidor/Dockerfile` levantan PostgreSQL y el backend.
* **[x] Instrucciones claras:** `README.md` incluye guía paso a paso de arranque y configuración de entorno.

### HU-02: Base de datos y migraciones (Brian — 13 pts)
* **[x] Tablas del modelo creadas:** Esquema inicial en `001_fase1_esquema_inicial.sql` y `002_hu06_pais_del_usuario.sql`.
* **[x] Migraciones versionadas y ordenadas:** Corredor `migrar.js` registra la tabla de control `migraciones_aplicadas`.
* **[x] Identificadores UUID:** Todas las tablas de entidades usan `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`.
* **[x] Auditoría y borrado lógico:** Columnas `creado_en`, `modificado_en`, `creado_por`, `modificado_por`, `eliminado_en` y trigger `fn_tocar_modificado_en`.

### HU-03: Aislamiento de datos entre ranchos (Brian / Romina — 8 pts)
* **[x] Filtro en un único lugar:** `servidor/RepositorioBase.js` centraliza las consultas imponiendo `WHERE rancho_id = $1`.
* **[x] Obligatoriedad de rancho:** El constructor rechaza instancias sin `rancho_id` válido arrojando error crítico.
* **[x] Pruebas automáticas de rechazo:** `servidor/pruebas/aislamiento.test.js` ejecuta 5 casos de prueba de aislamiento con 100% de éxito.

### HU-04: Juego de datos de prueba (Romina — 3 pts)
* **[x] Carga por comando único:** `npm run sembrar` ejecuta `servidor/semillas/001_datos_prueba.sql`.
* **[x] Dos ranchos bolivianos:** Carga `Rancho El Cerrito` (Warnes, Santa Cruz) y `Hacienda La Floresta` (Quillacollo, Cochabamba).
* **[x] Cuatro roles cubiertos:** `admin_plataforma`, `propietario`, `socio` y `colaborador`.
* **[x] Cuatro tipos de colaborador:** Veterinario, Encargado de campo, Encargado de almacén y Administrativo con UUIDs estándar.

### HU-05: Sistema de diseño (Aaron — 5 pts)
* **[x] Fidelidad al diseño de Figma:** Implementado en `cliente/src/estilos/` (`tokens.css`, `base.css`, `componentes.css`).
* **[x] Componentes reutilizables:** `Boton`, `Campo`, `Tarjeta`, `Alerta`, `Insignia`, `Iconos`, `DisenoAcceso`, `DisenoApp`.
* **[x] Responsive y accesible:** Adaptado a pantallas móviles y de escritorio con contraste visual adecuado.

### HU-06: Registro de cuenta de propietario (Aaron — 5 pts)
* **[x] Formulario de registro:** Implementado en `cliente/src/paginas/registro/PaginaRegistro.tsx`.
* **[x] Validación de contraseñas:** 8 caracteres, 1 mayúscula y 1 número validado con `revisarContrasena()`.
* **[x] Cifrado seguro:** `servidor/src/comun/contrasenas.ts` aplica algoritmo `scrypt` con sal aleatoria.
* **[x] No duplicidad de correo:** Verificación previa mediante índice único insensible a mayúsculas/minúsculas.

### HU-07: Verificación de correo electrónico (Aaron — 3 pts)
* **[x] Envío de token:** Generación de token criptográfico temporal y despacho vía `servicio-correo.ts`.
* **[x] Pantalla de verificación:** `PaginaVerificacion.tsx` permite ingresar el token o hacer clic en el enlace.
* **[x] Activación de cuenta:** Pone `correo_verificado = TRUE` e invalida el token consumido.

### HU-10: Cambio obligatorio de contraseña (Aaron — 3 pts)
* **[x] Detección de clave temporal:** Campo `debe_cambiar_contrasena = TRUE` en la base de datos.
* **[x] Bloqueo de navegación:** `guardia-cuenta-lista.ts` impide operar el sistema hasta cambiar la clave.
* **[x] Pantalla de cambio forzado:** `PaginaCambioContrasena.tsx` valida la nueva clave y actualiza el hash en BD.

### HU-15: Creación del rancho inicial (Aaron — 5 pts)
* **[x] Formulario completo:** Nombre, departamento, localidad, superficie y tipo de producción (carne/leche/mixto).
* **[x] Coordenadas opcionales y coherentes:** Validación de latitud y longitud numéricas.
* **[x] Unicidad por propietario:** Restricción `ux_ranchos_propietario` evita más de un rancho por cuenta.
* **[x] Redirección automática:** Al completar la creación, el propietario es habilitado a la pantalla principal.

### HU-11: Bloqueo por intentos fallidos (Romina — 2 pts)
* **[x] Contador de intentos:** Métodos `registrarIntentoFallido` y `reiniciarIntentosFallidos` en `RepositorioUsuario`.
* **[x] Bloqueo temporal:** Al 5to intento fallido consecutivo se asigna `bloqueado_hasta = CURRENT_TIMESTAMP + 15 min`.
* **[x] Pruebas unitarias de calidad:** `servidor/pruebas/bloqueo.test.js` con 5 pruebas unitarias pasando al 100% verde.

---

## 5. Instrucciones de Reproducción de Pruebas (Guía para Evaluadores)

Para ejecutar la verificación completa de calidad en una máquina local:

```bash
# 1. Compilar el cliente frontend
cd cliente
npm install
npm run build

# 2. Compilar el servidor backend y ejecutar pruebas
cd ../servidor
npm install
npm run construir
npm test
```

---

## 6. Veredicto Final de Calidad

* **Historias Verificadas y Aprobadas para Pasar a Finalizado:** **HU-01, HU-02, HU-03, HU-04, HU-05, HU-06, HU-07, HU-10, HU-15 y HU-11.**
* **Historias Pendientes de Entrega por el Equipo:** **HU-08, HU-09, HU-12, HU-13, HU-14 y HU-23.**
