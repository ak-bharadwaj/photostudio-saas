import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { PrismaClient } from '../../prisma/generated-client';
import { PrismaPg } from "@prisma/adapter-pg";
import { tenantExtension } from "../common/tenant";

import { Pool } from "pg";

// Capture the type produced by applying our tenant extension to PrismaClient.
// PrismaClient.$extends returns an opaque intersection type that cannot be
// named directly, so we derive it via ReturnType + a helper function.
function extendClient(base: PrismaClient) {
  return base.$extends(tenantExtension);
}
type ExtendedPrismaClient = ReturnType<typeof extendClient>;

// Create the extended client type
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private _baseClient: PrismaClient;
  private _client: ExtendedPrismaClient;

  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      // Neon free tier: max 10 connections per compute unit.
      // Reserve 2 for admin/migrations — keep 8 for the app.
      max: 8,
      min: 1,
      idleTimeoutMillis: 20000, // release idle connections after 20 s
      connectionTimeoutMillis: 5000, // fail fast if pool is exhausted
    });
    const adapter = new PrismaPg(pool);
    this._baseClient = new PrismaClient({ adapter });
    this._client = this._baseClient.$extends(tenantExtension);
  }

  async onModuleInit() {
    await this._baseClient.$connect();
    this.logger.log("Database connected successfully");
  }

  async onModuleDestroy() {
    await this._baseClient.$disconnect();
  }

  // Proxy all model accessors to the extended client
  get admin() {
    return this._client.admin;
  }
  get studio() {
    return this._client.studio;
  }
  get user() {
    return this._client.user;
  }
  get customer() {
    return this._client.customer;
  }
  get service() {
    return this._client.service;
  }
  get booking() {
    return this._client.booking;
  }
  get bookingStatusLog() {
    return this._client.bookingStatusLog;
  }
  get invoice() {
    return this._client.invoice;
  }
  get payment() {
    return this._client.payment;
  }
  get commission() {
    return this._client.commission;
  }
  get portfolioItem() {
    return this._client.portfolioItem;
  }
  get workflow() {
    return this._client.workflow;
  }
  get review() {
    return this._client.review;
  }
  get category() {
    return this._client.category;
  }
  get studioRequest() {
    return this._client.studioRequest;
  }

  // Proxy $ methods to the extended (tenant-aware) client so that
  // transactions also respect the current tenant context.
  // Note: $queryRaw / $executeRaw are raw SQL and do not go through the
  // extension layer, so they stay on _baseClient intentionally.
  get $transaction() {
    // _client is an opaque intersection type from $extends; $transaction is
    // present at runtime but not in the static type — cast to access it.
    return (this._client as unknown as PrismaClient).$transaction.bind(
      this._client,
    );
  }
  get $queryRaw() {
    return this._baseClient.$queryRaw.bind(this._baseClient);
  }
  get $executeRaw() {
    return this._baseClient.$executeRaw.bind(this._baseClient);
  }

  async $connect() {
    return this._baseClient.$connect();
  }
  async $disconnect() {
    return this._baseClient.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Cannot clean database in production");
    }

    // Delete in order to respect FK constraints
    await this._baseClient.bookingStatusLog.deleteMany();
    await this._baseClient.payment.deleteMany();
    await this._baseClient.commission.deleteMany();
    await this._baseClient.invoice.deleteMany();
    await this._baseClient.review.deleteMany();
    await this._baseClient.booking.deleteMany();
    await this._baseClient.portfolioItem.deleteMany();
    await this._baseClient.workflow.deleteMany();
    await this._baseClient.service.deleteMany();
    await this._baseClient.customer.deleteMany();
    await this._baseClient.user.deleteMany();
    await this._baseClient.studio.deleteMany();
    await this._baseClient.admin.deleteMany();
    await this._baseClient.category.deleteMany();
  }
}
