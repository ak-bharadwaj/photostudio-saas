
require('dotenv').config({ path: 'apps/backend/.env' });
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const studios = await prisma.studio.findMany({ 
        select: { id: true, name: true, slug: true },
        take: 10 
    });
    console.log('STUDIOS_DATA:' + JSON.stringify(studios));
  } catch (err) {
    console.error('ERROR:' + err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
