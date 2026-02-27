import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    const studios = await prisma.studio.findMany({
        select: {
            id: true,
            name: true,
            slug: true,
            status: true,
        }
    });
    console.log(JSON.stringify(studios, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
