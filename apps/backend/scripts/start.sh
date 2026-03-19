#!/bin/sh
set -e

echo "Starting Deployment Migration..."
# Run Prisma migrations in production
npx prisma db push --accept-data-loss

echo "Starting Application..."
# Start the NestJS application
node dist/main
