import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Booking Flow (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let accessToken: string;
  let studioId: string;
  let customerId: string;
  let serviceId: string;
  let bookingId: string;
  // Track all bookingIds created in this test run for cleanup
  const createdBookingIds: string[] = [];

  // Use a random per-run seed (crypto-random) so each test run uses unique timestamps
  const runSeed = Math.floor(Math.random() * 10_000);
  function futureDate(slotIndex: number): string {
    // Spread bookings 200 minutes apart (> max service duration of 120 min) in year 2099
    const base = new Date(Date.UTC(2099, 0, 1, 0, 0, 0, 0));
    base.setUTCMinutes(
      base.getUTCMinutes() + runSeed * 200 * 8 + slotIndex * 200,
    );
    return base.toISOString();
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    prisma = app.get<PrismaService>(PrismaService);

    await app.init();

    // Login to get access token
    const loginResponse = await request(app.getHttpServer())
      .post("/auth/login")
      .send({
        email: "owner@lensandlight.com",
        password: "Demo@123",
      });

    accessToken = loginResponse.body.accessToken;
    studioId = loginResponse.body.user.studioId;

    // Clean up any leftover far-future (2099) bookings from previous failed runs
    if (studioId) {
      await prisma.booking
        .deleteMany({
          where: {
            studioId,
            scheduledAt: { gte: new Date("2099-01-01T00:00:00.000Z") },
          },
        })
        .catch(() => {});
    }

    // Get a customer for testing
    const customersResponse = await request(app.getHttpServer())
      .get("/customers")
      .set("Authorization", `Bearer ${accessToken}`);

    if (customersResponse.body.data?.length > 0) {
      customerId = customersResponse.body.data[0].id;
    }

    // Get a service for testing
    const servicesResponse = await request(app.getHttpServer())
      .get("/services")
      .set("Authorization", `Bearer ${accessToken}`);

    const servicesArray = Array.isArray(servicesResponse.body)
      ? servicesResponse.body
      : (servicesResponse.body.data ?? []);
    if (servicesArray.length > 0) {
      serviceId = servicesArray[0].id;
    }
  });

  afterAll(async () => {
    // Clean up created bookings
    if (createdBookingIds.length) {
      await prisma.booking
        .deleteMany({ where: { id: { in: createdBookingIds } } })
        .catch(() => {});
    }
    await app.close();
  });

  describe("Auth guards", () => {
    it("should reject unauthenticated GET /bookings", () => {
      return request(app.getHttpServer()).get("/bookings").expect(401);
    });
  });

  describe("Complete Booking Workflow", () => {
    it("should create a new booking", async () => {
      const response = await request(app.getHttpServer())
        .post("/bookings/internal")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          customerId,
          serviceId,
          scheduledDate: futureDate(1),
          notes: "Looking forward to the session!",
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      // Internal bookings start as CONFIRMED (staff-created)
      expect(response.body.status).toBe("CONFIRMED");
      expect(response.body.customerId).toBe(customerId);
      expect(response.body.serviceId).toBe(serviceId);

      bookingId = response.body.id;
      createdBookingIds.push(bookingId);
    });

    it("should get all bookings", async () => {
      const response = await request(app.getHttpServer())
        .get("/bookings")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it("should get a single booking by id", async () => {
      if (!bookingId) return;
      const response = await request(app.getHttpServer())
        .get(`/bookings/${bookingId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("id");
      expect(response.body.id).toBe(bookingId);
      expect(response.body).toHaveProperty("customer");
      expect(response.body).toHaveProperty("service");
    });

    it("should reject invalid status transition (CONFIRMED → INQUIRY)", async () => {
      if (!bookingId) return;
      await request(app.getHttpServer())
        .patch(`/bookings/${bookingId}/status`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          status: "INQUIRY",
          notes: "Trying to go back to inquiry",
        })
        .expect(400);
    });

    it("should filter bookings by status", async () => {
      const response = await request(app.getHttpServer())
        .get("/bookings")
        .query({ status: "CONFIRMED" })
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      response.body.data.forEach((booking: any) => {
        expect(booking.status).toBe("CONFIRMED");
      });
    });

    it("should update booking status to IN_PROGRESS", async () => {
      if (!bookingId) return;
      const response = await request(app.getHttpServer())
        .patch(`/bookings/${bookingId}/status`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          status: "IN_PROGRESS",
          notes: "Session started",
        })
        .expect(200);

      expect(response.body.status).toBe("IN_PROGRESS");
    });

    it("should update booking status to COMPLETED", async () => {
      if (!bookingId) return;
      const response = await request(app.getHttpServer())
        .patch(`/bookings/${bookingId}/status`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          status: "COMPLETED",
          notes: "Session completed successfully",
        })
        .expect(200);

      expect(response.body.status).toBe("COMPLETED");
    });

    it("should prevent booking at conflicting time slot", async () => {
      // Use a unique far-future time
      const slotDate = futureDate(2);

      // First booking
      const first = await request(app.getHttpServer())
        .post("/bookings/internal")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          customerId,
          serviceId,
          scheduledDate: slotDate,
          notes: "First booking",
        })
        .expect(201);
      createdBookingIds.push(first.body.id);

      // Conflicting booking (same time)
      await request(app.getHttpServer())
        .post("/bookings/internal")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          customerId,
          serviceId,
          scheduledDate: slotDate,
          notes: "Conflicting booking",
        })
        .expect(409); // Conflict
    });
  });

  describe("Booking Validation", () => {
    it("should reject booking without customerId", async () => {
      await request(app.getHttpServer())
        .post("/bookings/internal")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          serviceId,
          scheduledDate: futureDate(3),
        })
        .expect(400);
    });

    it("should reject booking without serviceId", async () => {
      await request(app.getHttpServer())
        .post("/bookings/internal")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          customerId,
          scheduledDate: futureDate(4),
        })
        .expect(400);
    });

    it("should reject booking with past date", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await request(app.getHttpServer())
        .post("/bookings/internal")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          customerId,
          serviceId,
          scheduledDate: yesterday.toISOString(),
        })
        .expect(400);
    });

    it("should reject booking with invalid customer", async () => {
      await request(app.getHttpServer())
        .post("/bookings/internal")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          customerId: "invalid-customer-id",
          serviceId,
          scheduledDate: futureDate(5),
        })
        .expect(404);
    });
  });

  describe("Booking Cancellation", () => {
    it("should cancel a booking", async () => {
      // Create a new booking to cancel
      const createResponse = await request(app.getHttpServer())
        .post("/bookings/internal")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          customerId,
          serviceId,
          scheduledDate: futureDate(6),
        })
        .expect(201);

      const cancelBookingId = createResponse.body.id;
      createdBookingIds.push(cancelBookingId);

      // Cancel the booking
      const response = await request(app.getHttpServer())
        .patch(`/bookings/${cancelBookingId}/cancel`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          notes: "Customer requested cancellation",
        })
        .expect(200);

      expect(response.body.status).toBe("CANCELLED");
    });

    it("should not allow cancelling already completed booking", async () => {
      if (!bookingId) return;
      await request(app.getHttpServer())
        .patch(`/bookings/${bookingId}/cancel`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          notes: "Trying to cancel completed booking",
        })
        .expect(400);
    });
  });
});
