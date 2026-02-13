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
      .post("/auth/user/login")
      .send({
        email: "owner@example.com",
        password: "password123",
      });

    accessToken = loginResponse.body.accessToken;
    studioId = loginResponse.body.user.studioId;

    // Get a customer and service for testing
    const customersResponse = await request(app.getHttpServer())
      .get("/customers")
      .set("Authorization", `Bearer ${accessToken}`);

    if (customersResponse.body.data.length > 0) {
      customerId = customersResponse.body.data[0].id;
    }

    const servicesResponse = await request(app.getHttpServer())
      .get("/services")
      .set("Authorization", `Bearer ${accessToken}`);

    if (servicesResponse.body.data.length > 0) {
      serviceId = servicesResponse.body.data[0].id;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Complete Booking Workflow", () => {
    it("should create a new booking", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app.getHttpServer())
        .post("/bookings")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          customerId,
          serviceId,
          scheduledAt: tomorrow.toISOString(),
          customerNotes: "Looking forward to the session!",
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.status).toBe("INQUIRY");
      expect(response.body.customerId).toBe(customerId);
      expect(response.body.serviceId).toBe(serviceId);

      bookingId = response.body.id;
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
      const response = await request(app.getHttpServer())
        .get(`/bookings/${bookingId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("id");
      expect(response.body.id).toBe(bookingId);
      expect(response.body).toHaveProperty("customer");
      expect(response.body).toHaveProperty("service");
    });

    it("should update booking status from INQUIRY to QUOTED", async () => {
      const response = await request(app.getHttpServer())
        .patch(`/bookings/${bookingId}/status`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          status: "QUOTED",
          notes: "Quote sent to customer",
        })
        .expect(200);

      expect(response.body.status).toBe("QUOTED");
    });

    it("should update booking status from QUOTED to CONFIRMED", async () => {
      const response = await request(app.getHttpServer())
        .patch(`/bookings/${bookingId}/status`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          status: "CONFIRMED",
          notes: "Customer confirmed booking",
        })
        .expect(200);

      expect(response.body.status).toBe("CONFIRMED");
    });

    it("should reject invalid status transition", async () => {
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
      // Try to create another booking at the same time as an existing one
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);

      // First booking
      await request(app.getHttpServer())
        .post("/bookings")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          customerId,
          serviceId,
          scheduledAt: tomorrow.toISOString(),
          customerNotes: "First booking",
        })
        .expect(201);

      // Conflicting booking (same time)
      await request(app.getHttpServer())
        .post("/bookings")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          customerId,
          serviceId,
          scheduledAt: tomorrow.toISOString(),
          customerNotes: "Conflicting booking",
        })
        .expect(409); // Conflict
    });
  });

  describe("Booking Validation", () => {
    it("should reject booking without customerId", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 3);

      await request(app.getHttpServer())
        .post("/bookings")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          serviceId,
          scheduledAt: tomorrow.toISOString(),
        })
        .expect(400);
    });

    it("should reject booking without serviceId", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 3);

      await request(app.getHttpServer())
        .post("/bookings")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          customerId,
          scheduledAt: tomorrow.toISOString(),
        })
        .expect(400);
    });

    it("should reject booking with past date", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await request(app.getHttpServer())
        .post("/bookings")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          customerId,
          serviceId,
          scheduledAt: yesterday.toISOString(),
        })
        .expect(400);
    });

    it("should reject booking with invalid customer", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 3);

      await request(app.getHttpServer())
        .post("/bookings")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          customerId: "invalid-customer-id",
          serviceId,
          scheduledAt: tomorrow.toISOString(),
        })
        .expect(404);
    });
  });

  describe("Booking Cancellation", () => {
    it("should cancel a booking", async () => {
      // Create a new booking to cancel
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 5);

      const createResponse = await request(app.getHttpServer())
        .post("/bookings")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          customerId,
          serviceId,
          scheduledAt: tomorrow.toISOString(),
        })
        .expect(201);

      const cancelBookingId = createResponse.body.id;

      // Cancel the booking
      const response = await request(app.getHttpServer())
        .post(`/bookings/${cancelBookingId}/cancel`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          notes: "Customer requested cancellation",
        })
        .expect(200);

      expect(response.body.status).toBe("CANCELLED");
    });

    it("should not allow cancelling already completed booking", async () => {
      // Try to cancel the completed booking from earlier tests
      await request(app.getHttpServer())
        .post(`/bookings/${bookingId}/cancel`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          notes: "Trying to cancel completed booking",
        })
        .expect(400);
    });
  });
});
