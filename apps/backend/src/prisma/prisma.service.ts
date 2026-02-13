import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  INestApplication,
  Logger,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private queryCount = 0;
  private readonly SLOW_QUERY_THRESHOLD_MS = 100;

  constructor() {
    super({
      log: [
        { emit: "event", level: "query" },
        { emit: "event", level: "info" },
        { emit: "event", level: "warn" },
        { emit: "event", level: "error" },
      ],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.setupQueryLogging();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on("beforeExit", async () => {
      await app.close();
    });
  }

  /**
   * Setup query performance logging to detect slow queries and potential N+1 issues
   */
  private setupQueryLogging() {
    // Track query execution time
    (this.$on as any)("query", (e: any) => {
      this.queryCount++;
      const duration = e.duration;

      // Log slow queries
      if (duration > this.SLOW_QUERY_THRESHOLD_MS) {
        this.logger.warn(
          `Slow query detected (${duration}ms): ${e.query.substring(0, 100)}...`,
        );
      }

      // Detect potential N+1 queries (more than 10 queries in quick succession)
      if (this.queryCount > 10) {
        this.logger.warn(
          `Potential N+1 query issue detected: ${this.queryCount} queries executed`,
        );
      }
    });

    // Reset query counter periodically (every 5 seconds)
    setInterval(() => {
      if (this.queryCount > 20) {
        this.logger.warn(
          `High query count in last 5s: ${this.queryCount} queries`,
        );
      }
      this.queryCount = 0;
    }, 5000);

    // Log info messages
    (this.$on as any)("info", (e: any) => {
      this.logger.log(e.message);
    });

    // Log warnings
    (this.$on as any)("warn", (e: any) => {
      this.logger.warn(e.message);
    });

    // Log errors
    (this.$on as any)("error", (e: any) => {
      this.logger.error(e.message);
    });
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Cannot clean database in production");
    }

    const models = Reflect.ownKeys(this).filter((key) => {
      const keyStr = String(key);
      return keyStr[0] !== "_" && keyStr[0] !== "$";
    });

    return Promise.all(
      models.map((modelKey) => {
        const key = modelKey as keyof PrismaService;
        const model = this[key];
        if (model && typeof model === "object" && "deleteMany" in model) {
          return (model as any).deleteMany();
        }
        return Promise.resolve();
      }),
    );
  }
}
