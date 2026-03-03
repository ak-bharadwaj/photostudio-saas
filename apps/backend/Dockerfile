FROM node:20-slim
WORKDIR /app

# Install system deps: openssl for Prisma, chromium for Puppeteer
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

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copy package.json and install ALL deps including devDeps (needed for prisma + nest build)
# NOTE: do NOT set NODE_ENV=production before this or npm will skip devDependencies
COPY apps/backend/package.json ./package.json
RUN npm install --include=dev --legacy-peer-deps

# Copy source and prisma schema
COPY apps/backend/prisma ./prisma
COPY apps/backend/src ./src
COPY apps/backend/tsconfig.json ./tsconfig.json
COPY apps/backend/tsconfig.build.json ./tsconfig.build.json

# Generate Prisma client
RUN node_modules/.bin/prisma generate

# Build NestJS
RUN node_modules/.bin/nest build

# Now set production and prune dev deps
ENV NODE_ENV=production
RUN npm prune --omit=dev

RUN mkdir -p public/uploads

EXPOSE 3001

CMD ["node", "dist/src/main"]
