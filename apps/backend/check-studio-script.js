require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const services = await prisma.service.findMany({
      where: { id: { in: ['d7001a26-e939-4eb9-a982-4ffb22992f5e', '53477cfd-ae70-4b1d-910a-f7ec6c6d812a'] } }
    });
    
    const candidates = await prisma.booking.findMany({
        where: { studioId: services[0]?.studioId }
    });
    console.log('BookingsCount:' + candidates.length);
    if (candidates.length > 0) {
        console.log('First candidate scheduledAt:' + candidates[0].scheduledAt);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
main();
