# syntax=docker/dockerfile:1.7
# Wriksh-ops bot + cron container.
#
# Runs two processes side by side:
#   1. `next start` on PORT (the admin UI)
#   2. `tsx scripts/wrikshbot.ts` (bot gateway + in-process node-cron)
#
# For a UI-only deployment, run only `next start` by overriding CMD.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx next build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Non-root user for security.
RUN useradd -m -u 1001 wriksh
COPY --from=build --chown=wriksh:wriksh /app/node_modules ./node_modules
COPY --from=build --chown=wriksh:wriksh /app/.next ./.next
COPY --from=build --chown=wriksh:wriksh /app/public ./public
COPY --from=build --chown=wriksh:wriksh /app/package.json ./package.json
COPY --from=build --chown=wriksh:wriksh /app/scripts ./scripts
COPY --from=build --chown=wriksh:wriksh /app/app ./app
COPY --from=build --chown=wriksh:wriksh /app/components ./components
COPY --from=build --chown=wriksh:wriksh /app/lib ./lib
COPY --from=build --chown=wriksh:wriksh /app/tsconfig.json ./tsconfig.json
COPY --from=build --chown=wriksh:wriksh /app/next.config.mjs ./next.config.mjs
COPY --from=build --chown=wriksh:wriksh /app/scripts/tsconfig.json ./scripts/tsconfig.json
COPY --from=build --chown=wriksh:wriksh /app/scripts/_shims ./scripts/_shims

USER wriksh
EXPOSE 3000

# Run both: the Next.js UI (admin) AND the wrikshbot gateway + cron.
# Override CMD to ["npx", "next", "start"] for UI-only deployments.
CMD ["sh", "-c", "npx next start -p $PORT & exec npx tsx --tsconfig scripts/tsconfig.json scripts/wrikshbot.ts"]
