import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../cache/cache.service";
import { NotificationService } from "../notification/notification.service";
import { QueueService } from "../queue/queue.service";
import {
  CreateBookingDto,
  UpdateBookingDto,
  UpdateBookingStatusDto,
} from "./dto/booking.dto";
import { BookingStatus } from "@prisma/client";

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private notificationService: NotificationService,
    private queueService: QueueService,
  ) {}

  async create(dto: CreateBookingDto) {
    // Find studio by slug
    const studio = await this.prisma.studio.findUnique({
      where: { slug: dto.studioSlug },
    });

    if (!studio) {
      throw new NotFoundException("Studio not found");
    }

    if (studio.status !== "ACTIVE") {
      throw new BadRequestException("Studio is not accepting bookings");
    }

    // Find service
    const service = await this.prisma.service.findFirst({
      where: {
        id: dto.serviceId,
        studioId: studio.id,
        isActive: true,
      },
    });

    if (!service) {
      throw new NotFoundException("Service not found or not available");
    }

    // Check for schedule conflicts
    const scheduledAt = new Date(dto.scheduledDate);
    const conflictingBooking = await this.prisma.booking.findFirst({
      where: {
        studioId: studio.id,
        scheduledAt,
        status: {
          in: ["INQUIRY", "QUOTED", "CONFIRMED"],
        },
      },
    });

    if (conflictingBooking) {
      throw new ConflictException(
        "This time slot is already booked. Please choose another time.",
      );
    }

    // Find or create customer
    let customer = await this.prisma.customer.findFirst({
      where: {
        email: dto.customerEmail,
        studioId: studio.id,
      },
    });

    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          name: dto.customerName,
          email: dto.customerEmail,
          phone: dto.customerPhone,
          studioId: studio.id,
        },
      });
    }

    // Create booking with status log in transaction
    const booking = await this.prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          studioId: studio.id,
          customerId: customer.id,
          serviceId: service.id,
          scheduledAt,
          status: "INQUIRY",
          customerNotes: dto.notes,
        },
        include: {
          customer: true,
          service: true,
          studio: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      // Create initial status log
      await tx.bookingStatusLog.create({
        data: {
          bookingId: newBooking.id,
          status: "INQUIRY",
          notes: "Booking inquiry received",
        },
      });

      return newBooking;
    });

    // Invalidate relevant caches
    await this.cacheService.del(`studio:${studio.id}:bookings`);

    // Send confirmation email to customer
    if (customer.email) {
      try {
        await this.notificationService.sendBookingConfirmation({
          to: customer.email,
          customerName: customer.name,
          studioName: studio.name,
          serviceName: service.name,
          scheduledDate: scheduledAt,
          studioEmail: studio.email,
          studioPhone: studio.phone,
          bookingId: booking.id,
        });
      } catch (error: any) {
        // Log error but don't fail the booking creation
        this.logger.error(
          "Failed to send booking confirmation email:",
          error.stack,
        );
      }
    }

    return booking;
  }

  async findAll(
    studioId: string,
    page: number = 1,
    limit: number = 10,
    status?: BookingStatus,
  ) {
    const skip = (page - 1) * limit;

    const where: any = { studioId };
    if (status) {
      where.status = status;
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: "desc" },
        include: {
          customer: true,
          service: true,
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data: bookings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, studioId?: string) {
    const where: any = { id };
    if (studioId) {
      where.studioId = studioId;
    }

    const booking = await this.prisma.booking.findFirst({
      where,
      include: {
        customer: true,
        service: true,
        studio: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        invoices: true,
        statusLogs: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    return booking;
  }

  async update(id: string, dto: UpdateBookingDto, studioId?: string) {
    const where: any = { id };
    if (studioId) {
      where.studioId = studioId;
    }

    const booking = await this.prisma.booking.findFirst({ where });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    // If changing scheduled date, check for conflicts
    if (dto.scheduledDate) {
      const newDate = new Date(dto.scheduledDate);
      const conflict = await this.prisma.booking.findFirst({
        where: {
          studioId: booking.studioId,
          scheduledAt: newDate,
          status: {
            in: ["INQUIRY", "QUOTED", "CONFIRMED"],
          },
          id: {
            not: id,
          },
        },
      });

      if (conflict) {
        throw new ConflictException("This time slot is already booked");
      }
    }

    // Map DTO fields to correct Prisma fields
    const updateData: any = {};
    if (dto.status) updateData.status = dto.status;
    if (dto.scheduledDate) updateData.scheduledAt = new Date(dto.scheduledDate);
    if (dto.assignedTo) updateData.assignedToUserId = dto.assignedTo;
    if (dto.notes) updateData.internalNotes = dto.notes;

    const updated = await this.prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        service: true,
        assignedTo: true,
      },
    });

    // Invalidate cache
    await this.cacheService.del(`studio:${booking.studioId}:bookings`);

    return updated;
  }

  async updateStatus(
    id: string,
    dto: UpdateBookingStatusDto,
    studioId?: string,
  ) {
    const where: any = { id };
    if (studioId) {
      where.studioId = studioId;
    }

    const booking = await this.prisma.booking.findFirst({ where });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    // Update booking and create status log in transaction
    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedBooking = await tx.booking.update({
        where: { id },
        data: { status: dto.status },
        include: {
          customer: true,
          service: true,
          studio: true,
        },
      });

      // Create status log
      await tx.bookingStatusLog.create({
        data: {
          bookingId: id,
          status: dto.status,
          notes: dto.notes || `Status changed to ${dto.status}`,
        },
      });

      return updatedBooking;
    });

    // Invalidate cache
    await this.cacheService.del(`studio:${booking.studioId}:bookings`);

    // Send status update email to customer
    if (updated.customer.email) {
      try {
        await this.notificationService.sendBookingStatusUpdate({
          to: updated.customer.email,
          customerName: updated.customer.name,
          studioName: updated.studio.name,
          serviceName: updated.service.name,
          scheduledDate: updated.scheduledAt,
          newStatus: dto.status,
          notes: dto.notes,
        });
      } catch (error: any) {
        this.logger.error("Failed to send status update email:", error.stack);
      }
    }

    // Schedule automated emails based on status change
    try {
      if (dto.status === "CONFIRMED") {
        // Schedule reminder email for 1 day before the booking
        await this.queueService.scheduleBookingReminder(
          updated.id,
          updated.scheduledAt,
        );
        this.logger.log(`[Queue] Scheduled booking reminder for booking ${id}`);
      } else if (dto.status === "COMPLETED") {
        // Schedule follow-up email for 1 day after completion
        await this.queueService.scheduleFollowUpEmail(updated.id);
        this.logger.log(`[Queue] Scheduled follow-up email for booking ${id}`);
      }
    } catch (error: any) {
      // Log error but don't fail the status update
      this.logger.error(
        "[Queue] Failed to schedule automated email:",
        error.stack,
      );
    }

    return updated;
  }

  async cancel(id: string, notes?: string, studioId?: string) {
    const where: any = { id };
    if (studioId) {
      where.studioId = studioId;
    }

    const booking = await this.prisma.booking.findFirst({ where });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    if (booking.status === "COMPLETED" || booking.status === "CANCELLED") {
      throw new BadRequestException(
        `Cannot cancel a ${booking.status.toLowerCase()} booking`,
      );
    }

    const cancelled = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data: { status: "CANCELLED" },
        include: {
          customer: true,
          service: true,
          studio: true,
        },
      });

      await tx.bookingStatusLog.create({
        data: {
          bookingId: id,
          status: "CANCELLED",
          notes: notes || "Booking cancelled",
        },
      });

      return updated;
    });

    // Invalidate cache
    await this.cacheService.del(`studio:${booking.studioId}:bookings`);

    return cancelled;
  }

  async getUpcoming(studioId: string, limit: number = 10) {
    return this.prisma.booking.findMany({
      where: {
        studioId,
        scheduledAt: {
          gte: new Date(),
        },
        status: {
          in: ["INQUIRY", "QUOTED", "CONFIRMED"],
        },
      },
      take: limit,
      orderBy: { scheduledAt: "asc" },
      include: {
        customer: true,
        service: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }
}
