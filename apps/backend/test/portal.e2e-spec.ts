import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { JwtService } from "@nestjs/jwt";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Customer Portal Flow (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let customerToken: string;
  let customerId: string; // global user id (CUSTOMER role)

  const customerEmail = `e2e-portal-${Date.now()}@test.com`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    prisma = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);
    await app.init();

    // Create a CUSTOMER-role user directly (simulating OAuth sign-in)
    const customerUser = await prisma.user.create({
      data: {
        email: customerEmail,
        name: "E2E Portal Customer",
        role: "CUSTOMER",
        provider: "google",
        providerId: `e2e-${Date.now()}`,
        isActive: true,
      },
    });
    customerId = customerUser.id;

    // Mint a valid JWT for this customer user
    customerToken = jwtService.sign({
      sub: customerUser.id,
      email: customerUser.email,
      type: "user",
    });
  });

  afterAll(async () => {
    // Clean up customer user
    if (customerId) {
      await prisma.user
        .deleteMany({ where: { id: customerId } })
        .catch(() => {});
    }
    await app.close();
  });

  describe("Auth guards", () => {
    it("should reject unauthenticated GET /portal/me", () => {
      return request(app.getHttpServer()).get("/portal/me").expect(401);
    });

    it("should reject owner token on /portal/me (wrong role)", async () => {
      const ownerRes = await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: "owner@lensandlight.com", password: "Demo@123" });
      const ownerToken = ownerRes.body.accessToken;

      await request(app.getHttpServer())
        .get("/portal/me")
        .set("Authorization", `Bearer ${ownerToken}`)
        .expect(403);
    });
  });

  describe("GET /portal/me", () => {
    it("should return the customer's own profile", async () => {
      const response = await request(app.getHttpServer())
        .get("/portal/me")
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.id).toBe(customerId);
      expect(response.body.email).toBe(customerEmail);
      expect(response.body.name).toBe("E2E Portal Customer");
    });
  });

  describe("PATCH /portal/me", () => {
    it("should update the customer's own name", async () => {
      const response = await request(app.getHttpServer())
        .patch("/portal/me")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ name: "E2E Portal Updated Name" })
        .expect(200);

      expect(response.body.name).toBe("E2E Portal Updated Name");
      expect(response.body.id).toBe(customerId);
    });

    it("should ignore email field (read-only identity)", async () => {
      const response = await request(app.getHttpServer())
        .patch("/portal/me")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ name: "Still Updated", email: "hacker@evil.com" })
        .expect(200);

      // Email should NOT be changed
      expect(response.body.email).toBe(customerEmail);
    });
  });

  describe("GET /portal/bookings", () => {
    it("should return the customer's bookings (empty list for new user)", async () => {
      const response = await request(app.getHttpServer())
        .get("/portal/bookings")
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty("meta");
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it("should support pagination parameters", async () => {
      const response = await request(app.getHttpServer())
        .get("/portal/bookings")
        .query({ page: 1, limit: 5 })
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(5);
    });
  });

  describe("GET /portal/invoices", () => {
    it("should return the customer's invoices (empty list for new user)", async () => {
      const response = await request(app.getHttpServer())
        .get("/portal/invoices")
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty("meta");
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe("GET /portal/studios", () => {
    it("should return the studios the customer has booked with", async () => {
      const response = await request(app.getHttpServer())
        .get("/portal/studios")
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
