# ── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:20-slim AS deps
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy workspace manifests first for better layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/

# Install all deps (including devDeps needed for build + prisma CLI)
RUN pnpm install --frozen-lockfile --filter backend

# ── Stage 2: builder ──────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

RUN npm install -g pnpm@9

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules

# Copy source
COPY apps/backend ./apps/backend
COPY package.json pnpm-workspace.yaml ./

WORKDIR /app/apps/backend

# Generate Prisma client
RUN pnpm exec prisma generate

# Build NestJS
RUN pnpm build

# ── Stage 3: runner ───────────────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

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

# Tell Puppeteer to use system Chromium, skip bundled download
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Install prisma CLI globally so migrate deploy works at startup
RUN npm install -g prisma

# Copy built artifacts
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/node_modules ./node_modules
COPY --from=builder /app/apps/backend/prisma ./prisma

# Create uploads directory (local fallback for files when Cloudinary not set)
RUN mkdir -p public/uploads

EXPOSE 3001

# Run Prisma migrations then start the app
CMD ["sh", "-c", "prisma migrate deploy --schema=./prisma/schema.prisma && node dist/main"]

