import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UploadService } from "../upload/upload.service";
import { PdfService } from "../pdf/pdf.service";
import { NotificationService } from "../notification/notification.service";
import { QueueService } from "../queue/queue.service";
import { CreateInvoiceDto, UpdateInvoiceDto } from "./dto/invoice.dto";
import { InvoiceStatus } from '../generated/prisma-client';
import { Decimal } from "@prismaclient/runtime/client";
import { Prisma } from '../generated/prisma-client';

/** Shape of a single invoice line item stored in the JSON column. */
interface InvoiceLineItem {
  description: string;
  quantity: number;
  /** Unit rate (price per unit) */
  rate: number;
  /** Pre-computed total for this line (quantity * rate) */
  amount: number;
}

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

    // If bookingId is provided, check for a quoteAmount to apply bargaining discount
    let discount = dto.discount || 0;
    if (dto.bookingId) {
      const booking = await this.prisma.booking.findUnique({
        where: { id: dto.bookingId },
        select: { quoteAmount: true },
      });

      if (booking?.quoteAmount) {
        const negotiatedPrice = Number(booking.quoteAmount);
        // If negotiated price is lower than subtotal, apply the difference as bargaining discount
        if (negotiatedPrice < subtotal) {
          discount = subtotal - negotiatedPrice;
          this.logger.log(
            `Applying bargaining discount of ${discount} to match quote of ${negotiatedPrice}`,
          );
        }
      }
    }

    // Auto-calculate tax if not provided
    let tax = dto.tax;
    if (tax === undefined || tax === null) {
      const studio = await this.prisma.studio.findUnique({
        where: { id: studioId },
        select: { taxRate: true },
      });
      const taxRate = Number(studio?.taxRate || 0);
      tax = (subtotal * taxRate) / 100;
    }

    const total = subtotal + tax - discount;

    // Create invoice with retry-on-collision for invoice number uniqueness
    const invoice = await this.generateAndReserveInvoice(studioId, {
      studioId,
      customerId: dto.customerId,
      ...(dto.bookingId ? { bookingId: dto.bookingId } : {}),
      lineItems: dto.lineItems as unknown as Prisma.InputJsonValue,
      subtotal: new Decimal(subtotal),
      tax: new Decimal(tax),
      discount: new Decimal(discount),
      total: new Decimal(total),
      status: "DRAFT",
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      notes: dto.notes,
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

    const where: Prisma.InvoiceWhereInput = { studioId };
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
    let updateData: Prisma.InvoiceUpdateInput = {};

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
        lineItems: dto.lineItems as unknown as Prisma.InputJsonValue,
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
      studioPhone: invoice.studio.phone ?? "",
      customerName: invoice.customer.name,
      customerEmail: invoice.customer.email || undefined,
      customerPhone: invoice.customer.phone,
      lineItems: invoice.lineItems as unknown as InvoiceLineItem[],
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

    // Update invoice status to SENT.
    // NOTE: The Invoice schema does not yet have a pdfUrl column — to persist
    // the PDF URL a migration adding `pdfUrl String?` must be run first.
    // The generated URL is returned in the response and included in the email.
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
      } catch (error: unknown) {
        this.logger.error(
          "Failed to send invoice email:",
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    // Schedule payment reminder if invoice has a due date
    if (invoice.dueDate) {
      try {
        await this.queueService.schedulePaymentReminder(id, invoice.dueDate);
        this.logger.log(
          `[Queue] Scheduled payment reminder for invoice ${invoice.invoiceNumber}`,
        );
      } catch (error: unknown) {
        this.logger.error(
          "[Queue] Failed to schedule payment reminder:",
          error instanceof Error ? error.stack : String(error),
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
      studioPhone: invoice.studio.phone ?? "",
      customerName: invoice.customer.name,
      customerEmail: invoice.customer.email || undefined,
      customerPhone: invoice.customer.phone,
      lineItems: invoice.lineItems as unknown as InvoiceLineItem[],
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
    // Sort by createdAt desc (chronological, not lexicographic) to avoid year-boundary
    // bugs where INV-2025-00001 sorts before INV-2024-00100 lexicographically.
    const last = await this.prisma.invoice.findFirst({
      where: { studioId },
      orderBy: { createdAt: "desc" },
      select: { invoiceNumber: true },
    });

    // Extract the numeric sequence from the last invoice number (INV-YYYY-XXXXX)
    let sequence = 1;
    if (last?.invoiceNumber) {
      const parts = last.invoiceNumber.split("-");
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        sequence = lastSeq + 1;
      }
    }

    const year = new Date().getFullYear();
    return `INV-${year}-${sequence.toString().padStart(5, "0")}`;
  }

  /**
   * Generates an invoice number and retries with an incremented sequence if a
   * unique-constraint violation (P2002) occurs due to a concurrent create.
   * This eliminates the count+1 race condition while still producing
   * predictable human-readable numbers.
   */
  private async generateAndReserveInvoice(
    studioId: string,
    invoiceData: Omit<Prisma.InvoiceUncheckedCreateInput, "invoiceNumber">,
    maxRetries = 5,
  ) {
    let attempt = 0;
    while (attempt < maxRetries) {
      const invoiceNumber = await this.generateInvoiceNumber(studioId);
      try {
        return await this.prisma.invoice.create({
          data: {
            ...invoiceData,
            invoiceNumber,
          } as unknown as Prisma.InvoiceCreateInput,
          include: {
            customer: true,
            booking: { include: { service: true } },
            studio: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                taxRate: true,
              },
            },
          },
        });
      } catch (err: unknown) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          // Unique constraint on invoiceNumber — retry
          attempt++;
          this.logger.warn(
            `Invoice number collision on attempt ${attempt}, retrying…`,
          );
          continue;
        }
        throw err;
      }
    }
    throw new InternalServerErrorException(
      "Unable to generate a unique invoice number after multiple attempts",
    );
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
