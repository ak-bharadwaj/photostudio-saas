// Plain JS seed using pg adapter (same as how the NestJS app connects)
// Usage: node prisma/add-nandyal.mjs

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('✅ Loaded .env');
} else {
  console.log('⚠️  No .env found, using system env');
}

console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🏢 Checking for existing studio...');

  const existing = await prisma.studio.findUnique({
    where: { slug: 'nandyal-photography' },
  });

  if (existing) {
    console.log('✅ Nandyal Photography already exists! ID:', existing.id);
    return;
  }

  console.log('➕ Creating studio...');
  const passwordHash = await bcrypt.hash('Nandyal@123', 10);

  const studio = await prisma.studio.create({
    data: {
      name: 'Nandyal Photography',
      slug: 'nandyal-photography',
      email: 'owner@nandyalphotography.in',
      phone: '9876543210',
      city: 'Nandyal',
      address: 'Main Road, Nandyal, Andhra Pradesh',
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
      },
      services: {
        create: [
          {
            name: 'Wedding Photography',
            description: 'Full-day premium coverage of your special wedding day including candid and formal portraits',
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
            description: 'Professional candid portrait sessions for individuals and families',
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
          email: 'owner@nandyalphotography.in',
          phone: '9876543210',
          passwordHash,
          role: 'OWNER',
          provider: 'local',
          isActive: true,
        },
      },
    },
    include: { services: true },
  });

  console.log('');
  console.log('🎉 SUCCESS! Nandyal Photography created!');
  console.log('   Studio ID :', studio.id);
  console.log('   Slug      : nandyal-photography');
  console.log('   Services  :', studio.services.length);
  studio.services.forEach(s => console.log(`   - ${s.name} (₹${s.price})`));
  console.log('');
  console.log('   Public URL: /studio/nandyal-photography');
  console.log('   Login     : owner@nandyalphotography.in / Nandyal@123');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message || e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
