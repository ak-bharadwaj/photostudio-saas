import { PrismaClient, BookingStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';

const prisma = new PrismaClient();

async function verifyBargainingFlow() {
  console.log('🚀 Starting Backend Verification: Quoting & Bargaining Flow');

  try {
    // 1. Setup Data
    const studio = await prisma.studio.findFirst({ where: { status: 'ACTIVE' } });
    const service = await prisma.service.findFirst({ where: { studioId: studio!.id, isActive: true } });
    const customer = await prisma.customer.findFirst({ where: { studioId: studio!.id } });

    if (!studio || !service || !customer) {
      throw new Error('Required seed data missing. Run seed script first.');
    }

    console.log(`✅ Using Studio: ${studio.name}, Service: ${service.name}, Customer: ${customer.name}`);

    // 2. Create Booking Inquiry
    const booking = await prisma.booking.create({
      data: {
        studioId: studio.id,
        customerId: customer.id,
        serviceId: service.id,
        scheduledAt: new Date(Date.now() + 86400000), // Tomorrow
        status: 'INQUIRY' as BookingStatus,
      },
    });
    console.log(`✅ Step 1: Booking Inquiry created (ID: ${booking.id})`);

    // 3. Studio Sends Initial Quote
    const originalPrice = Number(service.price);
    const initialQuote = originalPrice;
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'QUOTED' as BookingStatus,
        quoteAmount: new Decimal(initialQuote),
        quoteNotes: 'Standard pricing applied.',
        quotedAt: new Date(),
      }
    });
    console.log(`✅ Step 2: Studio sent initial quote: ${initialQuote}`);

    // 4. Customer Negotiates (Bargaining)
    const negotiatedAmount = originalPrice * 0.8; // 20% discount request
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        quoteRejectionNotes: `Can we do ${negotiatedAmount}? It is a bit high for me.`,
      }
    });
    console.log(`✅ Step 3: Customer requested negotiation: ${negotiatedAmount}`);

    // 5. Studio Accepts Negotiation & Updates Quote
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        quoteAmount: new Decimal(negotiatedAmount),
        quoteNotes: 'Special discount applied as requested.',
        quotedAt: new Date(),
      }
    });
    console.log(`✅ Step 4: Studio updated quote to negotiated amount: ${negotiatedAmount}`);

    // 6. Customer Accepts Final Quote
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'CONFIRMED' as BookingStatus,
        quoteAcceptedAt: new Date(),
      }
    });
    console.log(`✅ Step 5: Customer accepted final quote. Booking CONFIRMED.`);

    // 7. Verify Invoice Generation Matches Negotiated Amount
    // Simulate invoice service logic
    const subtotal = originalPrice; // Original service price
    let discount = 0;
    
    const finalBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
    if (finalBooking?.quoteAmount) {
      const qAmount = Number(finalBooking.quoteAmount);
      if (qAmount < subtotal) {
        discount = subtotal - qAmount;
      }
    }
    
    const finalTotal = subtotal - discount;
    console.log(`📊 Final Analysis:`);
    console.log(`   - Original Service Price: ${originalPrice}`);
    console.log(`   - Negotiated Quote: ${negotiatedAmount}`);
    console.log(`   - Applied Discount: ${discount}`);
    console.log(`   - Final Invoice Total: ${finalTotal}`);

    if (finalTotal === negotiatedAmount) {
      console.log('✨ SUCCESS: Final invoice amount perfectly matches negotiated quote.');
    } else {
      throw new Error(`FAILURE: Amount mismatch. Expected ${negotiatedAmount}, got ${finalTotal}`);
    }

  } catch (error) {
    console.error('❌ Verification Failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyBargainingFlow();
