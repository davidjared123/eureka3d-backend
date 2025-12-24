# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Production stage
FROM node:20-alpine
WORKDIR /app

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copiar dependencias y código
COPY --from=builder /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=8000

# Usuario no-root
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8000/health',(r)=>{process.exit(r.statusCode===200?0:1)})"

EXPOSE 8000

CMD ["node", "src/index.js"]
