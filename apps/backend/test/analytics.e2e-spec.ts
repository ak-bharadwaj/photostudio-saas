import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Analytics Flow (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let ownerToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    prisma = app.get<PrismaService>(PrismaService);
    await app.init();

    // Owner token (has studioId)
    const ownerRes = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "owner@lensandlight.com", password: "Demo@123" });
    ownerToken = ownerRes.body.accessToken;

    // Admin token (no studioId)
    const adminRes = await request(app.getHttpServer())
      .post("/auth/admin/login")
      .send({ email: "admin@reviewsfeedback.com", password: "Admin@123" });
    adminToken = adminRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Auth guards", () => {
    it("should reject unauthenticated GET /analytics/overview", () => {
      return request(app.getHttpServer())
        .get("/analytics/overview")
        .expect(401);
    });

    it("should reject unauthenticated GET /analytics/revenue", () => {
      return request(app.getHttpServer()).get("/analytics/revenue").expect(401);
    });
  });

  describe("Overview analytics", () => {
    it("should return overview stats for studio owner", async () => {
      const response = await request(app.getHttpServer())
        .get("/analytics/overview")
        .set("Authorization", `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("totalBookings");
      expect(response.body).toHaveProperty("totalRevenue");
      expect(response.body).toHaveProperty("pendingInvoices");
      expect(response.body).toHaveProperty("completedBookings");
    });

    it("should return overview stats with date range", async () => {
      const startDate = "2024-01-01";
      const endDate = "2024-12-31";

      const response = await request(app.getHttpServer())
        .get("/analytics/overview")
        .query({ startDate, endDate })
        .set("Authorization", `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("totalBookings");
    });

    it("should reject invalid startDate format", async () => {
      await request(app.getHttpServer())
        .get("/analytics/overview")
        .query({ startDate: "not-a-date" })
        .set("Authorization", `Bearer ${ownerToken}`)
        .expect(400);
    });

    it("should reject startDate after endDate", async () => {
      await request(app.getHttpServer())
        .get("/analytics/overview")
        .query({ startDate: "2025-12-31", endDate: "2024-01-01" })
        .set("Authorization", `Bearer ${ownerToken}`)
        .expect(400);
    });

    it("should reject date range exceeding 366 days", async () => {
      await request(app.getHttpServer())
        .get("/analytics/overview")
        .query({ startDate: "2020-01-01", endDate: "2025-12-31" })
        .set("Authorization", `Bearer ${ownerToken}`)
        .expect(400);
    });
  });

  describe("Revenue analytics", () => {
    it("should return revenue over time for studio owner", async () => {
      const response = await request(app.getHttpServer())
        .get("/analytics/revenue")
        .set("Authorization", `Bearer ${ownerToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it("should return revenue with custom date range", async () => {
      const response = await request(app.getHttpServer())
        .get("/analytics/revenue")
        .query({ startDate: "2024-01-01", endDate: "2024-06-30" })
        .set("Authorization", `Bearer ${ownerToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("Bookings by status analytics", () => {
    it("should return bookings by status breakdown", async () => {
      const response = await request(app.getHttpServer())
        .get("/analytics/bookings-by-status")
        .set("Authorization", `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toBeTruthy();
    });
  });

  describe("Service performance analytics", () => {
    it("should return service performance data", async () => {
      const response = await request(app.getHttpServer())
        .get("/analytics/service-performance")
        .set("Authorization", `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toBeTruthy();
    });
  });

  describe("Customer insights analytics", () => {
    it("should return customer insights data", async () => {
      const response = await request(app.getHttpServer())
        .get("/analytics/customer-insights")
        .set("Authorization", `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toBeTruthy();
    });
  });
});
