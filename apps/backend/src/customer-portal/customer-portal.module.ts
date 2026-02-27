import { Module } from "@nestjs/common";
import { CustomerPortalController } from "./customer-portal.controller";
import { PortalController } from "./portal.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { InvoiceModule } from "../invoice/invoice.module";
import { BookingModule } from "../booking/booking.module";

@Module({
  imports: [PrismaModule, InvoiceModule, BookingModule],
  controllers: [CustomerPortalController, PortalController],
})
export class CustomerPortalModule {}
