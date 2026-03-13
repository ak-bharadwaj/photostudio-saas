import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import {
  SubscriptionTier,
  Prisma,
  StudioStatus,
  BillingModel,
  CommissionType,
} from '../../prisma/generated-client';
import {
  CreateAdminDto,
  AdminLoginDto,
  UpdateStudioDto,
  CreateStudioWithOwnerDto,
} from "./dto/admin.dto";
import { CacheService } from "../cache/cache.service";

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private cacheService: CacheService,
  ) {}

  // Admin Authentication
  async createAdmin(createAdminDto: CreateAdminDto) {
    const existingAdmin = await this.prisma.admin.findUnique({
      where: { email: createAdminDto.email },
    });

    if (existingAdmin) {
      throw new ConflictException("Admin with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(createAdminDto.password, 12);

    const admin = await this.prisma.admin.create({
      data: {
        email: createAdminDto.email,
        passwordHash: hashedPassword,
        name: createAdminDto.email.split("@")[0], // Default name from email
      },
    });

    const { passwordHash, ...result } = admin;
    return result;
  }

  async login(adminLoginDto: AdminLoginDto) {
    const admin = await this.prisma.admin.findUnique({
      where: { email: adminLoginDto.email },
    });

    if (!admin) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(
      adminLoginDto.password,
      admin.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const payload = {
      sub: admin.id,
      email: admin.email,
      type: "admin",
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: "15m" });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: "7d" });

    const { passwordHash: _, ...adminData } = admin;

    return {
      accessToken,
      refreshToken,
      admin: adminData,
    };
  }

  // Studio Onboarding (Admin creates studio + owner)
  async createStudioWithOwner(dto: CreateStudioWithOwnerDto) {
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
    const studio = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const newStudio = await tx.studio.create({
          data: {
            name: dto.studioName,
            slug: dto.slug,
            email: dto.studioEmail,
            phone: dto.studioPhone,
            subscriptionTier:
              (dto.subscriptionTier as SubscriptionTier) || "PRO",
            status: "TRIAL",
            brandingConfig: dto.brandingConfig || {},
            defaultTerms: dto.defaultTerms,
            subscriptionExpiresAt: new Date(
              Date.now() + (dto.subscriptionDurationDays || 14) * 24 * 60 * 60 * 1000,
            ), // custom duration or 14 days trial
          },
        });

        // Create owner user for the studio
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

    // Return the studio with the owner info
    return this.getStudioById(studio.id);
  }

  // Studio Management
  async getAllStudios(page = 1, limit = 20, status?: string, tier?: string, search?: string) {
    const skip = (page - 1) * limit;

    const where: Prisma.StudioWhereInput = {};
    if (status) where.status = status as StudioStatus;
    if (tier) where.subscriptionTier = tier as SubscriptionTier;
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [studios, total] = await Promise.all([
      this.prisma.studio.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              bookings: true,
              customers: true,
              users: true,
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

  async getStudioById(id: string) {
    const studio = await this.prisma.studio.findUnique({
      where: { id },
      include: {
        users: {
          take: 50,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            bookings: true,
            customers: true,
            services: true,
            invoices: true,
            users: true,
          },
        },
      },
    });

    if (!studio) {
      throw new NotFoundException("Studio not found");
    }

    return studio;
  }

  async updateStudio(id: string, updateStudioDto: UpdateStudioDto) {
    const studio = await this.prisma.studio.findUnique({
      where: { id },
    });

    if (!studio) {
      throw new NotFoundException("Studio not found");
    }

    const updateData: Prisma.StudioUpdateInput = {};
    if (updateStudioDto.name) updateData.name = updateStudioDto.name;
    
    if (updateStudioDto.slug && updateStudioDto.slug !== studio.slug) {
      const existing = await this.prisma.studio.findUnique({
        where: { slug: updateStudioDto.slug.toLowerCase() },
      });
      if (existing) {
        throw new ConflictException("Slug is already in use");
      }
      updateData.slug = updateStudioDto.slug.toLowerCase();
    }

    if (updateStudioDto.email) updateData.email = updateStudioDto.email;
    if (updateStudioDto.phone) updateData.phone = updateStudioDto.phone;
    if (updateStudioDto.status)
      updateData.status = updateStudioDto.status as StudioStatus;
    if (updateStudioDto.subscriptionTier)
      updateData.subscriptionTier =
        updateStudioDto.subscriptionTier as SubscriptionTier;
    if (updateStudioDto.subscriptionExpiresAt)
      updateData.subscriptionExpiresAt = new Date(updateStudioDto.subscriptionExpiresAt);
    if (updateStudioDto.isRecommended !== undefined)
      updateData.isRecommended = updateStudioDto.isRecommended;
    if (updateStudioDto.defaultTerms !== undefined)
      updateData.defaultTerms = updateStudioDto.defaultTerms;
    if (updateStudioDto.brandingConfig)
      updateData.brandingConfig = updateStudioDto.brandingConfig;
    if (updateStudioDto.billingModel)
      updateData.billingModel = updateStudioDto.billingModel as BillingModel;
    if (updateStudioDto.commissionRate !== undefined)
      updateData.commissionRate = updateStudioDto.commissionRate;
    if (updateStudioDto.commissionType)
      updateData.commissionType =
        updateStudioDto.commissionType as CommissionType;
    if (updateStudioDto.currency)
      updateData.currency = updateStudioDto.currency;
    if (updateStudioDto.subscriptionExpiresAt)
      updateData.subscriptionExpiresAt = new Date(
        updateStudioDto.subscriptionExpiresAt,
      );
    if (updateStudioDto.taxRate !== undefined)
      updateData.taxRate = updateStudioDto.taxRate;
    if (updateStudioDto.isRecommended !== undefined)
      updateData.isRecommended = updateStudioDto.isRecommended;

    // Handle slug change with uniqueness check
    if (updateStudioDto.slug && updateStudioDto.slug !== studio.slug) {
      const slugConflict = await this.prisma.studio.findUnique({
        where: { slug: updateStudioDto.slug },
      });
      if (slugConflict) {
        throw new ConflictException("Studio slug already exists");
      }
      updateData.slug = updateStudioDto.slug;
    }

    const updated = await this.prisma.studio.update({
      where: { id },
      data: updateData,
    });

    // Invalidate old slug cache (studio service + public portal)
    await this.cacheService.del(`studio:slug:${studio.slug}`);
    await this.cacheService.del(`public:studio:${studio.slug}`);

    // If slug changed, also bust any stale cache for the new slug
    if (updateStudioDto.slug && updateStudioDto.slug !== studio.slug) {
      await this.cacheService.del(`studio:slug:${updateStudioDto.slug}`);
      await this.cacheService.del(`public:studio:${updateStudioDto.slug}`);
    }

    return updated;
  }

  async suspendStudio(id: string, reason?: string) {
    const studio = await this.prisma.studio.findUnique({
      where: { id },
    });

    if (!studio) {
      throw new NotFoundException("Studio not found");
    }

    return this.prisma.studio.update({
      where: { id },
      data: {
        status: "SUSPENDED",
      },
    });
  }

  async activateStudio(id: string) {
    const studio = await this.prisma.studio.findUnique({
      where: { id },
    });

    if (!studio) {
      throw new NotFoundException("Studio not found");
    }

    return this.prisma.studio.update({
      where: { id },
      data: {
        status: "ACTIVE",
      },
    });
  }

  async deleteStudio(id: string) {
    const studio = await this.prisma.studio.findUnique({
      where: { id },
    });

    if (!studio) {
      throw new NotFoundException("Studio not found");
    }

    // Soft delete or hard delete based on requirements
    return this.prisma.studio.delete({
      where: { id },
    });
  }

  // Analytics
  async getPlatformAnalytics() {
    const [
      totalStudios,
      activeStudios,
      totalBookings,
      totalGMV,
      totalPlatformRevenue,
      tierDistribution,
    ] = await Promise.all([
      this.prisma.studio.count(),
      this.prisma.studio.count({ where: { status: "ACTIVE" } }),
      this.prisma.booking.count(),
      this.prisma.invoice.aggregate({
        where: { status: "PAID" },
        _sum: { total: true },
      }),
      this.prisma.commission.aggregate({
        _sum: { amount: true },
      }),
      this.prisma.studio.groupBy({
        by: ["subscriptionTier"],
        _count: true,
      }),
    ]);

    return {
      studios: {
        total: totalStudios,
        active: activeStudios,
        byTier: tierDistribution,
      },
      bookings: {
        total: totalBookings,
      },
      revenue: {
        totalGMV: totalGMV._sum?.total?.toNumber() || 0,
        platformRevenue: totalPlatformRevenue._sum?.amount?.toNumber() || 0,
      },
    };
  }

  async getRecentActivities(limit = 20) {
    const recentStudios = await this.prisma.studio.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        subscriptionTier: true,
        createdAt: true,
      },
    });

    const recentBookings = await this.prisma.booking.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        studio: {
          select: {
            name: true,
          },
        },
        customer: {
          select: {
            name: true,
          },
        },
      },
    });

    return {
      recentStudios,
      recentBookings,
    };
  }
}
