/**
 * LEGACY controller — phone-number-only access to booking/invoice data.
 * TODO: Deprecate in favour of the JWT-based portal.controller.ts once all
 *       clients have migrated.
 *
 * Security hardening applied:
 *  - Both `phone` AND `email` are required for every data endpoint.
 *    A single-factor (phone-only) lookup is no longer accepted.
 *  - Rate limit tightened to 10 req / min (was 30).
 *  - PDF and timeline endpoints also require both factors.
 */
import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  BadRequestException,
  ParseIntPipe,
  DefaultValuePipe,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Public } from "../auth/decorators/public.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { InvoiceService } from "../invoice/invoice.service";

@Controller("customer-portal")
export class CustomerPortalController {
  constructor(
    private prisma: PrismaService,
    private invoiceService: InvoiceService,
  ) {}

  // ---------------------------------------------------------------------------
  // Helper — look up a customer by BOTH phone AND email (dual-factor).
  // ---------------------------------------------------------------------------
  private async findCustomerByDualFactor(
    phone: string,
    email: string,
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { phone, email },
    });
    if (!customer) {
      throw new NotFoundException("Customer not found");
    }
    return customer;
  }

  // ---------------------------------------------------------------------------
  // GET /customer-portal/bookings
  // ---------------------------------------------------------------------------
  @Public()
  @Get("bookings")
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 req / min
  async getBookings(
    @Query("phone") phone: string,
    @Query("email") email: string,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit = 10,
  ) {
    if (!phone || !email) {
      throw new BadRequestException("Both phone and email are required");
    }

    const safeLimit = Math.min(limit, 50);
    const skip = (page - 1) * safeLimit;

    const customer = await this.findCustomerByDualFactor(phone, email);

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: { customerId: customer.id },
        include: {
          service: {
            select: {
              name: true,
              price: true,
              durationMinutes: true,
            },
          },
          studio: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { scheduledAt: "desc" },
        skip,
        take: safeLimit,
      }),
      this.prisma.booking.count({ where: { customerId: customer.id } }),
    ]);

    return {
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
      data: bookings,
      meta: {
        total,
        page,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  // ---------------------------------------------------------------------------
  // GET /customer-portal/invoices
  // ---------------------------------------------------------------------------
  @Public()
  @Get("invoices")
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 req / min
  async getInvoices(
    @Query("phone") phone: string,
    @Query("email") email: string,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit = 10,
  ) {
    if (!phone || !email) {
      throw new BadRequestException("Both phone and email are required");
    }

    const safeLimit = Math.min(limit, 50);
    const skip = (page - 1) * safeLimit;

    const customer = await this.findCustomerByDualFactor(phone, email);

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { customerId: customer.id },
        include: {
          booking: {
            include: {
              service: true,
            },
          },
          payments: true,
          studio: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: safeLimit,
      }),
      this.prisma.invoice.count({ where: { customerId: customer.id } }),
    ]);

    return {
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
      data: invoices,
      meta: {
        total,
        page,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  // ---------------------------------------------------------------------------
  // GET /customer-portal/invoices/:invoiceNumber/pdf
  // ---------------------------------------------------------------------------
  @Public()
  @Get("invoices/:invoiceNumber/pdf")
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 req / min
  async getInvoicePdf(
    @Param("invoiceNumber") invoiceNumber: string,
    @Query("phone") phone: string,
    @Query("email") email: string,
  ) {
    if (!phone || !email) {
      throw new BadRequestException("Both phone and email are required");
    }

    const invoice = await this.prisma.invoice.findUnique({
      where: { invoiceNumber },
      include: {
        customer: true,
        studio: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

    // Dual-factor verification: phone AND email must match
    if (
      invoice.customer.phone !== phone ||
      (invoice.customer.email ?? "") !== email
    ) {
      throw new NotFoundException("Invoice not found");
    }

    return this.invoiceService.generatePdf(invoice.id, invoice.studioId);
  }

  // ---------------------------------------------------------------------------
  // GET /customer-portal/bookings/:id/timeline
  // ---------------------------------------------------------------------------
  @Public()
  @Get("bookings/:id/timeline")
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 req / min
  async getBookingTimeline(
    @Param("id") bookingId: string,
    @Query("phone") phone: string,
    @Query("email") email: string,
  ) {
    if (!phone || !email) {
      throw new BadRequestException("Both phone and email are required");
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: true,
        service: true,
        studio: {
          select: {
            name: true,
          },
        },
        statusLogs: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    // Dual-factor verification: phone AND email must match
    if (
      booking.customer.phone !== phone ||
      (booking.customer.email ?? "") !== email
    ) {
      throw new NotFoundException("Booking not found");
    }

    return {
      booking: {
        id: booking.id,
        status: booking.status,
        scheduledAt: booking.scheduledAt,
        service: booking.service,
        studio: booking.studio,
      },
      timeline: booking.statusLogs,
    };
  }
}
