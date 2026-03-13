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

# IMPORTANT: Generate Prisma Client into the local folder BEFORE building
RUN cd apps/backend && npx prisma generate

# Build the app – will now use the generated files from the local directory
RUN pnpm --filter backend build

# Use pnpm deploy to get a self-contained production directory
RUN pnpm deploy --filter=backend --prod /deploy

# Copy built artifacts and the generated client into the deployment isolation
RUN cp -r apps/backend/dist /deploy/dist && \
    cp -r apps/backend/prisma /deploy/prisma && \
    cd /deploy && \
    npx prisma generate

# Final check to ensure the generated folder exists in the isolated deploy
RUN ls -la /deploy/prisma/generated-client

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

# Copy the entire isolated deployment
COPY --from=builder /deploy /app

ENV NODE_ENV=production
RUN mkdir -p public/uploads

EXPOSE 3001

# Run the app
CMD ["node", "dist/main"]
