import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePaymentDto } from "./dto/payment.dto";
import { Decimal } from "@prismaclient/runtime/client";
import { InvoiceStatus, PaymentMethod, Prisma } from '../generated/prisma-client';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePaymentDto, studioId: string) {
    // Verify invoice belongs to studio
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: dto.invoiceId,
        studioId,
      },
      include: {
        payments: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

    // Check if invoice can accept payments
    if (invoice.status === "CANCELLED") {
      throw new BadRequestException("Cannot add payment to cancelled invoice");
    }

    // Calculate total paid so far
    const totalPaid = invoice.payments.reduce(
      (sum: number, payment: { amount: unknown }) =>
        sum + Number(payment.amount),
      0,
    );

    // Check if payment exceeds remaining balance
    const remaining = Number(invoice.total) - totalPaid;
    if (dto.amount > remaining) {
      throw new BadRequestException(
        `Payment amount (${dto.amount}) exceeds remaining balance (${remaining.toFixed(2)})`,
      );
    }

    // Create payment and update invoice status in transaction
    const result = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const payment = await tx.payment.create({
          data: {
            invoiceId: dto.invoiceId,
            amount: new Decimal(dto.amount),
            paymentMethod: dto.paymentMethod,
            transactionId: dto.transactionId,
            notes: dto.notes,
          },
        });

        // Calculate new total paid
        const newTotalPaid = totalPaid + dto.amount;
        const invoiceTotal = Number(invoice.total);

        // Update invoice status
        let newStatus = invoice.status;
        if (newTotalPaid >= invoiceTotal) {
          newStatus = "PAID";
        } else if (newTotalPaid > 0) {
          newStatus = "PARTIALLY_PAID";
        }

        await tx.invoice.update({
          where: { id: dto.invoiceId },
          data: { status: newStatus },
        });

        // Handle Commission calculation if the invoice is now PAID
        if (newStatus === "PAID") {
          const studio = await tx.studio.findUnique({
            where: { id: studioId },
            select: {
              id: true,
              billingModel: true,
              commissionRate: true,
              commissionType: true,
            },
          });

          if (
            studio &&
            studio.billingModel === "COMMISSION" &&
            studio.commissionRate
          ) {
            let commissionAmount = 0;
            if (studio.commissionType === "PERCENTAGE") {
              commissionAmount =
                (Number(invoice.total) * Number(studio.commissionRate)) / 100;
            } else {
              commissionAmount = Number(studio.commissionRate);
            }

            if (commissionAmount > 0) {
              await tx.commission.create({
                data: {
                  studioId,
                  invoiceId: dto.invoiceId,
                  bookingId: invoice.bookingId ?? undefined,
                  amount: new Decimal(commissionAmount),
                  status: "PENDING",
                  notes: `Commission calculated for ${studio.commissionType === "PERCENTAGE" ? studio.commissionRate + "%" : studio.commissionRate} rate`,
                },
              });
            }
          }
        }

        return payment;
      },
    );

    return result;
  }

  async findAllByInvoice(invoiceId: string, studioId: string) {
    // Verify invoice belongs to studio
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        studioId,
      },
    });

    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

    return this.prisma.payment.findMany({
      where: { invoiceId },
      orderBy: { paidAt: "desc" },
      include: {
        invoice: {
          select: {
            invoiceNumber: true,
            total: true,
          },
        },
      },
    });
  }

  async findOne(id: string, studioId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id,
        invoice: { studioId },
      },
      include: {
        invoice: {
          include: {
            customer: true,
            studio: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    return payment;
  }

  async remove(id: string, studioId: string) {
    const payment = await this.findOne(id, studioId);
    // Capture original invoice status before any changes
    const originalInvoiceStatus = payment.invoice.status;

    // Recalculate invoice status after removing payment
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Delete the payment
      await tx.payment.delete({
        where: { id },
      });

      // Get remaining payments for this invoice
      const remainingPayments = await tx.payment.findMany({
        where: { invoiceId: payment.invoiceId },
      });

      // Calculate new total paid
      const totalPaid = remainingPayments.reduce(
        (sum: number, p: { amount: unknown }) => sum + Number(p.amount),
        0,
      );

      const invoiceTotal = Number(payment.invoice.total);

      // Update invoice status — if no payments remain, restore to original
      // pre-payment status (DRAFT or SENT) rather than blindly resetting to SENT
      let newStatus: InvoiceStatus;
      if (totalPaid === 0) {
        newStatus =
          originalInvoiceStatus === InvoiceStatus.DRAFT
            ? InvoiceStatus.DRAFT
            : InvoiceStatus.SENT;
      } else if (totalPaid >= invoiceTotal) {
        newStatus = InvoiceStatus.PAID;
      } else {
        newStatus = InvoiceStatus.PARTIALLY_PAID;
      }

      await tx.invoice.update({
        where: { id: payment.invoiceId },
        data: { status: newStatus },
      });
    });

    return { message: "Payment deleted successfully" };
  }

  async findAll(
    studioId: string,
    params?: {
      page?: number;
      limit?: number;
      paymentMethod?: string;
      search?: string;
    },
  ) {
    const page = params?.page ?? 1;
    const limit = Math.min(params?.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const baseWhere: Prisma.PaymentWhereInput = {
      invoice: { studioId },
    };
    if (params?.paymentMethod) {
      baseWhere.paymentMethod = params.paymentMethod as PaymentMethod;
    }

    const where: Prisma.PaymentWhereInput = params?.search
      ? {
          AND: [
            baseWhere,
            {
              OR: [
                {
                  transactionId: {
                    contains: params.search,
                    mode: "insensitive",
                  },
                },
                {
                  invoice: {
                    invoiceNumber: {
                      contains: params.search,
                      mode: "insensitive",
                    },
                  },
                },
                {
                  invoice: {
                    customer: {
                      name: { contains: params.search, mode: "insensitive" },
                    },
                  },
                },
                {
                  invoice: {
                    customer: {
                      email: { contains: params.search, mode: "insensitive" },
                    },
                  },
                },
              ],
            },
          ],
        }
      : baseWhere;

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paidAt: "desc" },
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              total: true,
              status: true,
              customer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStats(studioId: string) {
    const [totalPayments, totalAmount, recentPayments] = await Promise.all([
      this.prisma.payment.count({
        where: {
          invoice: {
            studioId,
          },
        },
      }),
      this.prisma.payment.aggregate({
        where: {
          invoice: {
            studioId,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.payment.findMany({
        where: {
          invoice: {
            studioId,
          },
        },
        take: 10,
        orderBy: { paidAt: "desc" },
        include: {
          invoice: {
            select: {
              invoiceNumber: true,
              customer: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      totalPayments,
      totalAmount: totalAmount._sum.amount || 0,
      recentPayments,
    };
  }
}
