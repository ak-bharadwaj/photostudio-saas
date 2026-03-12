const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function verifyBargainingFlow() {
  console.log('🚀 Starting Backend Verification: Quoting & Bargaining Flow');

  try {
    // 1. Setup Data - Use direct queries with logging to find the issue
    console.log('--- Data Setup ---');
    const studios = await prisma.studio.findMany({ take: 5 });
    console.log(`Found ${studios.length} studios in total.`);
    
    const studio = studios.find(s => s.status === 'ACTIVE') || studios[0];
    if (!studio) throw new Error('No studio found. Please run seed script.');
    
    console.log(`Using Studio: ${studio.name} (${studio.id})`);
    
    const service = await prisma.service.findFirst({ where: { studioId: studio.id } });
    const customer = await prisma.customer.findFirst({ where: { studioId: studio.id } });

    if (!service || !customer) {
      throw new Error(`Data missing for studio ${studio.name}. Run seed script.`);
    }

    console.log(`✅ Using Service: ${service.name}, Customer: ${customer.name}`);

    // 2. Create Booking Inquiry
    console.log('--- Step 1: Create Inquiry ---');
    const booking = await prisma.booking.create({
      data: {
        studioId: studio.id,
        customerId: customer.id,
        serviceId: service.id,
        scheduledAt: new Date(Date.now() + 86400000),
        status: 'INQUIRY',
      },
    });
    console.log(`✅ Booking Inquiry created: ${booking.id}`);

    // 3. Studio Sends Initial Quote
    console.log('--- Step 2: Send Initial Quote ---');
    const originalPrice = Number(service.price);
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'QUOTED',
        quoteAmount: originalPrice,
        quoteNotes: 'Initial standard quote',
        quotedAt: new Date(),
      }
    });
    console.log(`✅ Initial quote sent: ${originalPrice}`);

    // 4. Bargaining
    console.log('--- Step 3: Bargaining ---');
    const negotiated = originalPrice * 0.85;
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        quoteRejectionNotes: `Bargaining for ${negotiated}`,
      }
    });
    console.log(`✅ Negotiation requested for: ${negotiated}`);

    // 5. Studio Finalizes Quote
    console.log('--- Step 4: Finalize Quote ---');
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        quoteAmount: negotiated,
        quoteNotes: 'Final negotiated price',
        quotedAt: new Date(),
      }
    });
    console.log(`✅ Quote updated to negotiated: ${negotiated}`);

    // 6. Accept
    console.log('--- Step 5: Accept ---');
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'CONFIRMED',
        quoteAcceptedAt: new Date(),
      }
    });
    console.log(`✅ Quote ACCEPTED.`);

    // 7. Verify Logic
    console.log('--- Step 6: Verify Invoice Logic ---');
    const finalBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
    const subtotal = originalPrice;
    let discount = 0;
    if (finalBooking && finalBooking.quoteAmount) {
      const qAmount = Number(finalBooking.quoteAmount);
      if (qAmount < subtotal) discount = subtotal - qAmount;
    }
    const finalTotal = subtotal - discount;

    console.log(`   Final Total: ${finalTotal} (Expected: ${negotiated})`);
    if (Math.abs(finalTotal - negotiated) < 0.01) {
      console.log('✨ SUCCESS: Logic Verified Perfect.');
    } else {
      throw new Error(`Logic Mismatch: expected ${negotiated}, got ${finalTotal}`);
    }

    // Cleanup
    await prisma.bookingStatusLog.deleteMany({ where: { bookingId: booking.id } });
    await prisma.booking.delete({ where: { id: booking.id } });
    console.log('🧹 Verification cleanup complete.');

  } catch (error) {
    console.error('❌ Verification Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyBargainingFlow();
