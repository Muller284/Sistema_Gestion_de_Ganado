# Informe y Guion Oficial de Verificación de Calidad (QA) — Cierre Sprint 1
**Sistema de Gestión de Ganado**  
**Responsable de Calidad (QA Lead):** Romina  
**Versión:** 2.0 (Cierre de Sprint 1)  
**Fecha:** 27 de Septiembre de 2026  
**Alcance:** 16 Historias de Usuario (73 Puntos)

---

## 1. Resumen Ejecutivo de Cierre del Sprint 1

El Sprint 1 (Fase 1: Cimiento, acceso y puesta en marcha) fue auditado técnica y funcionalmente bajo la **Sección 20 de la Propuesta (Definición de Terminado - DoD)**.

* **Historias de Usuario Verificadas y Aprobadas:** **16 de 16 (100% completadas)**
* **Puntos Totales Cerrados:** **73 de 73 puntos**
* **Estado de la Suite de Pruebas Automatizadas:** **100% Verde (`npm test` y GitHub Actions)**
* **Estado de Compilación:** Frontend y Backend compilan con **0 errores**.

---

## 2. Guion Oficial de Verificación de Extremo a Extremo (Punta a Punta)

Este es el procedimiento maestro paso a paso para reproducir la verificación completa del sistema durante la reunión de integración:

### FASE 0: Puesta en marcha desde cero (Entorno y BD)

1. **Levantar la base de datos PostgreSQL:**
   ```bash
   docker compose up -d postgres
   ```
2. **Ejecutar migraciones de base de datos (HU-02):**
   ```bash
   cd servidor
   npm run migrar
   ```
   * *Resultado esperado:* Crea las 11 tablas de Fase 1 con UUIDs y triggers.
3. **Cargar semillas de datos de prueba de Romina (HU-04):**
   ```bash
   npm run sembrar
   ```
   * *Resultado esperado:* Se insertan 2 ranchos (*Rancho El Cerrito* y *Hacienda La Floresta*) y 11 usuarios.
4. **Iniciar el servidor backend (HU-01):**
   ```bash
   npm run start:dev
   ```
   * *Resultado esperado:* Servidor escuchando en `http://localhost:3000`.
5. **Iniciar la aplicación web frontend (HU-01 y HU-05):**
   ```bash
   cd ../cliente
   npm run dev
   ```
   * *Resultado esperado:* Web activa en `http://localhost:5173`.

---

### FASE 1: Flujo Principal de Usuario (Camino Feliz)

| Paso | Acción | Entrada de Datos | Historia Asociada | Resultado Esperado |
| :---: | :--- | :--- | :---: | :--- |
| **1.1** | **Registro de Propietario** | Nombre: `Carlos Mendoza`<br>Correo: `carlos.mendoza@elcerrito.bo`<br>Clave: `Ganadero2026`<br>País: `Bolivia (BO)` | **HU-06**<br>**HU-14** | Formulario valida contraseña (8 car, 1 mayús, 1 num). Cuenta creada en BD con rol `propietario` y `correo_verificado = FALSE`. |
| **1.2** | **Verificación de Correo** | Ingresar token de verificación o clic en enlace | **HU-07** | Cuenta activada (`correo_verificado = TRUE`). Se habilita el ingreso. |
| **1.3** | **Inicio de Sesión** | Correo: `carlos.mendoza@elcerrito.bo`<br>Clave: `Ganadero2026` | **HU-08**<br>**HU-12** | Se genera token de sesión en BD. Ingreso exitoso. |
| **1.4** | **Bloqueo y Creación de Rancho** | Nombre: `Rancho Nuevo Amanecer`<br>Dpto: `Santa Cruz`<br>Localidad: `Warnes`<br>Superficie: `500 ha`<br>Tipo: `Carne` | **HU-15** | Como la cuenta nueva no tiene rancho (`rancho_id = NULL`), el sistema bloquea la navegación y fuerza la creación. Al guardar, redirige al panel principal. |

---

### FASE 2: Pruebas de Seguridad, Control y Excepciones

| Paso | Caso de Prueba | Procedimiento | Historia Asociada | Resultado Esperado |
| :---: | :--- | :--- | :---: | :--- |
| **2.1** | **Bloqueo por 5 intentos fallidos (Romina)** | En pantalla de login, ingresar correo y fallar la contraseña 5 veces seguidas. | **HU-11** | Al 5to fallo consecutivo, el sistema bloquea la cuenta por 15 minutos e impide el ingreso incluso con la clave correcta. |
| **2.2** | **Cambio forzado de clave temporal** | Ingresar con el usuario `ruben.paz@correo.bo` (Clave: `Temporal2026`). | **HU-10** | El sistema detecta `debe_cambiar_contrasena = TRUE`, bloquea el acceso a otras pantallas y obliga a ingresar una clave nueva antes de continuar. |
| **2.3** | **Recuperación de contraseña (Brian)** | En login, clic en "¿Olvidaste tu contraseña?" e ingresar correo. | **HU-09** | Se genera token temporal y enlace de restablecimiento. |
| **2.4** | **Unicidad de usuario por rancho (Brian)** | Intentar asociar una cuenta existente a un segundo rancho. | **HU-13** | La base de datos y la API rechazan la operación. |
| **2.5** | **Aislamiento multi-rancho (QA Romina)** | Consultar datos de *Rancho El Cerrito* usando token de *Hacienda La Floresta*. | **HU-03** | `RepositorioBase` fuerza `WHERE rancho_id = $1` y retorna 0 registros (aislamiento estricto). |

---

## 3. Matriz de Cobertura de Pruebas Automatizadas

```bash
# Ejecutar toda la suite de pruebas del backend
cd servidor
npm test
```

* **`aislamiento.test.js` (HU-03):** 5 pruebas de aislamiento multi-tenant aprobadas (100% verde).
* **`bloqueo.test.js` (HU-11):** 5 pruebas de máquina de estados de bloqueo temporal aprobadas (100% verde).
* **`registro.test.js` (HU-06 / HU-14):** Pruebas de validación de formulario y registro en BD aprobadas.
* **`cuenta.test.js` (HU-07 / HU-10 / HU-15):** Pruebas de ciclo de vida de cuenta y rancho aprobadas.
* **`sesion.test.js` (HU-08 / HU-12):** Pruebas de login, logout e invalidación de token aprobadas.

---

## 4. Veredicto Final de Calidad
**APROBADO.** El Sprint 1 cumple con el 100% de los criterios de aceptación, no presenta fallos bloqueantes de seguridad ni fugas de aislamiento, y se encuentra listo para el cierre oficial y paso al Sprint 2.
