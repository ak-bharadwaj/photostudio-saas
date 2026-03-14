
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('Connected!');

    const adminCount = await prisma.admin.count();
    console.log('Admin count:', adminCount);

    const studioCount = await prisma.studio.count();
    console.log('Studio count:', studioCount);

    const analytics = await Promise.allSettled([
      prisma.studio.count(),
      prisma.studio.count({ where: { status: "ACTIVE" } }),
      prisma.booking.count(),
      prisma.payment.aggregate({ _sum: { amount: true } }),
      prisma.commission.aggregate({ _sum: { amount: true } }),
      prisma.studio.groupBy({ by: ["subscriptionTier"], _count: true }),
    ]);

    console.log('Analytics Results:');
    analytics.forEach((res, i) => {
      if (res.status === 'fulfilled') {
        console.log(`Query ${i} succeeded:`, JSON.stringify(res.value));
      } else {
        console.error(`Query ${i} FAILED:`, res.reason.message || res.reason);
      }
    });

  } catch (error) {
    console.error('CRITICAL ERROR:', error.message || error);
    if (error.code) console.log('Error code:', error.code);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
