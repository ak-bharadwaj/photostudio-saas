// Use require to avoid ESM issues in the Docker runner
require("dotenv").config();

/** @type {import('prisma/config').Config} */
module.exports = {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx ts-node prisma/seed.ts",
  },
  datasource: {
    // DATABASE_URL is required at runtime for the Prisma client
    url: process.env.DATABASE_URL || "postgresql://dummy:dummy@localhost:5432/dummy",
  },
};
