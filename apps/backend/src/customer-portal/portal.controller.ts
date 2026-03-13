import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { IsString, IsOptional, MaxLength, MinLength } from "class-validator";
import { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { BookingService } from "../booking/booking.service";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { UserRole, Prisma, BookingStatus } from '../generated/prisma-client';
import { UserPayload } from "../common/interfaces/user-payload.interface";
import { InvoiceService } from "../invoice/invoice.service";

class UpdatePortalMeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  // Email is intentionally read-only — login identity cannot be changed.
  // If someone sends it we ignore it silently.
}

@Controller("portal")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class PortalController {
  constructor(
    private prisma: PrismaService,
    private bookingService: BookingService,
    private invoiceService: InvoiceService,
  ) {}

  @Get("me")
  async getMe(@Req() req: Request & { user: UserPayload }) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return user;
  }

  @Patch("me")
  async updateMe(
    @Req() req: Request & { user: UserPayload },
    @Body() dto: UpdatePortalMeDto,
  ) {
    try {
      return await this.prisma.user.update({
        where: { id: req.user.id },
        data: {
          // Only name is updatable — email is the login identity and must not change
          ...(dto.name !== undefined ? { name: dto.name } : {}),
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });
    } catch (err: unknown) {
      // P2025 = record not found (user deleted after token issuance)
      if (
        err instanceof Error &&
        "code" in err &&
        (err as { code: string }).code === "P2025"
      ) {
        throw new NotFoundException("User not found");
      }
      throw err;
    }
  }

  @Get("bookings")
  async getMyBookings(
    @Req() req: Request & { user: UserPayload },
    @Query("studioSlug") studioSlug?: string,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    const userId = req.user.id;
    const safeLimit = Math.min(limit, 100); // cap at 100 per page
    const skip = (page - 1) * safeLimit;

    const customerWhere: Prisma.CustomerWhereInput = { globalUserId: userId };
    if (studioSlug) {
      customerWhere.studio = { slug: studioSlug };
    }

    // Find all studio-specific customer records linked to this global user
    const customerRecords = await this.prisma.customer.findMany({
      where: customerWhere,
      select: { id: true },
    });

    const customerIds = customerRecords.map((c: { id: string }) => c.id);

    const bookingWhere: Prisma.BookingWhereInput = {
      customerId: { in: customerIds },
      ...(studioSlug ? { studio: { slug: studioSlug } } : {}),
    };

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: bookingWhere,
        include: {
          service: true,
          studio: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
            },
          },
          review: {
            select: {
              id: true,
              rating: true,
              comment: true,
            },
          },
        },
        orderBy: { scheduledAt: "desc" },
        skip,
        take: safeLimit,
      }),
      this.prisma.booking.count({ where: bookingWhere }),
    ]);

    return {
      data: bookings,
      meta: {
        total,
        page,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  @Get("bookings/:id")
  async getOneBooking(
    @Param("id") id: string,
    @Req() req: Request & { user: UserPayload },
  ) {
    const userId = req.user.id;
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        service: true,
        studio: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            email: true,
            phone: true,
          },
        },
        customer: {
          select: {
            id: true,
            globalUserId: true,
          },
        },
        statusLogs: {
          orderBy: { createdAt: "desc" },
        },
        review: true,
      },
    });

    if (!booking || booking.customer.globalUserId !== userId) {
      throw new NotFoundException("Booking not found");
    }

    return booking;
  }

  @Get("invoices")
  async getMyInvoices(
    @Req() req: Request & { user: UserPayload },
    @Query("studioSlug") studioSlug?: string,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    const userId = req.user.id;
    const safeLimit = Math.min(limit, 100);
    const skip = (page - 1) * safeLimit;

    const customerWhere: Prisma.CustomerWhereInput = { globalUserId: userId };
    if (studioSlug) {
      customerWhere.studio = { slug: studioSlug };
    }

    const customerRecords = await this.prisma.customer.findMany({
      where: customerWhere,
      select: { id: true },
    });

    const customerIds = customerRecords.map((c: { id: string }) => c.id);

    const invoiceWhere: Prisma.InvoiceWhereInput = {
      customerId: { in: customerIds },
      ...(studioSlug ? { studio: { slug: studioSlug } } : {}),
    };

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where: invoiceWhere,
        include: {
          payments: true,
          studio: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: safeLimit,
      }),
      this.prisma.invoice.count({ where: invoiceWhere }),
    ]);

    return {
      data: invoices,
      meta: {
        total,
        page,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  @Get("invoices/:id")
  async getOneInvoice(
    @Param("id") id: string,
    @Req() req: Request & { user: UserPayload },
  ) {
    const userId = req.user.id;
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        payments: {
          orderBy: { paidAt: "desc" },
        },
        studio: {
          select: {
            id: true,
            name: true,
            slug: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            globalUserId: true,
          },
        },
        booking: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!invoice || invoice.customer.globalUserId !== userId) {
      throw new NotFoundException("Invoice not found");
    }

    return invoice;
  }

  @Get("invoices/:id/pdf")
  async getInvoicePdf(
    @Param("id") id: string,
    @Req() req: Request & { user: UserPayload },
  ) {
    const userId = req.user.id;
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!invoice || invoice.customer.globalUserId !== userId) {
      throw new NotFoundException("Invoice not found");
    }

    return this.invoiceService.generatePdf(invoice.id, invoice.studioId);
  }

  @Get("studios")
  async getMyStudios(@Req() req: Request & { user: UserPayload }) {
    const userId = req.user.id;

    const customerRecords = await this.prisma.customer.findMany({
      where: { globalUserId: userId },
      include: {
        studio: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            brandingConfig: true,
          },
        },
      },
    });

    // Unique studios (filter out any records where studio is null)
    const studios = Array.from(
      new Map(
        customerRecords
          .filter((c: { studio: { id: string } | null }) => c.studio != null)
          .map((c: { studio: { id: string } }) => [c.studio.id, c.studio]),
      ).values(),
    );

    return studios;
  }

  @Post("bookings/:id/accept-quote")
  async acceptQuote(
    @Param("id") id: string,
    @Req() req: Request & { user: UserPayload },
  ) {
    return this.bookingService.acceptQuote(id, req.user.id);
  }

  @Post("bookings/:id/reject-quote")
  async rejectQuote(
    @Param("id") id: string,
    @Req() req: Request & { user: UserPayload },
    @Body() body: { notes?: string },
  ) {
    return this.bookingService.rejectQuote(
      id,
      req.user.id,
      body.notes || "Quote rejected by customer",
    );
  }

  @Post("bookings/:id/negotiate")
  async negotiateQuote(
    @Param("id") id: string,
    @Req() req: Request & { user: UserPayload },
    @Body() body: { notes: string },
  ) {
    return this.bookingService.negotiateQuote(id, req.user.id, body.notes);
  }

  @Post("bookings/:id/review")
  async createReview(
    @Param("id") bookingId: string,
    @Req() req: Request & { user: UserPayload },
    @Body() body: { rating: number; comment?: string },
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { customer: true },
    });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException("Can only review completed bookings");
    }

    // Verify booking belongs to this global user
    if (booking.customer.globalUserId !== req.user.id) {
      throw new BadRequestException("Unauthorized access to this booking");
    }

    const existingReview = await this.prisma.review.findUnique({
      where: { bookingId: booking.id },
    });

    if (existingReview) {
      throw new BadRequestException("This session has already been reviewed.");
    }

    return this.prisma.review.create({
      data: {
        rating: body.rating,
        comment: body.comment,
        bookingId: booking.id,
        studioId: booking.studioId,
        customerId: booking.customerId,
      },
    });
  }
}
