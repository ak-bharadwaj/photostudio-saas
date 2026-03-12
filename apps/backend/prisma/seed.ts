import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data in development
  if (process.env.NODE_ENV !== 'production') {
    console.log('🧹 Cleaning existing data...');
    await prisma.bookingStatusLog.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.portfolioItem.deleteMany();
    await prisma.service.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.user.deleteMany();
    await prisma.workflow.deleteMany();
    await prisma.studio.deleteMany();
    await prisma.admin.deleteMany();
  }

  // Create Admin User
  console.log('👤 Creating admin user...');
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.admin.create({
    data: {
      email: 'admin@reviewsfeedback.com',
      passwordHash: adminPassword,
      name: 'Platform Admin',
    },
  });
  console.log(`✅ Admin created: ${admin.email}`);

  // Create Categories
  console.log('📂 Creating categories...');
  const categoryData = [
    { name: 'Portraits', slug: 'portraits', imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330' },
    { name: 'Commercial', slug: 'commercial', imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30' },
    { name: 'Weddings', slug: 'weddings', imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552' },
    { name: 'Fashion', slug: 'fashion', imageUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4' },
    { name: 'Events', slug: 'events', imageUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622' },
  ];

  const categories = await Promise.all(
    categoryData.map(data => 
      prisma.category.upsert({
        where: { slug: data.slug },
        update: data,
        create: data,
      })
    )
  );
  console.log('✅ Created/Updated ${categories.length} categories');

  console.log('\n🎉 Database seed completed successfully!');
  console.log('\n📝 Admin Credentials:');
  console.log('   Email: admin@reviewsfeedback.com');
  console.log('   Password: Admin@123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
