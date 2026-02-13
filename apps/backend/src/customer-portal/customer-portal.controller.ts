import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
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

  // Get customer's bookings by access token (phone number)
  @Public()
  @Get("bookings")
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  async getBookings(
    @Query("phone") phone: string,
    @Query("email") email?: string,
  ) {
    if (!phone && !email) {
      throw new NotFoundException("Phone number or email is required");
    }

    // Find customer by phone or email
    const where: any = {};
    if (phone) where.phone = phone;
    if (email) where.email = email;

    const customer = await this.prisma.customer.findFirst({ where });

    if (!customer) {
      throw new NotFoundException("Customer not found");
    }

    // Get all bookings for this customer
    const bookings = await this.prisma.booking.findMany({
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
    });

    return {
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
      bookings,
    };
  }

  // Get customer's invoices
  @Public()
  @Get("invoices")
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  async getInvoices(
    @Query("phone") phone: string,
    @Query("email") email?: string,
  ) {
    if (!phone && !email) {
      throw new NotFoundException("Phone number or email is required");
    }

    const where: any = {};
    if (phone) where.phone = phone;
    if (email) where.email = email;

    const customer = await this.prisma.customer.findFirst({ where });

    if (!customer) {
      throw new NotFoundException("Customer not found");
    }

    const invoices = await this.prisma.invoice.findMany({
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
    });

    return {
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
      invoices,
    };
  }

  // Get invoice PDF
  @Public()
  @Get("invoices/:invoiceNumber/pdf")
  async getInvoicePdf(
    @Param("invoiceNumber") invoiceNumber: string,
    @Query("phone") phone: string,
  ) {
    if (!phone) {
      throw new NotFoundException("Phone number is required");
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

    // Verify customer owns this invoice
    if (invoice.customer.phone !== phone) {
      throw new NotFoundException("Invoice not found");
    }

    return this.invoiceService.generatePdf(invoice.id, invoice.studioId);
  }

  // Get booking timeline/status updates
  @Public()
  @Get("bookings/:id/timeline")
  async getBookingTimeline(
    @Param("id") bookingId: string,
    @Query("phone") phone: string,
  ) {
    if (!phone) {
      throw new NotFoundException("Phone number is required");
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

    // Verify customer owns this booking
    if (booking.customer.phone !== phone) {
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
