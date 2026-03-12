import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Bargaining & Quoting Flow (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let studioToken: string;
  let customerToken: string;
  let studioId: string;
  let customerId: string;
  let serviceId: string;
  let bookingId: string;
  const createdBookingIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    prisma = app.get<PrismaService>(PrismaService);
    await app.init();

    // 1. Ensure Customer User exists with CUSTOMER role
    let customerUser = await prisma.user.findUnique({
      where: { email: "customer@gmail.com" },
    });
    if (!customerUser) {
      const passwordHash = await require("bcrypt").hash("Demo@123", 12);
      customerUser = await prisma.user.create({
        data: {
          email: "customer@gmail.com",
          name: "Test Customer",
          passwordHash,
          role: "CUSTOMER",
          isActive: true,
          provider: "local",
        },
      });
    } else {
      await prisma.user.update({
        where: { id: customerUser.id },
        data: { role: "CUSTOMER" },
      });
    }

    // 2. Login as Studio Owner
    const studioLogin = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "owner@lensandlight.com", password: "Demo@123" });
    studioToken = studioLogin.body.accessToken;
    studioId = studioLogin.body.user.studioId;

    // 3. Login as Customer
    const customerLogin = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "customer@gmail.com", password: "Demo@123" });
    customerToken = customerLogin.body.accessToken;

    // 4. Ensure Customer record is linked to User
    const studio = await prisma.studio.findUnique({ where: { id: studioId } });
    let customer = await prisma.customer.findFirst({
      where: { email: "customer@gmail.com", studioId },
    });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          email: "customer@gmail.com",
          name: "Test Customer",
          phone: "1234567890",
          studioId,
          globalUserId: customerUser.id,
        },
      });
    } else {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { globalUserId: customerUser.id },
      });
    }
    customerId = customer.id;

    const service = await prisma.service.findFirst({
      where: { studioId, isActive: true },
    });
    if (!service) throw new Error("No active service found for testing");
    serviceId = service.id;
  });

  afterAll(async () => {
    if (createdBookingIds.length) {
      await prisma.booking
        .deleteMany({ where: { id: { in: createdBookingIds } } })
        .catch(() => {});
    }
    await app.close();
  });

  it("should complete a full bargaining and invoice generation cycle", async () => {
    console.log("--- Starting Bargaining E2E ---");
    // A. Create Inquiry (as Customer/Public)
    console.log("Step A: Creating Inquiry...");
    const inquiryResponse = await request(app.getHttpServer())
      .post("/bookings")
      .send({
        studioSlug: "lens-light-studio",
        serviceId,
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        customerName: "QA Tester",
        customerEmail: "customer@gmail.com",
        customerPhone: "1234567890",
      })
      .expect(201);

    bookingId = inquiryResponse.body.id;
    createdBookingIds.push(bookingId);
    expect(inquiryResponse.body.status).toBe("INQUIRY");
    console.log(`Inquiry created: ${bookingId}`);

    // B. Studio sends initial Quote
    console.log("Step B: Studio sending quote...");
    const quoteRes = await request(app.getHttpServer())
      .post(`/bookings/${bookingId}/quote`)
      .set("Authorization", `Bearer ${studioToken}`)
      .send({ amount: 1000, notes: "Initial price" });

    if (quoteRes.status !== 201) {
      console.error("Quote failed:", quoteRes.body);
    }
    expect(quoteRes.status).toBe(201);

    let booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new Error("Booking not found after quote");
    expect(booking.status).toBe("QUOTED");
    expect(Number(booking.quoteAmount)).toBe(1000);
    console.log("Quote sent successfully");

    // C. Customer requests negotiation (Bargaining)
    await request(app.getHttpServer())
      .post(`/bookings/${bookingId}/negotiate`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ notes: "Can we do 800?" })
      .expect(201);

    booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new Error("Booking not found after negotiation");
    // @ts-ignore - quoteRejectionNotes might be missing in older prisma types
    expect(booking.quoteRejectionNotes).toBe("Can we do 800?");

    // D. Studio updates quote to 850 (Compromise)
    await request(app.getHttpServer())
      .post(`/bookings/${bookingId}/quote`)
      .set("Authorization", `Bearer ${studioToken}`)
      .send({ amount: 850, notes: "Best I can do is 850" })
      .expect(201);

    booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new Error("Booking not found after quote update");
    expect(Number(booking.quoteAmount)).toBe(850);

    // E. Customer accepts
    await request(app.getHttpServer())
      .post(`/bookings/${bookingId}/accept`)
      .set("Authorization", `Bearer ${customerToken}`)
      .expect(201);

    booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new Error("Booking not found after acceptance");
    expect(booking.status).toBe("CONFIRMED");

    // F. Studio generates Invoice
    const invoiceResponse = await request(app.getHttpServer())
      .post("/invoices")
      .set("Authorization", `Bearer ${studioToken}`)
      .send({
        customerId,
        bookingId,
        lineItems: [{ description: "Photography Session", amount: 1000 }], // Original price in line item
        notes: "Final negotiated invoice",
      })
      .expect(201);

    // G. Verify "Bargaining Discount" application
    // Original (1000) - Discount (150) = Final (850). Plus tax logic.
    const subtotal = 1000;
    const discount = 150;
    expect(Number(invoiceResponse.body.subtotal)).toBe(subtotal);
    expect(Number(invoiceResponse.body.discount)).toBe(discount);

    const studio = await prisma.studio.findUnique({ where: { id: studioId } });
    if (!studio) throw new Error("Studio not found");
    const taxRate = Number(studio.taxRate || 0);
    const expectedTax = (subtotal * taxRate) / 100;
    const expectedTotal = subtotal + expectedTax - discount;

    expect(Number(invoiceResponse.body.total)).toBe(expectedTotal);
    console.log(
      `✅ E2E Verified: Negotiated 850. Total with tax: ${expectedTotal}`,
    );
  });
});
