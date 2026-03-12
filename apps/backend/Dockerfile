FROM node:20-slim AS builder
WORKDIR /app

# Install system deps for Prisma
RUN apt-get update && apt-get install -y openssl --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Copy root lockfile and workspace config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
# Copy backend package.json
COPY apps/backend/package.json ./apps/backend/

# Install dependencies
RUN corepack enable pnpm && pnpm install --filter backend

# Copy source code
COPY apps/backend ./apps/backend

# Generate Prisma Client
RUN cd apps/backend && npx prisma generate

# Build the app
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

COPY --from=builder /app/apps/backend/package.json ./package.json
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/node_modules ./node_modules
COPY --from=builder /app/apps/backend/prisma ./prisma

# Also need the prismaclient in the node_modules
# Usually it is inside apps/backend/node_modules/.prisma

ENV NODE_ENV=production
RUN mkdir -p public/uploads

EXPOSE 3001

CMD ["node", "dist/main"]
