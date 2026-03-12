import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Customer Flow (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let accessToken: string;
  let createdCustomerId: string;

  const testPhone = "+919876543210";
  const testEmail = `e2e-customer-${Date.now()}@test.com`;

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
    // Clean up test customer
    if (createdCustomerId) {
      await prisma.customer
        .deleteMany({ where: { id: createdCustomerId } })
        .catch(() => {});
    }
    await app.close();
  });

  describe("Auth guards", () => {
    it("should reject unauthenticated GET /customers", () => {
      return request(app.getHttpServer()).get("/customers").expect(401);
    });

    it("should reject invalid token on GET /customers", () => {
      return request(app.getHttpServer())
        .get("/customers")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);
    });
  });

  describe("Customer CRUD", () => {
    it("should create a new customer", async () => {
      const response = await request(app.getHttpServer())
        .post("/customers")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          name: "E2E Test Customer",
          email: testEmail,
          phone: testPhone,
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.name).toBe("E2E Test Customer");
      expect(response.body.email).toBe(testEmail);
      expect(response.body.phone).toBe(testPhone);

      createdCustomerId = response.body.id;
    });

    it("should list customers with pagination", async () => {
      const response = await request(app.getHttpServer())
        .get("/customers")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty("meta");
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toHaveProperty("total");
      expect(response.body.meta).toHaveProperty("page");
      expect(response.body.meta).toHaveProperty("limit");
    });

    it("should get a single customer by id", async () => {
      const response = await request(app.getHttpServer())
        .get(`/customers/${createdCustomerId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(createdCustomerId);
      expect(response.body.name).toBe("E2E Test Customer");
    });

    it("should return 404 for non-existent customer", async () => {
      await request(app.getHttpServer())
        .get("/customers/non-existent-id-12345")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(404);
    });

    it("should update a customer", async () => {
      const response = await request(app.getHttpServer())
        .patch(`/customers/${createdCustomerId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ name: "E2E Updated Customer" })
        .expect(200);

      expect(response.body.name).toBe("E2E Updated Customer");
    });

    it("should reject creating customer with invalid phone format", async () => {
      await request(app.getHttpServer())
        .post("/customers")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          name: "Bad Phone",
          phone: "abc",
        })
        .expect(400);
    });

    it("should reject creating customer without required name", async () => {
      await request(app.getHttpServer())
        .post("/customers")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ phone: "+911234567890" })
        .expect(400);
    });

    it("should reject creating customer without required phone", async () => {
      await request(app.getHttpServer())
        .post("/customers")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ name: "No Phone Customer" })
        .expect(400);
    });
  });

  describe("Customer search", () => {
    it("should search customers by query", async () => {
      const response = await request(app.getHttpServer())
        .get("/customers")
        .query({ search: "E2E Updated" })
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it("should support pagination parameters", async () => {
      const response = await request(app.getHttpServer())
        .get("/customers")
        .query({ page: 1, limit: 5 })
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(5);
    });
  });

  describe("Customer deletion", () => {
    it("should delete a customer", async () => {
      // Create a throwaway customer to delete
      const createRes = await request(app.getHttpServer())
        .post("/customers")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ name: "Delete Me", phone: "+910000000001" })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/customers/${createRes.body.id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);
    });

    it("should return 404 after deleting a customer", async () => {
      const createRes = await request(app.getHttpServer())
        .post("/customers")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ name: "Delete Me 2", phone: "+910000000002" })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/customers/${createRes.body.id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/customers/${createRes.body.id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
