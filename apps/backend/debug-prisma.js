
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Connecting...');
        await prisma.$connect();
        console.log('Connected!');
        const users = await prisma.user.findMany({ take: 1 });
        console.log('Users:', users);
    } catch (e) {
        console.error('ERROR OBJECT:', e);
        console.error('ERROR MESSAGE:', e.message);
        console.error('ERROR STACK:', e.stack);
    } finally {
        await prisma.$disconnect();
    }
}

main();
