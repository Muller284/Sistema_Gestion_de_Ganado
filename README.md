# Sistema de Gestión de Ganado

Plataforma web y móvil para que productores, veterinarios y peones de campo
registren animales, corrales, sanidad, vacunación y pesajes.

## Requisitos previos

- Node.js 24 LTS — verificar con `node -v`
- Docker Desktop — verificar con `docker --version`
- Git — verificar con `git --version`

No hace falta instalar PostgreSQL a mano: viene dentro de Docker.

## Instalación

1. Clonar el repositorio:
   ```bash
   git clone <url-del-repositorio>
   cd gestion-ganado
   ```

2. Copiar el archivo de variables de entorno y completar los valores:
   ```bash
   cp .env.ejemplo .env
   ```

3. Instalar dependencias (usar siempre `npm ci`, nunca `npm install`):
   ```bash
   cd servidor && npm ci && cd ..
   cd cliente && npm ci && cd ..
   ```

## Ejecución

Levantar todo el sistema (base de datos + servidor) con un solo comando:

```bash
docker compose up
```

Levantar el cliente en modo desarrollo, en otra terminal:

```bash
cd cliente
npm run dev
```

## Migraciones de base de datos

```bash
cd servidor
npm run migrar
```

Cargar los datos de prueba (dos ranchos y usuarios de los cuatro roles):

```bash
cd servidor
npm run sembrar
```

## Pruebas

Las del servidor hablan con la base real y con el servidor levantado. Con la
base migrada y sembrada, en una terminal:

```bash
cd servidor
CORREO_TRANSPORTE=consola npm run start:dev
```

y en otra:

```bash
cd servidor
npm test                    # todas: aislamiento, registro, cuenta, bloqueo,
                            # sesion, equipo, guia, perfil y tipos
npm run probar:tipos        # o una sola (probar:equipo, probar:guia, ...)
```

`CORREO_TRANSPORTE=consola` hace que los correos de las pruebas salgan por la
consola: con `brevo` se mandarían de verdad y gastarían el cupo diario.

Las del cliente:

```bash
cd cliente
npm run lint && npm test && npm run build
```

## Estructura del repositorio

```
gestion-ganado/
├── docker-compose.yml       levanta base de datos y servicios
├── README.md                 este archivo
├── DECISIONES.md              registro de decisiones técnicas
├── servidor/
│   ├── src/
│   │   ├── modulos/           un directorio por módulo del sistema
│   │   ├── comun/             filtro por rancho, permisos, utilidades
│   │   └── configuracion/
│   ├── migraciones/           migraciones de base de datos, numeradas
│   ├── semillas/               datos de prueba
│   └── pruebas/
├── cliente/
│   └── src/
│       ├── paginas/           una carpeta por pantalla
│       ├── componentes/       componentes reutilizables
│       ├── estilos/            estilos.css y tokens del sistema de diseño
│       └── servicios/          llamadas al servidor
└── documentos/                 propuesta, backlog y demás
```

## Convenciones

Ver `DECISIONES.md` y la guía de arranque técnico del equipo para las
convenciones de base de datos, código y trabajo con Git (ramas, mensajes
de commit, flujo de integración).