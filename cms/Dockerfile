# syntax=docker/dockerfile:1.4
FROM oven/bun:1-alpine AS base
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json bun.lock* ./
RUN --mount=type=cache,id=bun,target=/root/.bun \
  bun install --frozen-lockfile

FROM deps AS builder
COPY . .
RUN bun run build && \
  cp -r public .next/standalone/ && \
  cp -r .next/static .next/standalone/.next/

FROM base
RUN addgroup -S nodejs && adduser -S nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
USER nextjs
EXPOSE 3000
CMD ["bun", "server.js"] # Start the server in standalone mode
