import { Module } from "@nestjs/common";
import { BookingService } from "./booking.service";
import { BookingController } from "./booking.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { CacheModule } from "../cache/cache.module";
import { NotificationModule } from "../notification/notification.module";
import { QueueModule } from "../queue/queue.module";

import { PdfModule } from "../pdf/pdf.module";
import { UploadModule } from "../upload/upload.module";

@Module({
  imports: [
    PrismaModule,
    CacheModule,
    NotificationModule,
    QueueModule,
    PdfModule,
    UploadModule,
  ],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule { }
