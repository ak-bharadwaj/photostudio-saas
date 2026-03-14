import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const serviceImages = {
  'Wedding Photography': 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=1200',
  'Pre-Wedding Shoot': 'https://images.unsplash.com/photo-1583939003579-730e62b50f0c?auto=format&fit=crop&q=80&w=1200',
  'Birthday Party Coverage': 'https://images.unsplash.com/photo-1530103862676-de88b6df8c42?auto=format&fit=crop&q=80&w=1200',
  'Maternity Photoshoot': 'https://images.unsplash.com/photo-1517438476312-10d79c077509?auto=format&fit=crop&q=80&w=1200',
  'Candid Portraits': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=1200'
};

async function main() {
  const nandyal = await prisma.studio.findUnique({
    where: { slug: 'nandyal-photography' },
    include: { services: true }
  });

  if (!nandyal) return console.log('not found');

  for (const svc of nandyal.services) {
    const newImage = serviceImages[svc.name];
    if (newImage) {
      await prisma.service.update({
        where: { id: svc.id },
        data: { coverImage: newImage }
      });
      console.log('Updated ' + svc.name);
    }
  }

  // Also fix the logo AND we'll add some generic onError in page.tsx as well!
  await prisma.studio.update({
    where: { slug: 'nandyal-photography' },
    data: { logoUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=100&q=80' }
  });
  console.log('Done!');
}

main().finally(() => { prisma.$disconnect(); pool.end(); });
