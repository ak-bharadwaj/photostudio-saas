import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ForbiddenException,
  Res,
  StreamableFile,
  ParseIntPipe,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { InvoiceService } from "./invoice.service";
import { CreateInvoiceDto, UpdateInvoiceDto } from "./dto/invoice.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { InvoiceStatus } from "@prisma/client";

interface UserPayload {
  id: string;
  email: string;
  role?: "OWNER" | "PHOTOGRAPHER" | "ASSISTANT";
  studioId?: string;
  isAdmin?: boolean;
}

@Controller("invoices")
@UseGuards(RolesGuard)
@Roles("OWNER", "PHOTOGRAPHER", "ASSISTANT")
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  @Roles("OWNER") // Only owners can create invoices
  create(
    @Body() createInvoiceDto: CreateInvoiceDto,
    @CurrentUser() user: UserPayload,
  ) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    return this.invoiceService.create(createInvoiceDto, user.studioId);
  }

  @Get()
  findAll(
    @CurrentUser() user: UserPayload,
    @Query("page", new ParseIntPipe({ optional: true })) page?: number,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number,
    @Query("status") status?: InvoiceStatus,
  ) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }

    const pageNum = page || 1;
    const limitNum = limit || 10;

    return this.invoiceService.findAll(
      user.studioId,
      pageNum,
      limitNum,
      status,
    );
  }

  @Get("stats")
  getStats(@CurrentUser() user: UserPayload) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    return this.invoiceService.getStats(user.studioId);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: UserPayload) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    return this.invoiceService.findOne(id, user.studioId);
  }

  @Get(":id/pdf")
  async downloadPdf(
    @Param("id") id: string,
    @CurrentUser() user: UserPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }

    const pdfBuffer = await this.invoiceService.generatePdf(id, user.studioId);
    const invoice = await this.invoiceService.findOne(id, user.studioId);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice_${invoice.invoiceNumber}.pdf"`,
    });

    return new StreamableFile(pdfBuffer);
  }

  @Post(":id/send")
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @Roles("OWNER") // Only owners can send invoices
  sendInvoice(@Param("id") id: string, @CurrentUser() user: UserPayload) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    return this.invoiceService.sendInvoice(id, user.studioId);
  }

  @Patch(":id")
  @Roles("OWNER") // Only owners can update invoices
  update(
    @Param("id") id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
    @CurrentUser() user: UserPayload,
  ) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    return this.invoiceService.update(id, updateInvoiceDto, user.studioId);
  }

  @Delete(":id")
  @Roles("OWNER") // Only owners can delete invoices
  remove(@Param("id") id: string, @CurrentUser() user: UserPayload) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    return this.invoiceService.remove(id, user.studioId);
  }
}
