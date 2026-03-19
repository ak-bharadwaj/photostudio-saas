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
    console.log('Finding duplicate customers...');
    
    // Find customers with same studioId and email
    const duplicates = await prisma.$queryRaw`
      SELECT studio_id, email, COUNT(*) 
      FROM customers 
      WHERE email IS NOT NULL
      GROUP BY studio_id, email 
      HAVING COUNT(*) > 1
    `;
    
    console.log('Duplicates by Email:', duplicates);
    
    for (const dup of duplicates) {
      const studioId = dup.studio_id;
      const email = dup.email;
      
      const records = await prisma.customer.findMany({
        where: { studioId, email },
        orderBy: { updatedAt: 'desc' }
      });
      
      // Keep the most recent one, delete others
      const toKeep = records[0];
      const toDelete = records.slice(1);
      
      for (const rec of toDelete) {
        console.log(`Deleting duplicate customer ${rec.id} (Studio: ${studioId}, Email: ${email})`);
        await prisma.booking.updateMany({ where: { customerId: rec.id }, data: { customerId: toKeep.id } });
        await prisma.customer.delete({ where: { id: rec.id } });
      }
    }

    // Find customers with same studioId and phone
    const phoneDuplicates = await prisma.$queryRaw`
      SELECT studio_id, phone, COUNT(*) 
      FROM customers 
      GROUP BY studio_id, phone 
      HAVING COUNT(*) > 1
    `;
    
    console.log('Duplicates by Phone:', phoneDuplicates);
    
    for (const dup of phoneDuplicates) {
      const studioId = dup.studio_id;
      const phone = dup.phone;
      
      const records = await prisma.customer.findMany({
        where: { studioId, phone },
        orderBy: { updatedAt: 'desc' }
      });
      
      const toKeep = records[0];
      const toDelete = records.slice(1);
      
      for (const rec of toDelete) {
        console.log(`Deleting duplicate customer ${rec.id} (Studio: ${studioId}, Phone: ${phone})`);
        await prisma.booking.updateMany({ where: { customerId: rec.id }, data: { customerId: toKeep.id } });
        await prisma.customer.delete({ where: { id: rec.id } });
      }
    }

    console.log('Duplicates fixed!');
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
