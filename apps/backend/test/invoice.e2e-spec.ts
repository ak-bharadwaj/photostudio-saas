import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Invoice Flow (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let accessToken: string;
  let customerId: string;
  let invoiceId: string;

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

    // Get a customer to attach invoices to
    const customersRes = await request(app.getHttpServer())
      .get("/customers")
      .set("Authorization", `Bearer ${accessToken}`);
    if (customersRes.body.data.length > 0) {
      customerId = customersRes.body.data[0].id;
    }
  });

  afterAll(async () => {
    // Clean up test invoices
    if (invoiceId) {
      await prisma.invoice.deleteMany({ where: { id: invoiceId } }).catch(() => {});
    }
    await app.close();
  });

  describe("Auth guards", () => {
    it("should reject unauthenticated GET /invoices", () => {
      return request(app.getHttpServer()).get("/invoices").expect(401);
    });
  });

  describe("Invoice CRUD", () => {
    it("should create a new DRAFT invoice", async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const response = await request(app.getHttpServer())
        .post("/invoices")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          customerId,
          lineItems: [
            {
              description: "Photography Session",
              quantity: 1,
              rate: 5000,
              amount: 5000,
            },
          ],
          tax: 18,
          dueDate: dueDate.toISOString(),
          notes: "E2E test invoice",
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("invoiceNumber");
      expect(response.body.status).toBe("DRAFT");
      expect(response.body.customerId).toBe(customerId);

      invoiceId = response.body.id;
    });

    it("should list invoices with pagination", async () => {
      const response = await request(app.getHttpServer())
        .get("/invoices")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty("meta");
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it("should get a single invoice by id", async () => {
      const response = await request(app.getHttpServer())
        .get(`/invoices/${invoiceId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(invoiceId);
      expect(response.body).toHaveProperty("lineItems");
      expect(response.body).toHaveProperty("customer");
    });

    it("should return 404 for non-existent invoice", async () => {
      await request(app.getHttpServer())
        .get("/invoices/non-existent-id-99999")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(404);
    });

    it("should update an invoice (add discount)", async () => {
      const response = await request(app.getHttpServer())
        .patch(`/invoices/${invoiceId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ discount: 500, notes: "Updated by E2E test" })
        .expect(200);

      expect(Number(response.body.discount)).toBe(500);
    });

    it("should reject creating invoice without customerId", async () => {
      await request(app.getHttpServer())
        .post("/invoices")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          lineItems: [{ description: "Test", quantity: 1, rate: 100, amount: 100 }],
        })
        .expect(400);
    });

    it("should reject creating invoice without lineItems", async () => {
      await request(app.getHttpServer())
        .post("/invoices")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ customerId })
        .expect(400);
    });
  });

  describe("Invoice status transitions", () => {
    it("should transition DRAFT -> SENT", async () => {
      const response = await request(app.getHttpServer())
        .patch(`/invoices/${invoiceId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ status: "SENT" })
        .expect(200);

      expect(response.body.status).toBe("SENT");
    });

    it("should transition SENT -> PAID", async () => {
      const response = await request(app.getHttpServer())
        .patch(`/invoices/${invoiceId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ status: "PAID" })
        .expect(200);

      expect(response.body.status).toBe("PAID");
    });
  });

  describe("Invoice PDF", () => {
    it("should generate PDF for invoice", async () => {
      const response = await request(app.getHttpServer())
        .get(`/invoices/${invoiceId}/pdf`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      // PDF generation returns a buffer/stream or JSON with base64
      expect(response.body || response.text).toBeTruthy();
    });
  });

  describe("Invoice deletion", () => {
    it("should delete an invoice", async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 15);

      const createRes = await request(app.getHttpServer())
        .post("/invoices")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          customerId,
          lineItems: [{ description: "Delete Test", quantity: 1, rate: 100, amount: 100 }],
          dueDate: dueDate.toISOString(),
        })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/invoices/${createRes.body.id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);
    });
  });
});
