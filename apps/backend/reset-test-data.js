require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('Connecting to database...');
    
    // 1. Delete transactional data
    console.log('Deleting booking status logs...');
    await prisma.bookingStatusLog.deleteMany({});
    
    console.log('Deleting payments...');
    await prisma.payment.deleteMany({});
    
    console.log('Deleting commissions...');
    await prisma.commission.deleteMany({});
    
    console.log('Deleting reviews...');
    await prisma.review.deleteMany({});
    
    console.log('Deleting invoices...');
    await prisma.invoice.deleteMany({});
    
    console.log('Deleting bookings...');
    await prisma.booking.deleteMany({});
    
    console.log('Transactional data successfully deleted.');
    
    // 2. Adjust pricing to lower amounts (between 500 and 3000)
    console.log('Updating service prices...');
    
    const services = await prisma.service.findMany();
    for (let i = 0; i < services.length; i++) {
        const service = services[i];
        
        // Randomize price slightly, e.g., 500, 1000, 1500, 2000, 2500
        const newPrice = 500 + ((i % 5) * 500);
        
        await prisma.service.update({
            where: { id: service.id },
            data: { price: newPrice }
        });
    }
    console.log(`Updated pricing for ${services.length} services to normal lower limits.`);
    
    console.log('Cleanup and update complete!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
