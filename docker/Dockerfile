# syntax=docker/dockerfile:1.4
FROM node:23-alpine AS base
# Install pnpm globally to avoid repeated corepack enable calls
RUN corepack enable pnpm

FROM base AS deps
WORKDIR /app

# Copy only dependency-related files for better layer caching
COPY package.json pnpm-lock.yaml ./
# Use BuildKit cache mount for pnpm store to speed up installs
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --production=false --ignore-scripts

FROM base AS builder
ARG DOCKER_BUILD="1"
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy only necessary build files (add more as needed)
COPY package.json pnpm-lock.yaml ./
COPY next.config.ts tsconfig.json biome.json ./
COPY postcss.config.mjs ./
COPY components.json drizzle.config.ts ./
COPY src ./src
COPY messages ./messages
COPY public ./public

# Makes the next output standalone
# https://github.com/vercel/next.js/discussions/65511
ENV NEXT_STANDALONE_OUTPUT="true"

# Use BuildKit cache mount for Next.js build cache
RUN --mount=type=cache,id=nextjs,target=/app/.next/cache \
    pnpm build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# Combine user creation commands to reduce layers
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy migrations content
COPY --from=builder /app/src/lib/db/migrations ./src/lib/db/migrations

USER nextjs
EXPOSE 3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/config/next-config-js/output
CMD ["node", "server.js"]