import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const categories = [
        { name: 'Wedding', slug: 'wedding' },
        { name: 'Portrait', slug: 'portrait' },
        { name: 'Editorial', slug: 'editorial' },
        { name: 'Event', slug: 'event' },
        { name: 'Product', slug: 'product' },
        { name: 'Fashion', slug: 'fashion' },
        { name: 'Maternity', slug: 'maternity' },
        { name: 'Newborn', slug: 'newborn' },
    ];

    console.log('Seeding categories...');

    for (const cat of categories) {
        await prisma.category.upsert({
            where: { slug: cat.slug },
            update: {},
            create: {
                name: cat.name,
                slug: cat.slug,
                isActive: true,
            },
        });
    }

    console.log('Categories seeded successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
