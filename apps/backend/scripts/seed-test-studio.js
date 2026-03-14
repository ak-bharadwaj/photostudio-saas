const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_7fJYpZCt1DuE@ep-soft-frost-ak4fp1ti-pooler.c-3.us-west-2.aws.neon.tech/neondb?sslmode=require"
    }
  }
});

async function main() {
  try {
    const studio = await prisma.studio.upsert({
      where: { slug: 'test-studio' },
      update: {},
      create: {
        name: 'Test Luxury Studio',
        slug: 'test-studio',
        email: 'test@example.com',
        phone: '+919876543210',
        city: 'Kurnool',
        state: 'Andhra Pradesh',
        status: 'ACTIVE',
        brandingConfig: {
          themePreset: 'noir-luxury',
          primaryColor: '#000000',
          accentColor: '#D4AF37',
          headerText: 'Test Luxury Studio',
          tagline: 'Excellence in Photography'
        }
      }
    });
    console.log('STUDIO_CREATED:' + JSON.stringify(studio));
  } catch (err) {
    console.error('ERROR:' + err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
