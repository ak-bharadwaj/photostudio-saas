# ── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:20-slim AS deps
WORKDIR /app

RUN npm install -g pnpm@9

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/

RUN pnpm install --frozen-lockfile --filter backend

# ── Stage 2: builder ──────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

RUN npm install -g pnpm@9

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules

COPY apps/backend ./apps/backend
COPY package.json pnpm-workspace.yaml ./

# Prisma generate + build from within the backend package
RUN cd apps/backend && node_modules/.bin/prisma generate && node_modules/.bin/nest build

# ── Stage 3: runner ───────────────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Install Chromium for Puppeteer (PDF generation)
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

# Copy everything into a flat structure at /app
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/node_modules ./node_modules
COPY --from=builder /app/apps/backend/prisma ./prisma

RUN mkdir -p public/uploads

EXPOSE 3001

CMD ["node", "dist/src/main"]
