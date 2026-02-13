import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Authentication Flow (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    prisma = app.get<PrismaService>(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Admin Authentication", () => {
    it("should login admin with valid credentials", () => {
      return request(app.getHttpServer())
        .post("/auth/admin/login")
        .send({
          email: "admin@photostudio.com",
          password: "admin123",
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("admin");
          expect(res.body).toHaveProperty("accessToken");
          expect(res.body).toHaveProperty("refreshToken");
          expect(res.body.admin.email).toBe("admin@photostudio.com");
        });
    });

    it("should reject admin login with invalid password", () => {
      return request(app.getHttpServer())
        .post("/auth/admin/login")
        .send({
          email: "admin@photostudio.com",
          password: "wrongpassword",
        })
        .expect(401);
    });

    it("should reject admin login with invalid email", () => {
      return request(app.getHttpServer())
        .post("/auth/admin/login")
        .send({
          email: "nonexistent@example.com",
          password: "admin123",
        })
        .expect(401);
    });

    it("should validate email format", () => {
      return request(app.getHttpServer())
        .post("/auth/admin/login")
        .send({
          email: "invalid-email",
          password: "admin123",
        })
        .expect(400);
    });
  });

  describe("User Authentication", () => {
    let accessToken: string;

    it("should login user with valid credentials", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/user/login")
        .send({
          email: "owner@example.com",
          password: "password123",
        })
        .expect(200);

      expect(response.body).toHaveProperty("user");
      expect(response.body).toHaveProperty("accessToken");
      expect(response.body).toHaveProperty("refreshToken");
      expect(response.body.user.email).toBe("owner@example.com");

      accessToken = response.body.accessToken;
    });

    it("should reject user login with invalid credentials", () => {
      return request(app.getHttpServer())
        .post("/auth/user/login")
        .send({
          email: "owner@example.com",
          password: "wrongpassword",
        })
        .expect(401);
    });

    it("should access protected route with valid token", async () => {
      const response = await request(app.getHttpServer())
        .get("/bookings")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it("should reject protected route without token", () => {
      return request(app.getHttpServer()).get("/bookings").expect(401);
    });

    it("should reject protected route with invalid token", () => {
      return request(app.getHttpServer())
        .get("/bookings")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);
    });
  });
});
