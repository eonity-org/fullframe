# Full Frame — production image (roadmap E5.1).
# Multi-stage: deps (native better-sqlite3 build) → build → slim runner.

FROM node:22-slim AS deps
WORKDIR /app
# better-sqlite3 compiles a native addon → needs a toolchain.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:22-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Initialize the build database before Next's parallel page-data workers
# import it, so they cannot race to apply the initial migrations.
RUN npm run db:migrate && npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3020
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m nextjs

# Standalone server + static assets + the generated SQL migrations, applied
# when db/index.ts first opens the database.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/drizzle ./drizzle

# The exhibition DB lives on a mounted volume.
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data
VOLUME /app/data

USER nextjs
EXPOSE 3020
CMD ["node", "server.js"]
