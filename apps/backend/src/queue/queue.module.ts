import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { QueueService } from "./queue.service";
import { NotificationModule } from "../notification/notification.module";
import { PrismaModule } from "../prisma/prisma.module";
import { CacheModule } from "../cache/cache.module";

/**
 * QueueModule — Cron-based background task scheduler.
 *
 * Uses @nestjs/schedule instead of BullMQ so Redis is not required.
 * For high-throughput production workloads, BullMQ can be layered on top
 * of these cron jobs for per-record delayed-job scheduling.
 */
@Module({
  imports: [ScheduleModule.forRoot(), NotificationModule, PrismaModule, CacheModule],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
