import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UploadService } from "../upload/upload.service";
import { PdfService } from "../pdf/pdf.service";
import { NotificationService } from "../notification/notification.service";
import { QueueService } from "../queue/queue.service";
import { CreateInvoiceDto, UpdateInvoiceDto } from "./dto/invoice.dto";
import { InvoiceStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
    private pdfService: PdfService,
    private notificationService: NotificationService,
    private queueService: QueueService,
  ) {}

  async create(dto: CreateInvoiceDto, studioId: string) {
    // Verify customer belongs to studio
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: dto.customerId,
        studioId,
      },
    });

    if (!customer) {
      throw new NotFoundException("Customer not found");
    }

    // If bookingId is provided, verify it belongs to studio
    if (dto.bookingId) {
      const booking = await this.prisma.booking.findFirst({
        where: {
          id: dto.bookingId,
          studioId,
        },
      });

      if (!booking) {
        throw new NotFoundException("Booking not found");
      }
    }

    // Calculate totals
    const subtotal = dto.lineItems.reduce((sum, item) => sum + item.amount, 0);
    const tax = dto.tax || 0;
    const discount = dto.discount || 0;
    const total = subtotal + tax - discount;

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(studioId);

    // Create invoice
    const invoice = await this.prisma.invoice.create({
      data: {
        studioId,
        customerId: dto.customerId,
        bookingId: dto.bookingId,
        invoiceNumber,
        lineItems: dto.lineItems as any,
        subtotal: new Decimal(subtotal),
        tax: new Decimal(tax),
        discount: new Decimal(discount),
        total: new Decimal(total),
        status: "DRAFT",
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        notes: dto.notes,
      },
      include: {
        customer: true,
        booking: {
          include: {
            service: true,
          },
        },
        studio: true,
      },
    });

    return invoice;
  }

  async findAll(
    studioId: string,
    page: number = 1,
    limit: number = 10,
    status?: InvoiceStatus,
  ) {
    const skip = (page - 1) * limit;

    const where: any = { studioId };
    if (status) {
      where.status = status;
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          customer: true,
          booking: {
            include: {
              service: true,
            },
          },
          _count: {
            select: {
              payments: true,
            },
          },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, studioId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id,
        studioId,
      },
      include: {
        customer: true,
        booking: {
          include: {
            service: true,
          },
        },
        studio: true,
        payments: {
          orderBy: { paidAt: "desc" },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

    return invoice;
  }

  async update(id: string, dto: UpdateInvoiceDto, studioId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id,
        studioId,
      },
    });

    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

    // Can only update draft or sent invoices
    if (!["DRAFT", "SENT"].includes(invoice.status)) {
      throw new BadRequestException(
        "Cannot update invoice with current status",
      );
    }

    // Recalculate totals if line items changed
    let updateData: any = {};

    if (dto.lineItems) {
      const subtotal = dto.lineItems.reduce(
        (sum, item) => sum + item.amount,
        0,
      );
      const tax = dto.tax !== undefined ? dto.tax : Number(invoice.tax);
      const discount =
        dto.discount !== undefined ? dto.discount : Number(invoice.discount);
      const total = subtotal + tax - discount;

      updateData = {
        lineItems: dto.lineItems,
        subtotal: new Decimal(subtotal),
        tax: new Decimal(tax),
        discount: new Decimal(discount),
        total: new Decimal(total),
      };
    } else {
      if (dto.tax !== undefined) updateData.tax = new Decimal(dto.tax);
      if (dto.discount !== undefined)
        updateData.discount = new Decimal(dto.discount);

      // Recalculate total if tax or discount changed
      if (dto.tax !== undefined || dto.discount !== undefined) {
        const subtotal = Number(invoice.subtotal);
        const tax = dto.tax !== undefined ? dto.tax : Number(invoice.tax);
        const discount =
          dto.discount !== undefined ? dto.discount : Number(invoice.discount);
        updateData.total = new Decimal(subtotal + tax - discount);
      }
    }

    if (dto.dueDate) updateData.dueDate = new Date(dto.dueDate);
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.status) updateData.status = dto.status;

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        studio: true,
      },
    });

    return updated;
  }

  async remove(id: string, studioId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id,
        studioId,
      },
      include: {
        _count: {
          select: {
            payments: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

    // Can only delete draft invoices with no payments
    if (invoice.status !== "DRAFT") {
      throw new BadRequestException("Can only delete draft invoices");
    }

    if (invoice._count.payments > 0) {
      throw new BadRequestException("Cannot delete invoice with payments");
    }

    await this.prisma.invoice.delete({
      where: { id },
    });

    return { message: "Invoice deleted successfully" };
  }

  async sendInvoice(id: string, studioId: string) {
    const invoice = await this.findOne(id, studioId);

    if (invoice.status !== "DRAFT") {
      throw new BadRequestException("Only draft invoices can be sent");
    }

    // Generate PDF
    const pdfBuffer = await this.pdfService.generateInvoicePdf({
      invoiceNumber: invoice.invoiceNumber,
      studioName: invoice.studio.name,
      studioEmail: invoice.studio.email,
      studioPhone: invoice.studio.phone,
      customerName: invoice.customer.name,
      customerEmail: invoice.customer.email || undefined,
      customerPhone: invoice.customer.phone,
      lineItems: invoice.lineItems as any[],
      subtotal: Number(invoice.subtotal),
      tax: Number(invoice.tax),
      discount: Number(invoice.discount),
      total: Number(invoice.total),
      dueDate: invoice.dueDate || undefined,
      notes: invoice.notes || undefined,
      createdAt: invoice.createdAt,
    });

    // Upload PDF to Cloudinary
    const pdfUrl = await this.uploadService.uploadInvoicePDF(
      studioId,
      invoice.invoiceNumber,
      pdfBuffer,
    );

    // Update invoice status and add PDF URL (if you want to store it)
    await this.prisma.invoice.update({
      where: { id },
      data: { status: "SENT" },
    });

    // Send email to customer
    if (invoice.customer.email) {
      try {
        await this.notificationService.sendInvoice({
          to: invoice.customer.email,
          customerName: invoice.customer.name,
          studioName: invoice.studio.name,
          invoiceNumber: invoice.invoiceNumber,
          total: Number(invoice.total),
          dueDate: invoice.dueDate || undefined,
          invoiceUrl: pdfUrl,
        });
      } catch (error: any) {
        this.logger.error("Failed to send invoice email:", error.stack);
      }
    }

    // Schedule payment reminder if invoice has a due date
    if (invoice.dueDate) {
      try {
        await this.queueService.schedulePaymentReminder(id, invoice.dueDate);
        this.logger.log(
          `[Queue] Scheduled payment reminder for invoice ${invoice.invoiceNumber}`,
        );
      } catch (error: any) {
        this.logger.error(
          "[Queue] Failed to schedule payment reminder:",
          error.stack,
        );
      }
    }

    return {
      message: "Invoice sent successfully",
      pdfUrl,
    };
  }

  async generatePdf(id: string, studioId: string): Promise<Buffer> {
    const invoice = await this.findOne(id, studioId);

    const pdfBuffer = await this.pdfService.generateInvoicePdf({
      invoiceNumber: invoice.invoiceNumber,
      studioName: invoice.studio.name,
      studioEmail: invoice.studio.email,
      studioPhone: invoice.studio.phone,
      customerName: invoice.customer.name,
      customerEmail: invoice.customer.email || undefined,
      customerPhone: invoice.customer.phone,
      lineItems: invoice.lineItems as any[],
      subtotal: Number(invoice.subtotal),
      tax: Number(invoice.tax),
      discount: Number(invoice.discount),
      total: Number(invoice.total),
      dueDate: invoice.dueDate || undefined,
      notes: invoice.notes || undefined,
      createdAt: invoice.createdAt,
    });

    return pdfBuffer;
  }

  private async generateInvoiceNumber(studioId: string): Promise<string> {
    // Get the count of invoices for this studio
    const count = await this.prisma.invoice.count({
      where: { studioId },
    });

    // Generate invoice number: INV-YYYY-XXXXX
    const year = new Date().getFullYear();
    const sequence = (count + 1).toString().padStart(5, "0");

    return `INV-${year}-${sequence}`;
  }

  async getStats(studioId: string) {
    const [
      totalInvoices,
      draftInvoices,
      sentInvoices,
      paidInvoices,
      overdueInvoices,
      totalRevenue,
      pendingRevenue,
    ] = await Promise.all([
      this.prisma.invoice.count({ where: { studioId } }),
      this.prisma.invoice.count({ where: { studioId, status: "DRAFT" } }),
      this.prisma.invoice.count({ where: { studioId, status: "SENT" } }),
      this.prisma.invoice.count({ where: { studioId, status: "PAID" } }),
      this.prisma.invoice.count({ where: { studioId, status: "OVERDUE" } }),
      this.prisma.invoice.aggregate({
        where: { studioId, status: "PAID" },
        _sum: { total: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          studioId,
          status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] },
        },
        _sum: { total: true },
      }),
    ]);

    return {
      totalInvoices,
      draftInvoices,
      sentInvoices,
      paidInvoices,
      overdueInvoices,
      totalRevenue: totalRevenue._sum.total || 0,
      pendingRevenue: pendingRevenue._sum.total || 0,
    };
  }
}
