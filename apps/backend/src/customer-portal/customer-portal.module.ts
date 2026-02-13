import { Module } from "@nestjs/common";
import { CustomerPortalController } from "./customer-portal.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { InvoiceModule } from "../invoice/invoice.module";

@Module({
  imports: [PrismaModule, InvoiceModule],
  controllers: [CustomerPortalController],
})
export class CustomerPortalModule {}
