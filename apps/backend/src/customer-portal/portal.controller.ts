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
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { BookingService } from "../booking/booking.service";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { UserRole } from "@prisma/client";

@Controller("portal")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class PortalController {
  constructor(
    private prisma: PrismaService,
    private bookingService: BookingService,
  ) {}

  @Get("me")
  async getMe(@Req() req: any) {
    return this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });
  }

  @Patch("me")
  async updateMe(
    @Req() req: any,
    @Body() data: { name?: string; email?: string },
  ) {
    return this.prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: data.name,
        email: data.email,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });
  }

  @Get("bookings")
  async getMyBookings(
    @Req() req: any,
    @Query("studioSlug") studioSlug?: string,
  ) {
    const userId = req.user.id;

    const where: any = { globalUserId: userId };
    if (studioSlug) {
      where.studio = { slug: studioSlug };
    }

    // Find all studio-specific customer records linked to this global user
    const customerRecords = await this.prisma.customer.findMany({
      where,
      select: { id: true },
    });

    const customerIds = customerRecords.map((c) => c.id);

    // Get all bookings from all studios for these customer IDs
    return this.prisma.booking.findMany({
      where: {
        customerId: { in: customerIds },
        ...(studioSlug ? { studio: { slug: studioSlug } } : {}),
      },
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
      },
      orderBy: { scheduledAt: "desc" },
    });
  }

  @Get("invoices")
  async getMyInvoices(
    @Req() req: any,
    @Query("studioSlug") studioSlug?: string,
  ) {
    const userId = req.user.id;

    const where: any = { globalUserId: userId };
    if (studioSlug) {
      where.studio = { slug: studioSlug };
    }

    const customerRecords = await this.prisma.customer.findMany({
      where,
      select: { id: true },
    });

    const customerIds = customerRecords.map((c) => c.id);

    return this.prisma.invoice.findMany({
      where: {
        customerId: { in: customerIds },
        ...(studioSlug ? { studio: { slug: studioSlug } } : {}),
      },
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
    });
  }

  @Get("studios")
  async getMyStudios(@Req() req: any) {
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

    // Unique studios
    const studios = Array.from(
      new Map(customerRecords.map((c) => [c.studio.id, c.studio])).values(),
    );

    return studios;
  }

  @Post("bookings/:id/accept-quote")
  async acceptQuote(@Param("id") id: string, @Req() req: any) {
    return this.bookingService.acceptQuote(id, req.user.id);
  }

  @Post("bookings/:id/reject-quote")
  async rejectQuote(
    @Param("id") id: string,
    @Req() req: any,
    @Body() body: { notes?: string },
  ) {
    return this.bookingService.rejectQuote(id, req.user.id, body.notes);
  }
}
