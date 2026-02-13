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
      email: 'admin@photostudio.com',
      passwordHash: adminPassword,
      name: 'Platform Admin',
    },
  });
  console.log(`✅ Admin created: ${admin.email}`);

  // Create Demo Studios
  console.log('🏢 Creating demo studios...');

  // Studio 1: Professional Photography Studio
  const studio1Password = await bcrypt.hash('Demo@123', 10);
  const studio1 = await prisma.studio.create({
    data: {
      name: 'Lens & Light Photography',
      slug: 'lens-and-light',
      email: 'contact@lensandlight.com',
      phone: '+1-555-0101',
      subscriptionTier: 'PROFESSIONAL',
      subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      status: 'ACTIVE',
      brandingConfig: {
        primaryColor: '#3498db',
        secondaryColor: '#2c3e50',
        logoPosition: 'center',
      },
    },
  });

  const studio1Owner = await prisma.user.create({
    data: {
      studioId: studio1.id,
      email: 'owner@lensandlight.com',
      passwordHash: studio1Password,
      name: 'Sarah Johnson',
      role: 'OWNER',
      isActive: true,
    },
  });

  const studio1Photographer = await prisma.user.create({
    data: {
      studioId: studio1.id,
      email: 'photographer@lensandlight.com',
      passwordHash: studio1Password,
      name: 'Mike Peterson',
      role: 'PHOTOGRAPHER',
      isActive: true,
    },
  });

  console.log(`✅ Studio created: ${studio1.name}`);

  // Studio 2: Wedding Specialist
  const studio2 = await prisma.studio.create({
    data: {
      name: 'Forever Moments Weddings',
      slug: 'forever-moments',
      email: 'hello@forevermoments.com',
      phone: '+1-555-0202',
      subscriptionTier: 'STUDIO',
      subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
    },
  });

  await prisma.user.create({
    data: {
      studioId: studio2.id,
      email: 'owner@forevermoments.com',
      passwordHash: studio1Password,
      name: 'Emily Chen',
      role: 'OWNER',
      isActive: true,
    },
  });

  console.log(`✅ Studio created: ${studio2.name}`);

  // Studio 3: Trial Studio
  const studio3 = await prisma.studio.create({
    data: {
      name: 'Startup Photo Studio',
      slug: 'startup-photo',
      email: 'info@startupphoto.com',
      phone: '+1-555-0303',
      subscriptionTier: 'STARTER',
      subscriptionExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
      status: 'TRIAL',
    },
  });

  await prisma.user.create({
    data: {
      studioId: studio3.id,
      email: 'owner@startupphoto.com',
      passwordHash: studio1Password,
      name: 'Alex Martinez',
      role: 'OWNER',
      isActive: true,
    },
  });

  console.log(`✅ Studio created: ${studio3.name}`);

  // Create Services for Studio 1
  console.log('📋 Creating services...');
  const services = await Promise.all([
    prisma.service.create({
      data: {
        studioId: studio1.id,
        name: 'Portrait Session',
        description: 'Professional portrait photography session. Includes 1 hour of shooting and 10 edited photos.',
        price: 299,
        durationMinutes: 60,
        isActive: true,
        sortOrder: 1,
      },
    }),
    prisma.service.create({
      data: {
        studioId: studio1.id,
        name: 'Family Package',
        description: 'Complete family photography package. 2 hours, multiple locations, 25 edited photos.',
        price: 599,
        durationMinutes: 120,
        isActive: true,
        sortOrder: 2,
      },
    }),
    prisma.service.create({
      data: {
        studioId: studio1.id,
        name: 'Wedding Photography',
        description: 'Full day wedding coverage. Two photographers, unlimited edited photos, online gallery.',
        price: 2999,
        durationMinutes: 480,
        isActive: true,
        sortOrder: 3,
      },
    }),
    prisma.service.create({
      data: {
        studioId: studio1.id,
        name: 'Corporate Headshots',
        description: 'Professional business headshots. Quick session, 3 edited photos per person.',
        price: 149,
        durationMinutes: 30,
        isActive: true,
        sortOrder: 4,
      },
    }),
    prisma.service.create({
      data: {
        studioId: studio1.id,
        name: 'Product Photography',
        description: 'Commercial product photography. Studio lighting, white background, 15 photos.',
        price: 399,
        durationMinutes: 90,
        isActive: false, // Inactive service
        sortOrder: 5,
      },
    }),
  ]);

  // Services for Studio 2 (Wedding focused)
  await Promise.all([
    prisma.service.create({
      data: {
        studioId: studio2.id,
        name: 'Essential Wedding Package',
        description: '6 hours coverage, 1 photographer, 300+ photos',
        price: 1999,
        durationMinutes: 360,
        isActive: true,
        sortOrder: 1,
      },
    }),
    prisma.service.create({
      data: {
        studioId: studio2.id,
        name: 'Premium Wedding Package',
        description: '10 hours coverage, 2 photographers, 500+ photos, engagement session',
        price: 3999,
        durationMinutes: 600,
        isActive: true,
        sortOrder: 2,
      },
    }),
    prisma.service.create({
      data: {
        studioId: studio2.id,
        name: 'Engagement Session',
        description: '1 hour couples photography session',
        price: 399,
        durationMinutes: 60,
        isActive: true,
        sortOrder: 3,
      },
    }),
  ]);

  console.log(`✅ Created ${services.length} services for Studio 1`);

  // Create Customers for Studio 1
  console.log('👥 Creating customers...');
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        studioId: studio1.id,
        name: 'John Smith',
        email: 'john.smith@example.com',
        phone: '+1-555-1001',
        metadata: { source: 'website', referredBy: 'Google' },
      },
    }),
    prisma.customer.create({
      data: {
        studioId: studio1.id,
        name: 'Emma Wilson',
        email: 'emma.w@example.com',
        phone: '+1-555-1002',
      },
    }),
    prisma.customer.create({
      data: {
        studioId: studio1.id,
        name: 'Michael Brown',
        email: 'michael.brown@example.com',
        phone: '+1-555-1003',
      },
    }),
    prisma.customer.create({
      data: {
        studioId: studio1.id,
        name: 'Lisa Davis',
        email: 'lisa.davis@example.com',
        phone: '+1-555-1004',
      },
    }),
    prisma.customer.create({
      data: {
        studioId: studio1.id,
        name: 'David Garcia',
        phone: '+1-555-1005',
      },
    }),
  ]);

  console.log(`✅ Created ${customers.length} customers`);

  // Create Bookings
  console.log('📅 Creating bookings...');

  const now = new Date();
  const bookings = [];

  // Past completed booking
  const booking1 = await prisma.booking.create({
    data: {
      studioId: studio1.id,
      customerId: customers[0].id,
      serviceId: services[0].id, // Portrait Session
      assignedToUserId: studio1Photographer.id,
      scheduledAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      status: 'COMPLETED',
      customerNotes: 'Looking for professional LinkedIn photo',
    },
  });

  await prisma.bookingStatusLog.createMany({
    data: [
      { bookingId: booking1.id, status: 'INQUIRY', notes: 'Initial booking' },
      { bookingId: booking1.id, status: 'CONFIRMED', notes: 'Confirmed by studio' },
      { bookingId: booking1.id, status: 'IN_PROGRESS', notes: 'Session started' },
      { bookingId: booking1.id, status: 'COMPLETED', notes: 'Session completed' },
    ],
  });

  bookings.push(booking1);

  // Upcoming confirmed booking
  const booking2 = await prisma.booking.create({
    data: {
      studioId: studio1.id,
      customerId: customers[1].id,
      serviceId: services[1].id, // Family Package
      assignedToUserId: studio1Owner.id,
      scheduledAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      status: 'CONFIRMED',
      customerNotes: 'Family of 5, prefer outdoor location',
    },
  });

  await prisma.bookingStatusLog.createMany({
    data: [
      { bookingId: booking2.id, status: 'INQUIRY', notes: 'Initial booking' },
      { bookingId: booking2.id, status: 'QUOTED', notes: 'Quote sent' },
      { bookingId: booking2.id, status: 'CONFIRMED', notes: 'Customer confirmed' },
    ],
  });

  bookings.push(booking2);

  // New inquiry
  const booking3 = await prisma.booking.create({
    data: {
      studioId: studio1.id,
      customerId: customers[2].id,
      serviceId: services[2].id, // Wedding
      scheduledAt: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000), // 2 months from now
      status: 'INQUIRY',
      customerNotes: 'Interested in full day wedding coverage. Need more details.',
    },
  });

  await prisma.bookingStatusLog.create({
    data: { bookingId: booking3.id, status: 'INQUIRY', notes: 'New inquiry received' },
  });

  bookings.push(booking3);

  // Quoted booking
  const booking4 = await prisma.booking.create({
    data: {
      studioId: studio1.id,
      customerId: customers[3].id,
      serviceId: services[3].id, // Corporate Headshots
      scheduledAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      status: 'QUOTED',
      customerNotes: 'Team of 10 people need headshots',
      internalNotes: 'Offered 10% discount for team booking',
    },
  });

  await prisma.bookingStatusLog.createMany({
    data: [
      { bookingId: booking4.id, status: 'INQUIRY', notes: 'Initial contact' },
      { bookingId: booking4.id, status: 'QUOTED', notes: 'Custom quote sent for 10 people' },
    ],
  });

  bookings.push(booking4);

  console.log(`✅ Created ${bookings.length} bookings`);

  // Create Invoices
  console.log('💰 Creating invoices...');

  // Paid invoice for completed booking
  const invoice1 = await prisma.invoice.create({
    data: {
      studioId: studio1.id,
      bookingId: booking1.id,
      customerId: customers[0].id,
      invoiceNumber: 'INV-2024-00001',
      lineItems: [
        {
          description: 'Portrait Session',
          quantity: 1,
          rate: 299,
          amount: 299,
        },
        {
          description: 'Additional edited photos (5)',
          quantity: 5,
          rate: 15,
          amount: 75,
        },
      ],
      subtotal: 374,
      tax: 29.92,
      discount: 0,
      total: 403.92,
      status: 'PAID',
      dueDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // Yesterday
      notes: 'Thank you for your business!',
    },
  });

  await prisma.payment.create({
    data: {
      invoiceId: invoice1.id,
      amount: 403.92,
      paymentMethod: 'CARD',
      transactionId: 'ch_1234567890',
      notes: 'Paid in full via credit card',
      paidAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  // Sent invoice (unpaid)
  const invoice2 = await prisma.invoice.create({
    data: {
      studioId: studio1.id,
      bookingId: booking2.id,
      customerId: customers[1].id,
      invoiceNumber: 'INV-2024-00002',
      lineItems: [
        {
          description: 'Family Package - 2 Hours',
          quantity: 1,
          rate: 599,
          amount: 599,
        },
      ],
      subtotal: 599,
      tax: 47.92,
      discount: 0,
      total: 646.92,
      status: 'SENT',
      dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      notes: '50% deposit required to confirm booking',
    },
  });

  // Draft invoice
  const invoice3 = await prisma.invoice.create({
    data: {
      studioId: studio1.id,
      customerId: customers[2].id,
      invoiceNumber: 'INV-2024-00003',
      lineItems: [
        {
          description: 'Wedding Photography - Full Day',
          quantity: 1,
          rate: 2999,
          amount: 2999,
        },
        {
          description: 'Engagement Session',
          quantity: 1,
          rate: 399,
          amount: 399,
        },
      ],
      subtotal: 3398,
      tax: 271.84,
      discount: 300, // $300 discount for package
      total: 3369.84,
      status: 'DRAFT',
      notes: 'Package deal - engagement session included',
    },
  });

  console.log('✅ Created 3 invoices with payments');

  // Create Portfolio Items for Studio 1
  console.log('🖼️  Creating portfolio items...');

  await prisma.portfolioItem.createMany({
    data: [
      {
        studioId: studio1.id,
        title: 'Summer Portrait Series',
        description: 'Beautiful outdoor portraits captured during golden hour',
        imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
        category: 'Portraits',
        sortOrder: 1,
        isVisible: true,
      },
      {
        studioId: studio1.id,
        title: 'Smith Family Photos',
        description: 'Joyful family moments at the beach',
        imageUrl: 'https://images.unsplash.com/photo-1511895426328-dc8714191300',
        category: 'Family',
        sortOrder: 2,
        isVisible: true,
      },
      {
        studioId: studio1.id,
        title: 'Corporate Event Coverage',
        description: 'Professional event photography for tech conference',
        imageUrl: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678',
        category: 'Corporate',
        sortOrder: 3,
        isVisible: true,
      },
      {
        studioId: studio1.id,
        title: 'Wedding - John & Sarah',
        description: 'Romantic wedding ceremony at sunset',
        imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552',
        category: 'Weddings',
        sortOrder: 4,
        isVisible: true,
      },
      {
        studioId: studio1.id,
        title: 'Product Showcase',
        description: 'E-commerce product photography',
        imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
        category: 'Commercial',
        sortOrder: 5,
        isVisible: false, // Hidden portfolio item
      },
    ],
  });

  console.log('✅ Created portfolio items');

  console.log('\n🎉 Database seed completed successfully!');
  console.log('\n📝 Test Credentials:');
  console.log('\n👤 Platform Admin:');
  console.log('   Email: admin@photostudio.com');
  console.log('   Password: Admin@123');
  console.log('\n🏢 Studio Owner (Lens & Light):');
  console.log('   Email: owner@lensandlight.com');
  console.log('   Password: Demo@123');
  console.log('   Studio URL: /studio/lens-and-light');
  console.log('\n📸 Photographer:');
  console.log('   Email: photographer@lensandlight.com');
  console.log('   Password: Demo@123');
  console.log('\n🏢 Studio Owner (Forever Moments):');
  console.log('   Email: owner@forevermoments.com');
  console.log('   Password: Demo@123');
  console.log('   Studio URL: /studio/forever-moments');
  console.log('\n🏢 Studio Owner (Startup Photo - Trial):');
  console.log('   Email: owner@startupphoto.com');
  console.log('   Password: Demo@123');
  console.log('   Studio URL: /studio/startup-photo');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
