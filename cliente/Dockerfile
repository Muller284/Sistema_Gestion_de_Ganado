# Imagen del cliente: se compila con Vite y se sirve con nginx.
#
# Se construye desde la RAIZ del repositorio (docker-compose.yml pone
# context: .), porque el cliente lee los textos de idiomas/, que está afuera
# de cliente/ (HU-25). Lo que no hace falta mandar está en
# cliente/Dockerfile.dockerignore.

# --- 1. Compilar ---------------------------------------------------------------
FROM node:24-alpine AS compilacion

WORKDIR /app/cliente

# Primero los manifiestos, para aprovechar la caché mientras no cambien las
# dependencias. npm ci instala exactamente lo del archivo de bloqueo.
COPY cliente/package.json cliente/package-lock.json ./
RUN npm ci

COPY idiomas /app/idiomas
COPY cliente/ ./

# A dónde llama el navegador. Lo fija docker-compose.yml; queda escrito en el
# código compilado, así que cambiarlo exige volver a construir la imagen.
ARG VITE_API=http://localhost:3000
ENV VITE_API=$VITE_API

RUN npm run build

# --- 2. Servir -----------------------------------------------------------------
FROM nginx:1.27-alpine

COPY cliente/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=compilacion /app/cliente/dist /usr/share/nginx/html

EXPOSE 80
