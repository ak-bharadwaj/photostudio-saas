import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Admin Studio Management (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let ownerToken: string;
  let createdStudioId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    prisma = app.get<PrismaService>(PrismaService);
    await app.init();

    // Admin token
    const adminRes = await request(app.getHttpServer())
      .post("/auth/admin/login")
      .send({ email: "admin@photostudio.com", password: "Admin@123" });
    adminToken = adminRes.body.accessToken;

    // Owner token (non-admin)
    const ownerRes = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "owner@lensandlight.com", password: "Demo@123" });
    ownerToken = ownerRes.body.accessToken;
  });

  afterAll(async () => {
    // Clean up created studio (cascades to owner user)
    if (createdStudioId) {
      await prisma.studio.deleteMany({ where: { id: createdStudioId } }).catch(() => {});
    }
    await app.close();
  });

  describe("Auth guards", () => {
    it("should reject unauthenticated GET /admin/studios", () => {
      return request(app.getHttpServer()).get("/admin/studios").expect(401);
    });
  });

  describe("Admin studio listing", () => {
    it("should list all studios as admin", async () => {
      const response = await request(app.getHttpServer())
        .get("/admin/studios")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty("meta");
    });

    it("should support pagination for studio listing", async () => {
      const response = await request(app.getHttpServer())
        .get("/admin/studios")
        .query({ page: 1, limit: 5 })
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.meta.page).toBe(1);
    });

    it("should filter studios by status", async () => {
      const response = await request(app.getHttpServer())
        .get("/admin/studios")
        .query({ status: "ACTIVE" })
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe("Admin create studio", () => {
    it("should create a new studio with owner", async () => {
      const uniqueSlug = `e2e-test-studio-${Date.now()}`;
      const response = await request(app.getHttpServer())
        .post("/admin/studios")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          studioName: "E2E Test Studio",
          slug: uniqueSlug,
          studioEmail: `e2e-studio-${Date.now()}@test.com`,
          studioPhone: "+919999999999",
          ownerName: "E2E Studio Owner",
          ownerEmail: `e2e-owner-${Date.now()}@test.com`,
          ownerPassword: "E2eOwner@123",
        })
        .expect(201);

      expect(response.body).toHaveProperty("slug");
      expect(response.body.slug).toBe(uniqueSlug);

      createdStudioId = response.body.id;
    });
  });

  describe("Admin studio update", () => {
    it("should update a studio's status", async () => {
      if (!createdStudioId) return;

      const response = await request(app.getHttpServer())
        .patch(`/admin/studios/${createdStudioId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "SUSPENDED" })
        .expect(200);

      expect(response.body.status).toBe("SUSPENDED");
    });

    it("should activate a suspended studio", async () => {
      if (!createdStudioId) return;

      const response = await request(app.getHttpServer())
        .post(`/admin/studios/${createdStudioId}/activate`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeTruthy();
    });

    it("should suspend a studio with reason", async () => {
      if (!createdStudioId) return;

      const response = await request(app.getHttpServer())
        .post(`/admin/studios/${createdStudioId}/suspend`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ reason: "E2E test suspension" })
        .expect(200);

      expect(response.body).toBeTruthy();
    });
  });

  describe("Admin platform analytics", () => {
    it("should return platform analytics", async () => {
      const response = await request(app.getHttpServer())
        .get("/admin/analytics")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeTruthy();
    });

    it("should return recent activities", async () => {
      const response = await request(app.getHttpServer())
        .get("/admin/activities")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeTruthy();
    });
  });
});
