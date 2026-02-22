import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  INestApplication,
  Logger,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { tenantExtension } from "../common/tenant";

import { Pool } from "pg";

function createBasePrismaClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// Create the extended client type
const extendedClient = createBasePrismaClient().$extends(tenantExtension);
type ExtendedPrismaClient = typeof extendedClient;

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private _baseClient: PrismaClient;
  private _client: ExtendedPrismaClient;

  constructor() {
    this._baseClient = createBasePrismaClient();
    this._client = this._baseClient.$extends(tenantExtension);
  }

  async onModuleInit() {
    await this._baseClient.$connect();
    this.logger.log("Database connected successfully");
  }

  async onModuleDestroy() {
    await this._baseClient.$disconnect();
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on("beforeExit", async () => {
      await app.close();
    });
  }

  // Proxy all model accessors to the extended client
  get admin() { return (this._client as any).admin; }
  get studio() { return (this._client as any).studio; }
  get user() { return (this._client as any).user; }
  get customer() { return (this._client as any).customer; }
  get service() { return (this._client as any).service; }
  get booking() { return (this._client as any).booking; }
  get bookingStatusLog() { return (this._client as any).bookingStatusLog; }
  get invoice() { return (this._client as any).invoice; }
  get payment() { return (this._client as any).payment; }
  get commission() { return (this._client as any).commission; }
  get portfolioItem() { return (this._client as any).portfolioItem; }
  get workflow() { return (this._client as any).workflow; }

  // Proxy $ methods to the base client
  get $transaction() { return (this._baseClient as any).$transaction.bind(this._baseClient); }
  get $queryRaw() { return (this._baseClient as any).$queryRaw.bind(this._baseClient); }
  get $executeRaw() { return (this._baseClient as any).$executeRaw.bind(this._baseClient); }

  async $connect() { return this._baseClient.$connect(); }
  async $disconnect() { return this._baseClient.$disconnect(); }

  async cleanDatabase() {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Cannot clean database in production");
    }

    // Delete in order to respect FK constraints
    await (this._baseClient as any).bookingStatusLog.deleteMany();
    await (this._baseClient as any).payment.deleteMany();
    await (this._baseClient as any).commission.deleteMany();
    await (this._baseClient as any).invoice.deleteMany();
    await (this._baseClient as any).booking.deleteMany();
    await (this._baseClient as any).portfolioItem.deleteMany();
    await (this._baseClient as any).workflow.deleteMany();
    await (this._baseClient as any).service.deleteMany();
    await (this._baseClient as any).customer.deleteMany();
    await (this._baseClient as any).user.deleteMany();
    await (this._baseClient as any).studio.deleteMany();
    await (this._baseClient as any).admin.deleteMany();
  }
}
