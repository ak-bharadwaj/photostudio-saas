import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Service Flow (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let accessToken: string;
  let serviceId: string;
  let serviceId2: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    prisma = app.get<PrismaService>(PrismaService);
    await app.init();

    const loginResponse = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "owner@lensandlight.com", password: "Demo@123" });
    accessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    // Clean up created services
    const ids = [serviceId, serviceId2].filter(Boolean);
    if (ids.length) {
      await prisma.service.deleteMany({ where: { id: { in: ids } } }).catch(() => {});
    }
    await app.close();
  });

  describe("Auth guards", () => {
    it("should reject unauthenticated GET /services", () => {
      return request(app.getHttpServer()).get("/services").expect(401);
    });
  });

  describe("Service CRUD", () => {
    it("should create a new service", async () => {
      const response = await request(app.getHttpServer())
        .post("/services")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          name: "E2E Portrait Session",
          description: "A beautiful portrait session",
          price: 7500,
          durationMinutes: 120,
          isActive: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.name).toBe("E2E Portrait Session");
      expect(Number(response.body.price)).toBe(7500);
      expect(response.body.durationMinutes).toBe(120);
      expect(response.body.isActive).toBe(true);

      serviceId = response.body.id;
    });

    it("should list all services", async () => {
      const response = await request(app.getHttpServer())
        .get("/services")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      // GET /services returns a plain array
      const bodyArray: any[] = Array.isArray(response.body)
        ? response.body
        : (response.body.data ?? []);
      expect(Array.isArray(bodyArray)).toBe(true);
      const created = bodyArray.find((s: any) => s.id === serviceId);
      expect(created).toBeDefined();
    });

    it("should update a service", async () => {
      const response = await request(app.getHttpServer())
        .patch(`/services/${serviceId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ price: 8000, description: "Updated description" })
        .expect(200);

      expect(Number(response.body.price)).toBe(8000);
      expect(response.body.description).toBe("Updated description");
    });

    it("should return 404 for non-existent service", async () => {
      await request(app.getHttpServer())
        .patch("/services/non-existent-service-id")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ price: 100 })
        .expect(404);
    });

    it("should reject creating service without required name", async () => {
      await request(app.getHttpServer())
        .post("/services")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ price: 1000, durationMinutes: 60 })
        .expect(400);
    });

    it("should reject creating service without required price", async () => {
      await request(app.getHttpServer())
        .post("/services")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ name: "No Price Service", durationMinutes: 60 })
        .expect(400);
    });
  });

  describe("Service toggle-active", () => {
    it("should toggle service active status", async () => {
      const response = await request(app.getHttpServer())
        .patch(`/services/${serviceId}/toggle-active`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      // Should be toggled from true to false
      expect(response.body.isActive).toBe(false);
    });

    it("should toggle back to active", async () => {
      const response = await request(app.getHttpServer())
        .patch(`/services/${serviceId}/toggle-active`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.isActive).toBe(true);
    });
  });

  describe("Service reorder", () => {
    it("should reorder services", async () => {
      // Create a second service
      const res2 = await request(app.getHttpServer())
        .post("/services")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ name: "E2E Reorder Service", price: 3000, durationMinutes: 60 })
        .expect(201);
      serviceId2 = res2.body.id;

      const response = await request(app.getHttpServer())
        .post("/services/reorder")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ serviceIds: [serviceId2, serviceId] })
        .expect(200);

      expect(response.body).toBeTruthy();
    });
  });

  describe("Service deletion", () => {
    it("should delete a service", async () => {
      const createRes = await request(app.getHttpServer())
        .post("/services")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ name: "Delete Me Service", price: 500, durationMinutes: 30 })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/services/${createRes.body.id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);
    });
  });
});
