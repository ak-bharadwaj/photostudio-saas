
import { PrismaClient } from '@prisma/client';

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

    const stats = await prisma.studio.groupBy({
      by: ['subscriptionTier'],
      _count: true,
    });
    console.log('Stats by tier:', stats);

  } catch (error) {
    console.error('Database connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
