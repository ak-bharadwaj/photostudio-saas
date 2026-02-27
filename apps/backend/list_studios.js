const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const studios = await prisma.studio.findMany({
            select: { slug: true, name: true, status: true }
        });
        console.log('STUDIOS_LIST_START');
        console.log(JSON.stringify(studios));
        console.log('STUDIOS_LIST_END');
    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
