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
} from "@nestjs/common";
import { IsString, IsOptional, MaxLength, MinLength } from "class-validator";
import { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { BookingService } from "../booking/booking.service";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { UserRole, Prisma } from "@prisma/client";
import { UserPayload } from "../common/interfaces/user-payload.interface";

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
  async updateMe(@Req() req: Request & { user: UserPayload }, @Body() dto: UpdatePortalMeDto) {
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
  async acceptQuote(@Param("id") id: string, @Req() req: Request & { user: UserPayload }) {
    return this.bookingService.acceptQuote(id, req.user.id);
  }

  @Post("bookings/:id/reject-quote")
  async rejectQuote(
    @Param("id") id: string,
    @Req() req: Request & { user: UserPayload },
    @Body() body: { notes?: string },
  ) {
    return this.bookingService.rejectQuote(id, req.user.id, body.notes);
  }
}
