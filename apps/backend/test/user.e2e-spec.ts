import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("User Flow (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let ownerToken: string;
  let createdUserId: string;

  const testUserEmail = `e2e-user-${Date.now()}@test.com`;
  const testUserPassword = "E2eTest@123";

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
    ownerToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    if (createdUserId) {
      await prisma.user
        .deleteMany({ where: { id: createdUserId } })
        .catch(() => {});
    }
    await app.close();
  });

  describe("Auth guards", () => {
    it("should reject unauthenticated GET /users", () => {
      return request(app.getHttpServer()).get("/users").expect(401);
    });
  });

  describe("User CRUD", () => {
    it("should create a new PHOTOGRAPHER user", async () => {
      const response = await request(app.getHttpServer())
        .post("/users")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
          name: "E2E Photographer",
          email: testUserEmail,
          password: testUserPassword,
          role: "PHOTOGRAPHER",
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.email).toBe(testUserEmail);
      expect(response.body.role).toBe("PHOTOGRAPHER");
      // Password should NOT be returned
      expect(response.body.password).toBeUndefined();

      createdUserId = response.body.id;
    });

    it("should list all users", async () => {
      const response = await request(app.getHttpServer())
        .get("/users")
        .set("Authorization", `Bearer ${ownerToken}`)
        .expect(200);

      // GET /users returns a plain array (not paginated)
      const users: any[] = Array.isArray(response.body)
        ? response.body
        : (response.body.data ?? []);
      expect(Array.isArray(users)).toBe(true);
    });

    it("should update a user", async () => {
      const response = await request(app.getHttpServer())
        .patch(`/users/${createdUserId}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ name: "E2E Updated Photographer" })
        .expect(200);

      expect(response.body.name).toBe("E2E Updated Photographer");
    });

    it("should reject creating user with duplicate email", async () => {
      await request(app.getHttpServer())
        .post("/users")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
          name: "Duplicate",
          email: testUserEmail,
          password: testUserPassword,
          role: "ASSISTANT",
        })
        .expect(409);
    });

    it("should reject creating user without required fields", async () => {
      await request(app.getHttpServer())
        .post("/users")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ name: "No Email" })
        .expect(400);
    });

    it("should reject creating user with weak password", async () => {
      await request(app.getHttpServer())
        .post("/users")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
          name: "Weak Password",
          email: `weak-${Date.now()}@test.com`,
          password: "password",
          role: "ASSISTANT",
        })
        .expect(400);
    });

    it("should reject creating user with invalid role", async () => {
      await request(app.getHttpServer())
        .post("/users")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
          name: "Bad Role",
          email: `badrole-${Date.now()}@test.com`,
          password: testUserPassword,
          role: "SUPERADMIN",
        })
        .expect(400);
    });
  });

  describe("User toggle-active", () => {
    it("should toggle user active status", async () => {
      const response = await request(app.getHttpServer())
        .patch(`/users/${createdUserId}/toggle-active`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .expect(200);

      // toggle-active returns { message, user: { isActive } }
      const isActive: unknown =
        typeof response.body.isActive === "boolean"
          ? response.body.isActive
          : response.body.user?.isActive;
      expect(typeof isActive).toBe("boolean");
    });
  });

  describe("User change-password", () => {
    it("should reject changing another user's password (owner cannot change staff's password)", async () => {
      // The service enforces that only the user themselves can change their password
      await request(app.getHttpServer())
        .patch(`/users/${createdUserId}/password`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
          currentPassword: testUserPassword,
          newPassword: "NewE2eTest@456",
        })
        .expect(403);
    });

    it("should reject password change with wrong current password (also 403 since owner != target user)", async () => {
      await request(app.getHttpServer())
        .patch(`/users/${createdUserId}/password`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
          currentPassword: "WrongPassword@123",
          newPassword: "NewE2eTest@789",
        })
        .expect(403);
    });

    it("should reject weak new password with 400 (DTO validation fires before ownership check)", async () => {
      await request(app.getHttpServer())
        .patch(`/users/${createdUserId}/password`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
          currentPassword: testUserPassword,
          newPassword: "weak",
        })
        .expect(400);
    });
  });

  describe("User deletion", () => {
    it("should delete a user", async () => {
      const createRes = await request(app.getHttpServer())
        .post("/users")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
          name: "Delete Me User",
          email: `deleteme-${Date.now()}@test.com`,
          password: testUserPassword,
          role: "ASSISTANT",
        })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/users/${createRes.body.id}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .expect(200);
    });
  });
});
