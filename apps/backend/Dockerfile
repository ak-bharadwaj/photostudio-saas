FROM node:20-slim AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# Install system dependencies for Prisma
RUN apt-get update && apt-get install -y openssl --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Copy workspace meta-files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
# Copy backend package.json
COPY apps/backend/package.json ./apps/backend/

# Install ALL dependencies for building
RUN pnpm install --frozen-lockfile

# Copy backend source
COPY apps/backend ./apps/backend

# Generate Prisma Client (uses default node_modules location)
RUN cd apps/backend && npx prisma generate

# Build the NestJS application
RUN pnpm --filter backend build

# Use pnpm deploy to create a standalone production bundle in /deploy
# This solves the "Cannot find module" error by resolving symlinks
RUN pnpm --filter=backend --prod deploy /deploy

# Copy built artifacts into the deploy folder
RUN cp -r apps/backend/dist /deploy/dist && \
    cp -r apps/backend/prisma /deploy/prisma

# Production Stage
FROM node:20-slim AS runner
WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    openssl \
    chromium \
    fonts-liberation \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copy the isolated/standalone package from builder
COPY --from=builder /deploy /app

ENV NODE_ENV=production
RUN mkdir -p public/uploads

EXPOSE 3001

# Run the app from the standalone dist
CMD ["node", "dist/main"]
