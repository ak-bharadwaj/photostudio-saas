
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const users = await prisma.user.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
  });
  console.log('Recent Users:');
  console.log(JSON.stringify(users, null, 2));

  const admins = await prisma.admin.findMany();
  console.log('Admins:');
  console.log(JSON.stringify(admins, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
