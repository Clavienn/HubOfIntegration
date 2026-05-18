# client/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Installer les dépendances nécessaires
RUN apk add --no-cache curl

# Copier les fichiers de dépendances
COPY package*.json ./
COPY next.config.js ./
COPY tsconfig.json ./

# Installer les dépendances
RUN npm install

# Copier le code source
COPY . .

# Exposer le port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# Démarrer l'application en mode développement
CMD ["npm", "run", "dev"]