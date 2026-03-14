import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding Nandyal Photography studio...');

  // Check if already exists
  const existing = await prisma.studio.findUnique({ where: { slug: 'nandyal-photography' } });
  if (existing) {
    console.log('Studio already exists:', existing.id);
    return;
  }

  const passwordHash = await bcrypt.hash('Nandyal@123', 10);

  const studio = await prisma.studio.create({
    data: {
      name: 'Nandyal Photography',
      slug: 'nandyal-photography',
      email: 'contact@nandyalphotography.in',
      phone: '9876543210',
      city: 'Nandyal',
      address: 'Main Road, Nandyal',
      state: 'Andhra Pradesh',
      subscriptionTier: 'PRO',
      status: 'ACTIVE',
      brandingConfig: {
        primaryColor: '#0a0a0b',
        secondaryColor: '#1a1a1d',
        accentColor: '#D4AF37',
        fontFamily: 'Plus Jakarta Sans',
        themePreset: 'noir-luxury',
        headerText: 'Nandyal Photography',
        tagline: 'Capturing Timeless Moments in Nandyal',
        heroStyle: 'cinematic',
        cardTheme: 'elevated',
        buttonShape: 'luxury-sharp',
        bgType: 'dark-studio',
        layoutMode: 'full-editorial',
      } as any,
      services: {
        create: [
          {
            name: 'Wedding Photography',
            description: 'Full-day premium coverage of your special wedding day including candid moments and formal portraits',
            price: 50000,
            durationMinutes: 480,
            sortOrder: 1,
            occasion: 'Wedding',
            isActive: true,
          },
          {
            name: 'Pre-Wedding Shoot',
            description: 'Beautiful outdoor pre-wedding shoot at scenic locations around Nandyal',
            price: 15000,
            durationMinutes: 240,
            sortOrder: 2,
            occasion: 'Pre-Wedding',
            isActive: true,
          },
          {
            name: 'Birthday Party Coverage',
            description: 'Capture every joyful moment of your birthday celebration',
            price: 8000,
            durationMinutes: 180,
            sortOrder: 3,
            occasion: 'Birthday',
            isActive: true,
          },
          {
            name: 'Maternity Photoshoot',
            description: 'Cherish your pregnancy journey with a beautiful maternity session',
            price: 10000,
            durationMinutes: 120,
            sortOrder: 4,
            occasion: 'Maternity',
            isActive: true,
          },
          {
            name: 'Candid Portraits',
            description: 'Professional candid portrait sessions for individuals or families',
            price: 5000,
            durationMinutes: 90,
            sortOrder: 5,
            occasion: 'Portrait',
            isActive: true,
          },
        ],
      },
      users: {
        create: {
          name: 'Nandyal Photography Owner',
          email: 'contact@nandyalphotography.in',
          phone: '9876543210',
          passwordHash,
          role: 'OWNER',
          provider: 'local',
          isActive: true,
        },
      },
    },
  });

  console.log('✅ Created Nandyal Photography studio!');
  console.log('  ID:', studio.id);
  console.log('  Slug: nandyal-photography');
  console.log('  Login: contact@nandyalphotography.in / Nandyal@123');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
