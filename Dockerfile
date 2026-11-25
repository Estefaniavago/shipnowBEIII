# syntax=docker/dockerfile:1

# ---------- Etapa 1: dependencias de producción ----------
FROM node:22-alpine AS deps
WORKDIR /app

# Se copia solo el manifiesto primero: si no cambian las dependencias, Docker reutiliza esta capa.
COPY package.json package-lock.json* ./
# npm ci (reproducible) cuando hay package-lock.json; si no, npm install. Sin devDependencies.
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi \
 && npm cache clean --force

# ---------- Etapa 2: imagen final ----------
FROM node:22-alpine AS runtime

# Valores por defecto NO sensibles. MONGODB_URI y el resto se reciben al ejecutar el contenedor.
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app

# Solo lo necesario para ejecutar: dependencias + código (sin tests, README ni archivos .env).
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

# Carpetas que escribe la app (logs y uploads), con permisos para el usuario no root "node".
RUN mkdir -p /app/logs /app/uploads && chown -R node:node /app/logs /app/uploads

USER node
EXPOSE 3000

# Docker marca el contenedor como "unhealthy" si /api/health no responde 200
# (incluye el caso de base de datos desconectada, que responde 503).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Equivale al script "start" de package.json. Se usa node directamente (y no "npm start")
# para que la señal SIGTERM de "docker stop" llegue a la app y pueda cerrar ordenadamente.
CMD ["node", "src/server.js"]
