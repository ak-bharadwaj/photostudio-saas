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
import { StudioStatus, Prisma, SubscriptionTier } from "@prisma/client";
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
      throw new ConflictException("Partner slug already exists");
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
    const studio = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const newStudio = await tx.studio.create({
          data: {
            name: dto.name,
            slug: dto.slug,
            email: dto.email,
            phone: dto.phone,
            logoUrl: dto.logoUrl,
            brandingConfig: dto.brandingConfig as
              | Prisma.InputJsonValue
              | undefined,
            subscriptionTier:
              (dto.subscriptionTier as unknown as SubscriptionTier) ||
              ("PRO" as unknown as SubscriptionTier),
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
      },
    );

    // Cache the studio (non-critical — failure must not block studio creation)
    try {
      await this.cacheService.set(`studio:slug:${studio.slug}`, studio, 3600);
    } catch (cacheErr: unknown) {
      this.logger.error(
        `Failed to cache studio ${studio.id}: ${cacheErr instanceof Error ? cacheErr.message : String(cacheErr)}`,
      );
    }

    // Send welcome email to partner owner
    try {
      await this.notificationService.sendStudioWelcome(
        dto.ownerEmail,
        studio.name,
        dto.ownerName,
        studio.slug,
      );
    } catch (error: unknown) {
      // Log error but don't fail the partner creation
      this.logger.error(
        "Failed to send welcome email:",
        error instanceof Error ? error.stack : String(error),
      );
    }

    return studio;
  }

  async findAll(page: number = 1, limit: number = 1000, status?: string) {
    const skip = (page - 1) * limit;

    const where: Prisma.StudioWhereInput = {};
    if (status) {
      where.status = status as StudioStatus;
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
      throw new NotFoundException("Partner not found");
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
      throw new NotFoundException("Partner not found");
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
      throw new NotFoundException("Partner not found");
    }

    // Check if new slug is taken
    if (dto.slug && dto.slug !== studio.slug) {
      const existing = await this.prisma.studio.findUnique({
        where: { slug: dto.slug },
      });
      if (existing) {
        throw new ConflictException("Partner slug already exists");
      }
    }

    // Deep-merge brandingConfig so partial updates don't wipe existing fields
    let mergedBrandingConfig: Prisma.InputJsonValue | undefined = undefined;
    if (dto.brandingConfig !== undefined) {
      const existing =
        studio.brandingConfig && typeof studio.brandingConfig === "object"
          ? (studio.brandingConfig as Record<string, unknown>)
          : {};
      mergedBrandingConfig = {
        ...existing,
        ...(dto.brandingConfig as Record<string, unknown>),
      } as Prisma.InputJsonValue;
    }

    // Exclude brandingConfig from the spread to avoid overwriting with unmerged value
    const { brandingConfig: _bc, ...restDto } = dto;

    const updated = await this.prisma.studio.update({
      where: { id },
      data: {
        ...restDto,
        ...(mergedBrandingConfig !== undefined && {
          brandingConfig: mergedBrandingConfig,
        }),
      },
    });

    // Invalidate old slug cache (studio service + public portal)
    await this.cacheService.del(`studio:slug:${studio.slug}`);
    await this.cacheService.del(`public:studio:${studio.slug}`);

    // If slug changed, also bust any stale cache for the new slug
    if (dto.slug && dto.slug !== studio.slug) {
      await this.cacheService.del(`studio:slug:${dto.slug}`);
      await this.cacheService.del(`public:studio:${dto.slug}`);
    }

    return updated;
  }

  async remove(id: string) {
    const studio = await this.prisma.studio.findUnique({
      where: { id },
    });

    if (!studio) {
      throw new NotFoundException("Partner not found");
    }

    await this.prisma.studio.delete({
      where: { id },
    });

    // Invalidate cache
    await this.cacheService.del(`studio:slug:${studio.slug}`);
    await this.cacheService.del(`public:studio:${studio.slug}`);

    return { message: "Partner deleted successfully" };
  }

  async suspend(id: string) {
    return this.updateStatus(id, StudioStatus.SUSPENDED);
  }

  async activate(id: string) {
    return this.updateStatus(id, StudioStatus.ACTIVE);
  }

  private async updateStatus(id: string, status: StudioStatus) {
    const studio = await this.prisma.studio.findUnique({
      where: { id },
    });

    if (!studio) {
      throw new NotFoundException("Partner not found");
    }

    const updated = await this.prisma.studio.update({
      where: { id },
      data: { status },
    });

    // Invalidate cache
    await this.cacheService.del(`studio:slug:${studio.slug}`);
    await this.cacheService.del(`public:studio:${studio.slug}`);

    return updated;
  }

  async getStats(id: string) {
    const studio = await this.prisma.studio.findUnique({
      where: { id },
    });

    if (!studio) {
      throw new NotFoundException("Partner not found");
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
