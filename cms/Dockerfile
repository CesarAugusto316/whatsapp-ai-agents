# syntax=docker/dockerfile:1.4
FROM oven/bun:1-alpine AS base
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# deps
FROM base AS deps
COPY package.json bun.lock ./
RUN --mount=type=cache,id=bun,target=/root/.bun \
  bun install --frozen-lockfile

# build (env variables are passed at runtime)
FROM deps AS builder
COPY . .
RUN bun run build

# runner
FROM base
RUN addgroup -S nodejs && adduser -S nextjs
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./
USER nextjs
EXPOSE 3000
CMD ["bun", "run", "start"]
