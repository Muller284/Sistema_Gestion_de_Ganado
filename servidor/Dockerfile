# Imagen del servidor. La usa docker-compose.yml para levantar todo con un
# solo comando (tercer criterio de aceptacion de HU-01).
FROM node:24-alpine

WORKDIR /app

# Se copian primero los manifiestos para aprovechar la cache de Docker:
# mientras no cambien las dependencias, esta capa no se vuelve a construir.
COPY package.json package-lock.json ./

# npm ci instala exactamente lo que dice el archivo de bloqueo, nunca versiones
# mas nuevas. Es la regla del punto 2 de la guia de arranque.
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start:dev"]
