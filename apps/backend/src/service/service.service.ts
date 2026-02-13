import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../cache/cache.service";
import { CreateServiceDto, UpdateServiceDto } from "./dto/service.dto";

@Injectable()
export class ServiceService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  async create(dto: CreateServiceDto, studioId: string) {
    const service = await this.prisma.service.create({
      data: {
        ...dto,
        studioId,
      },
    });

    // Invalidate studio cache
    await this.invalidateStudioCache(studioId);

    return service;
  }

  async findAll(studioId: string, includeInactive: boolean = false) {
    // Try to get from cache first
    const cacheKey = `services:studio:${studioId}:${includeInactive ? "all" : "active"}`;
    const cached = await this.cacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    const where: any = { studioId };
    if (!includeInactive) {
      where.isActive = true;
    }

    const services = await this.prisma.service.findMany({
      where,
      orderBy: { sortOrder: "asc" },
      include: {
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, services, 300);

    return services;
  }

  async findOne(id: string, studioId: string) {
    const service = await this.prisma.service.findFirst({
      where: {
        id,
        studioId,
      },
      include: {
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    if (!service) {
      throw new NotFoundException("Service not found");
    }

    return service;
  }

  async update(id: string, dto: UpdateServiceDto, studioId: string) {
    const service = await this.prisma.service.findFirst({
      where: {
        id,
        studioId,
      },
    });

    if (!service) {
      throw new NotFoundException("Service not found");
    }

    const updated = await this.prisma.service.update({
      where: { id },
      data: dto,
    });

    // Invalidate studio cache
    await this.invalidateStudioCache(studioId);

    return updated;
  }

  async remove(id: string, studioId: string) {
    const service = await this.prisma.service.findFirst({
      where: {
        id,
        studioId,
      },
      include: {
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    if (!service) {
      throw new NotFoundException("Service not found");
    }

    // Check if service has any bookings
    if (service._count.bookings > 0) {
      throw new BadRequestException(
        "Cannot delete service with existing bookings. Consider deactivating it instead.",
      );
    }

    await this.prisma.service.delete({
      where: { id },
    });

    // Invalidate studio cache
    await this.invalidateStudioCache(studioId);

    return { message: "Service deleted successfully" };
  }

  async reorder(studioId: string, serviceIds: string[]) {
    // Verify all services belong to this studio
    const services = await this.prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        studioId,
      },
    });

    if (services.length !== serviceIds.length) {
      throw new BadRequestException(
        "Some services do not belong to this studio",
      );
    }

    // Update sort order for each service
    const updates = serviceIds.map((id, index) =>
      this.prisma.service.update({
        where: { id },
        data: { sortOrder: index },
      }),
    );

    await this.prisma.$transaction(updates);

    // Invalidate studio cache
    await this.invalidateStudioCache(studioId);

    return { message: "Services reordered successfully" };
  }

  async toggleActive(id: string, studioId: string) {
    const service = await this.prisma.service.findFirst({
      where: {
        id,
        studioId,
      },
    });

    if (!service) {
      throw new NotFoundException("Service not found");
    }

    const updated = await this.prisma.service.update({
      where: { id },
      data: { isActive: !service.isActive },
    });

    // Invalidate studio cache
    await this.invalidateStudioCache(studioId);

    return updated;
  }

  async getStats(id: string, studioId: string) {
    const service = await this.prisma.service.findFirst({
      where: {
        id,
        studioId,
      },
    });

    if (!service) {
      throw new NotFoundException("Service not found");
    }

    const [totalBookings, completedBookings, upcomingBookings] =
      await Promise.all([
        this.prisma.booking.count({
          where: {
            serviceId: id,
            studioId,
          },
        }),
        this.prisma.booking.count({
          where: {
            serviceId: id,
            studioId,
            status: "COMPLETED",
          },
        }),
        this.prisma.booking.count({
          where: {
            serviceId: id,
            studioId,
            status: {
              in: ["INQUIRY", "QUOTED", "CONFIRMED"],
            },
            scheduledAt: {
              gte: new Date(),
            },
          },
        }),
      ]);

    return {
      totalBookings,
      completedBookings,
      upcomingBookings,
    };
  }

  private async invalidateStudioCache(studioId: string) {
    const studio = await this.prisma.studio.findUnique({
      where: { id: studioId },
      select: { slug: true },
    });

    if (studio) {
      await this.cacheService.del(`studio:slug:${studio.slug}`);
    }

    // Also invalidate services cache
    await this.cacheService.del(`services:studio:${studioId}:all`);
    await this.cacheService.del(`services:studio:${studioId}:active`);
  }
}
