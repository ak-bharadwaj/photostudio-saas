# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@9

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/

RUN pnpm install --frozen-lockfile --filter backend

COPY apps/backend ./apps/backend

RUN cd apps/backend && node_modules/.bin/prisma generate || ../node_modules/.bin/prisma generate

RUN cd apps/backend && node_modules/.bin/nest build || ../node_modules/.bin/nest build

# ── Stage 2: runner ───────────────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN apt-get update && apt-get install -y \
    openssl \
    chromium \
    fonts-liberation \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Fresh npm install of all deps (prisma generate needs prisma cli)
COPY apps/backend/package.json ./package.json
RUN npm install --include=dev --legacy-peer-deps

# Copy built dist and prisma schema
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/prisma ./prisma

# Generate prisma client in runner
RUN node_modules/.bin/prisma generate --schema=prisma/schema.prisma

# Remove dev deps after prisma generate
RUN npm prune --omit=dev

RUN mkdir -p public/uploads

EXPOSE 3001

CMD ["node", "dist/src/main"]
