# client/Dockerfile.simple
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

# Copier le reste du code
COPY . .

# Exposer le port
EXPOSE 3000

# Démarrer
CMD ["npm", "run", "dev"]