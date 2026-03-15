require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('Connecting to database...');
    // Find duplicate customers based on studioId and email
    const duplicateCustomers = await prisma.$queryRaw`
      SELECT studio_id, email, COUNT(*) as count
      FROM customers
      WHERE email IS NOT NULL AND email != ''
      GROUP BY studio_id, email
      HAVING COUNT(*) > 1
    `;
    
    console.log(`Found ${duplicateCustomers.length} duplicate customer email pairs.`);

    for (const dup of duplicateCustomers) {
      const customers = await prisma.customer.findMany({
        where: { studioId: dup.studio_id, email: dup.email },
        orderBy: { createdAt: 'asc' },
      });
      
      const [keep, ...toDelete] = customers;
      console.log(`Keeping customer ${keep.id}, deleting ${toDelete.length} others for email ${dup.email}`);
      
      for (const t of toDelete) {
        await prisma.customer.delete({ where: { id: t.id }});
      }
    }
    
    // Find duplicate customers based on studioId and phone
    const duplicatePhones = await prisma.$queryRaw`
      SELECT studio_id, phone, COUNT(*) as count
      FROM customers
      WHERE phone IS NOT NULL AND phone != ''
      GROUP BY studio_id, phone
      HAVING COUNT(*) > 1
    `;
    
    console.log(`Found ${duplicatePhones.length} duplicate customer phone pairs.`);

    for (const dup of duplicatePhones) {
      const customers = await prisma.customer.findMany({
        where: { studioId: dup.studio_id, phone: dup.phone },
        orderBy: { createdAt: 'asc' },
      });
      
      const [keep, ...toDelete] = customers;
      if (keep) {
        console.log(`Keeping customer ${keep.id}, deleting ${toDelete.length} others for phone ${dup.phone}`);
        for (const t of toDelete) {
          try {
             await prisma.customer.delete({ where: { id: t.id }});
          } catch(e) {
             console.error('Could not delete', t.id, e.message);
          }
        }
      }
    }
    
    console.log('Cleanup complete!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
