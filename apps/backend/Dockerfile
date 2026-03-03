# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

RUN npm install -g pnpm@9

# Copy only what's needed to install deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/

# Install ALL deps (including devDeps for build)
RUN pnpm install --frozen-lockfile --filter backend

# Copy source
COPY apps/backend ./apps/backend

# Prisma generate
RUN cd apps/backend && ../node_modules/.bin/prisma generate || node_modules/.bin/prisma generate

# Build
RUN cd apps/backend && node_modules/.bin/nest build || ../node_modules/.bin/nest build

# ── Stage 2: runner ───────────────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN apt-get update && apt-get install -y \
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

# Copy package files and install production deps fresh (no pnpm workspace tricks)
COPY apps/backend/package.json ./package.json

RUN npm install --omit=dev --legacy-peer-deps

# Copy built dist and prisma
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/prisma ./prisma

# Copy generated prisma client from builder
COPY --from=builder /app/apps/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma 2>/dev/null || true

RUN mkdir -p public/uploads

EXPOSE 3001

CMD ["node", "dist/src/main"]
