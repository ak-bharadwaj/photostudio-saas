import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Payment Flow (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let accessToken: string;
  let customerId: string;
  let invoiceId: string;
  let paymentId: string;

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

    // Get a customer
    const customersRes = await request(app.getHttpServer())
      .get("/customers")
      .set("Authorization", `Bearer ${accessToken}`);
    if (customersRes.body.data.length > 0) {
      customerId = customersRes.body.data[0].id;
    }

    // Create an invoice to attach payments to
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const invoiceRes = await request(app.getHttpServer())
      .post("/invoices")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        customerId,
        lineItems: [
          {
            description: "Payment E2E Session",
            quantity: 1,
            rate: 10000,
            amount: 10000,
          },
        ],
        dueDate: dueDate.toISOString(),
      });
    invoiceId = invoiceRes.body.id;
  });

  afterAll(async () => {
    // Clean up
    if (invoiceId) {
      await prisma.payment.deleteMany({ where: { invoiceId } }).catch(() => {});
      await prisma.invoice
        .deleteMany({ where: { id: invoiceId } })
        .catch(() => {});
    }
    await app.close();
  });

  describe("Auth guards", () => {
    it("should reject unauthenticated GET /payments", () => {
      return request(app.getHttpServer()).get("/payments").expect(401);
    });

    it("should reject unauthenticated GET /payments/stats", () => {
      return request(app.getHttpServer()).get("/payments/stats").expect(401);
    });
  });

  describe("Payment CRUD", () => {
    it("should create a payment against an invoice", async () => {
      const response = await request(app.getHttpServer())
        .post("/payments")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          invoiceId,
          amount: 5000,
          paymentMethod: "CASH",
          notes: "Partial payment via E2E",
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.invoiceId).toBe(invoiceId);
      expect(Number(response.body.amount)).toBe(5000);
      expect(response.body.paymentMethod).toBe("CASH");

      paymentId = response.body.id;
    });

    it("should list all payments", async () => {
      const response = await request(app.getHttpServer())
        .get("/payments")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it("should list payments for a specific invoice", async () => {
      const response = await request(app.getHttpServer())
        .get(`/payments/invoice/${invoiceId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      const payment = response.body.find((p: any) => p.id === paymentId);
      expect(payment).toBeDefined();
    });

    it("should get payment stats", async () => {
      const response = await request(app.getHttpServer())
        .get("/payments/stats")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("totalAmount");
      expect(response.body).toHaveProperty("totalPayments");
    });

    it("should reject payment without invoiceId", async () => {
      await request(app.getHttpServer())
        .post("/payments")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ amount: 1000, paymentMethod: "CASH" })
        .expect(400);
    });

    it("should reject payment without amount", async () => {
      await request(app.getHttpServer())
        .post("/payments")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ invoiceId, paymentMethod: "CASH" })
        .expect(400);
    });

    it("should reject payment with invalid paymentMethod", async () => {
      await request(app.getHttpServer())
        .post("/payments")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ invoiceId, amount: 1000, paymentMethod: "BITCOIN" })
        .expect(400);
    });

    it("should reject payment for non-existent invoice", async () => {
      await request(app.getHttpServer())
        .post("/payments")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          invoiceId: "non-existent-invoice-id",
          amount: 1000,
          paymentMethod: "CASH",
        })
        .expect(404);
    });
  });

  describe("Payment deletion", () => {
    it("should delete a payment", async () => {
      await request(app.getHttpServer())
        .delete(`/payments/${paymentId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);
    });
  });
});
