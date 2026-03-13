FROM node:20-slim AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# Install system deps for Prisma
RUN apt-get update && apt-get install -y openssl --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Copy root lockfile and workspace config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
# Copy backend package.json
COPY apps/backend/package.json ./apps/backend/

# Install ALL dependencies to build
RUN pnpm install

# Copy source code
COPY apps/backend ./apps/backend

# IMPORTANT: Generate Prisma Client into the source folder
RUN cd apps/backend && npx prisma generate

# Build the app to dist/
RUN pnpm --filter backend build

# Production Stage
FROM node:20-slim AS runner
WORKDIR /app

# Install system deps for Prisma and Puppeteer
RUN apt-get update && apt-get install -y \
    openssl \
    chromium \
    fonts-liberation \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/node_modules ./apps/backend/node_modules

# Copy dist and generated client from builder
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/src/prisma/generated-client ./src/prisma/generated-client
COPY --from=builder /app/apps/backend/package.json ./package.json
COPY --from=builder /app/apps/backend/prisma ./prisma

ENV NODE_ENV=production
RUN mkdir -p public/uploads

EXPOSE 3001

# Run the app
CMD ["node", "dist/main"]
