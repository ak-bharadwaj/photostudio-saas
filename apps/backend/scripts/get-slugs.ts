
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const studios = await prisma.studio.findMany({ take: 3 });
  console.log('Studios:', JSON.stringify(studios, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);
