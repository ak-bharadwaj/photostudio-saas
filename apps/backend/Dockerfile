# --- Builder Stage ---
FROM node:20-slim AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Install system dependencies for node-gyp and Prisma
RUN apt-get update && apt-get install -y openssl python3 make g++ --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Copy lockfile and workspace config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
# Copy backend package.json
COPY apps/backend/package.json ./apps/backend/

# Install dependencies (all)
RUN pnpm install --frozen-lockfile

# Copy backend source code
COPY apps/backend ./apps/backend

# Comment out the database URL to bypass Prisma validation during build
RUN sed -i 's/url.*=.*env("DATABASE_URL")/\/\/ url = env("DATABASE_URL")/' apps/backend/prisma/schema.prisma

# Generate Prisma Client and Build
RUN cd apps/backend && npx prisma generate
RUN pnpm --filter backend build

# --- Runner Stage ---
FROM node:20-slim AS runner
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Install runtime dependencies for Prisma and Puppeteer
RUN apt-get update && apt-get install -y \
    openssl \
    chromium \
    fonts-liberation \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# IMPORTANT: To avoid pnpm symlink issues in Docker monorepos on Render:
# 1. Copy the lockfile and the backend package.json
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json ./apps/backend/

# 2. Install only production dependencies
# This creates a reliable node_modules structure in the runner
RUN pnpm install --prod --frozen-lockfile

# 3. Copy built files, prisma schema and scripts
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma
COPY apps/backend/scripts ./apps/backend/scripts

# 4. Restore the database URL for production and generate client
RUN sed -i 's/\/\/ url.*=.*env("DATABASE_URL")/url = env("DATABASE_URL")/' apps/backend/prisma/schema.prisma
RUN cd apps/backend && npx prisma generate

ENV NODE_ENV=production
RUN mkdir -p apps/backend/public/uploads
RUN chmod +x apps/backend/scripts/start.sh

WORKDIR /app/apps/backend
EXPOSE 3001

# Run the app with migrations
CMD ["sh", "scripts/start.sh"]
