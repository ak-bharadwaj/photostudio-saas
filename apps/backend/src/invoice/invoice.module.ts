import { Module } from "@nestjs/common";
import { InvoiceService } from "./invoice.service";
import { InvoiceController } from "./invoice.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { UploadModule } from "../upload/upload.module";
import { PdfModule } from "../pdf/pdf.module";
import { NotificationModule } from "../notification/notification.module";
import { QueueModule } from "../queue/queue.module";

@Module({
  imports: [
    PrismaModule,
    UploadModule,
    PdfModule,
    NotificationModule,
    QueueModule,
  ],
  controllers: [InvoiceController],
  providers: [InvoiceService],
  exports: [InvoiceService],
})
export class InvoiceModule {}
