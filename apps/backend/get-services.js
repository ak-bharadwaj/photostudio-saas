const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const studio = await prisma.studio.findFirst({
      where: { slug: 'nandyal-photography' },
      include: { services: { where: { isActive: true } } }
    });
    if (studio) {
      console.log('SERVICES_START');
      console.log(JSON.stringify(studio.services));
      console.log('SERVICES_END');
    } else {
      console.log('Studio not found');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
