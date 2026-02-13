import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../cache/cache.service";
import { NotificationService } from "../notification/notification.service";
import { CreateStudioDto, UpdateStudioDto } from "./dto/studio.dto";
import * as bcrypt from "bcrypt";

@Injectable()
export class StudioService {
  private readonly logger = new Logger(StudioService.name);

  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private notificationService: NotificationService,
  ) {}

  async create(dto: CreateStudioDto) {
    // Check if slug is already taken
    const existingStudio = await this.prisma.studio.findUnique({
      where: { slug: dto.slug },
    });

    if (existingStudio) {
      throw new ConflictException("Studio slug already exists");
    }

    // Check if owner email is already in use
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.ownerEmail },
    });

    if (existingUser) {
      throw new ConflictException("Owner email already in use");
    }

    // Hash owner password
    const passwordHash = await bcrypt.hash(dto.ownerPassword, 12);

    // Create studio with owner in a transaction
    const studio = await this.prisma.$transaction(async (tx) => {
      const newStudio = await tx.studio.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          email: dto.email,
          phone: dto.phone,
          logoUrl: dto.logoUrl,
          brandingConfig: dto.brandingConfig,
          subscriptionTier: dto.subscriptionTier || "STARTER",
          status: dto.status || "TRIAL",
          subscriptionExpiresAt: new Date(
            Date.now() + 14 * 24 * 60 * 60 * 1000,
          ), // 14 days trial
        },
      });

      // Create owner user
      await tx.user.create({
        data: {
          email: dto.ownerEmail,
          name: dto.ownerName,
          passwordHash,
          studioId: newStudio.id,
          role: "OWNER",
          isActive: true,
        },
      });

      return newStudio;
    });

    // Cache the studio
    await this.cacheService.set(`studio:slug:${studio.slug}`, studio, 3600);

    // Send welcome email to studio owner
    try {
      await this.notificationService.sendStudioWelcome(
        dto.ownerEmail,
        studio.name,
        dto.ownerName,
        studio.slug,
      );
    } catch (error: any) {
      // Log error but don't fail the studio creation
      this.logger.error("Failed to send welcome email:", error.stack);
    }

    return studio;
  }

  async findAll(page: number = 1, limit: number = 10, status?: string) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [studios, total] = await Promise.all([
      this.prisma.studio.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              users: true,
              bookings: true,
              invoices: true,
            },
          },
        },
      }),
      this.prisma.studio.count({ where }),
    ]);

    return {
      data: studios,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const studio = await this.prisma.studio.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            customers: true,
            services: true,
            bookings: true,
            invoices: true,
            portfolioItems: true,
          },
        },
      },
    });

    if (!studio) {
      throw new NotFoundException("Studio not found");
    }

    return studio;
  }

  async findBySlug(slug: string) {
    // Try to get from cache first
    const cached = await this.cacheService.get(`studio:slug:${slug}`);
    if (cached) {
      return cached;
    }

    const studio = await this.prisma.studio.findUnique({
      where: { slug },
      include: {
        services: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
        portfolioItems: {
          where: { isVisible: true },
          orderBy: { sortOrder: "asc" },
          take: 12,
        },
      },
    });

    if (!studio) {
      throw new NotFoundException("Studio not found");
    }

    // Cache for 1 hour
    await this.cacheService.set(`studio:slug:${slug}`, studio, 3600);

    return studio;
  }

  async update(id: string, dto: UpdateStudioDto) {
    const studio = await this.prisma.studio.findUnique({
      where: { id },
    });

    if (!studio) {
      throw new NotFoundException("Studio not found");
    }

    const updated = await this.prisma.studio.update({
      where: { id },
      data: dto,
    });

    // Invalidate cache
    await this.cacheService.del(`studio:slug:${studio.slug}`);

    return updated;
  }

  async remove(id: string) {
    const studio = await this.prisma.studio.findUnique({
      where: { id },
    });

    if (!studio) {
      throw new NotFoundException("Studio not found");
    }

    await this.prisma.studio.delete({
      where: { id },
    });

    // Invalidate cache
    await this.cacheService.del(`studio:slug:${studio.slug}`);

    return { message: "Studio deleted successfully" };
  }

  async suspend(id: string) {
    return this.updateStatus(id, "SUSPENDED");
  }

  async activate(id: string) {
    return this.updateStatus(id, "ACTIVE");
  }

  private async updateStatus(id: string, status: any) {
    const studio = await this.prisma.studio.findUnique({
      where: { id },
    });

    if (!studio) {
      throw new NotFoundException("Studio not found");
    }

    const updated = await this.prisma.studio.update({
      where: { id },
      data: { status },
    });

    // Invalidate cache
    await this.cacheService.del(`studio:slug:${studio.slug}`);

    return updated;
  }

  async getStats(id: string) {
    const studio = await this.prisma.studio.findUnique({
      where: { id },
    });

    if (!studio) {
      throw new NotFoundException("Studio not found");
    }

    const [
      totalBookings,
      totalCustomers,
      totalInvoices,
      totalRevenue,
      recentBookings,
    ] = await Promise.all([
      this.prisma.booking.count({
        where: { studioId: id },
      }),
      this.prisma.customer.count({
        where: { studioId: id },
      }),
      this.prisma.invoice.count({
        where: { studioId: id },
      }),
      this.prisma.invoice.aggregate({
        where: {
          studioId: id,
          status: "PAID",
        },
        _sum: {
          total: true,
        },
      }),
      this.prisma.booking.findMany({
        where: { studioId: id },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          customer: true,
          service: true,
        },
      }),
    ]);

    return {
      totalBookings,
      totalCustomers,
      totalInvoices,
      totalRevenue: totalRevenue._sum.total || 0,
      recentBookings,
    };
  }
}
