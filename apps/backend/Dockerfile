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

# Install ALL dependencies to build (including devDeps like @nestjs/cli)
RUN pnpm install

# Copy source code
COPY apps/backend ./apps/backend

# Build the app in the monorepo context
RUN pnpm --filter backend build

# Use pnpm deploy to get a self-contained production directory
# This correctly isolates production dependencies from the monorepo
RUN pnpm deploy --filter=backend --prod /deploy

# Step into the deploy directory and copy over our built artifacts and schema
# We must generate Prisma Client INSIDE /deploy to ensure it's in the correct node_modules
RUN cp -r apps/backend/dist /deploy/dist && \
    cp -r apps/backend/prisma /deploy/prisma && \
    cd /deploy && \
    npx prisma generate

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

# Copy the entire deployed isolation from the builder
COPY --from=builder /deploy /app

ENV NODE_ENV=production
# Add prisma engine to the path if needed, usually not required but safe
RUN mkdir -p public/uploads

EXPOSE 3001

# Run the app from the root of the runner stage
CMD ["node", "dist/main"]
