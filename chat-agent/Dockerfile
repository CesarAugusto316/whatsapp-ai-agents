FROM oven/bun:alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

FROM base AS builder
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 bunjs && \
  adduser --system --uid 1001 hono

# Copiar dependencias de producción
COPY --from=deps --chown=hono:bunjs /app/node_modules ./node_modules

# Copiar código construido
COPY --from=builder --chown=hono:bunjs /app/dist ./dist
COPY --from=builder --chown=hono:bunjs /app/package.json ./package.json

USER hono
EXPOSE 3000

# Usar directamente el archivo compilado
CMD ["bun", "/app/dist/index.js"]
