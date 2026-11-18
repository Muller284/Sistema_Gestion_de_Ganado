# Base de datos

Scripts para crear la base del Sistema de Gestión de Ganado y cargarle los
datos de ejemplo sin levantar el servidor. Es lo que pide el manual técnico,
punto 7.

| Archivo | Qué hace |
| --- | --- |
| `01_esquema.sql` | Crea las 26 tablas, la vista `permisos_tipo_vigentes`, las funciones, los disparadores y los índices. |
| `02_datos_ejemplo.sql` | Carga los datos de prueba: dos ranchos, 14 usuarios de todos los roles, animales, corrales, productos, esquemas, aplicaciones y pesajes. |
| `03_script_simple.sql` | Versión resumida del modelo (rancho, corrales, animales y pesajes) en un esquema aparte, con datos y dos consultas de ejemplo. Es el script que va copiado en el manual. |

Los dos primeros se generaron con `pg_dump` desde una base creada con las
migraciones (`servidor/migraciones/`) y las semillas (`servidor/semillas/`).
Esas carpetas siguen siendo la fuente: si cambian, hay que volver a generar
estos archivos.

## Cargarlos en el PostgreSQL de Docker

Con `docker compose up -d postgres` levantado, desde la raíz del repositorio:

```bash
docker exec -i ganado_postgres psql -U ganado_usuario -d gestion_ganado < base-de-datos/01_esquema.sql
docker exec -i ganado_postgres psql -U ganado_usuario -d gestion_ganado < base-de-datos/02_datos_ejemplo.sql
```

La base tiene que estar vacía. `02_datos_ejemplo.sql` desactiva los
disparadores mientras carga (hay referencias circulares entre usuarios y
ranchos), así que hay que correrlo con el usuario dueño de la base, que en
Docker es `ganado_usuario`.

En PowerShell, `<` no funciona; se usa así:

```powershell
Get-Content base-de-datos/01_esquema.sql | docker exec -i ganado_postgres psql -U ganado_usuario -d gestion_ganado
Get-Content base-de-datos/02_datos_ejemplo.sql | docker exec -i ganado_postgres psql -U ganado_usuario -d gestion_ganado
```

## Volver a generarlos

Con la base migrada y sembrada:

```bash
pg_dump --schema-only --no-owner --no-privileges -U ganado_usuario gestion_ganado > base-de-datos/01_esquema.sql
pg_dump --data-only --no-owner --no-privileges --inserts --column-inserts --disable-triggers -U ganado_usuario gestion_ganado > base-de-datos/02_datos_ejemplo.sql
```

## Cuentas de los datos de ejemplo

La contraseña de todas es `Ganado2026`, salvo la de Rubén Quispe
(`Temporal2026`, que el sistema obliga a cambiar). La lista completa está en
el manual técnico, punto 8.
