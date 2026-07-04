FROM node:24.18.0-bookworm-slim AS base

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies only when needed
FROM base AS deps

RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

# Install dependencies based on the preferred package manager
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm i --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder

RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NODE_ENV=production
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_FORMS_URL_PUBLISH
ARG NEXT_PUBLIC_FORMS_URL_SUBMIT
ARG NEXT_PUBLIC_BLOBSERVICECLIENT_URL
ARG NEXT_PUBLIC_CONTAINER_NAME=uploads
ARG NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT_NAME
ARG NEXT_PUBLIC_FOOTER_COPYRIGHT
ARG NEXT_PUBLIC_FOOTER_DESCRIPTION
ARG NEXT_PUBLIC_DEPARTMENT_NAME
ARG NEXT_PUBLIC_DEPARTMENT_LONG_NAME
ARG NEXT_PUBLIC_FAQ_URL_STUDENT
ARG NEXT_PUBLIC_FAQ_URL_SUPERVISOR
ARG NEXT_PUBLIC_APP_VERSION
ARG ENABLE_DF_WEBSTATS

ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm run build

# If using npm comment out above and use below instead
# RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner

ARG NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000

CMD ["node", "server.js"]

FROM base AS migration-runner

ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=deps /app/node_modules ./node_modules
COPY prisma.config.ts ./prisma.config.ts
COPY prisma ./prisma

USER nextjs

CMD ["/app/node_modules/.bin/prisma", "migrate", "deploy"]

FROM runner AS app
