import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
  CreateInternalBookingDto,
  SendQuoteDto,
  AcceptQuoteDto,
} from "./dto/booking.dto";
import { BookingStatus } from "@prisma/client";

import { PdfService } from "../pdf/pdf.service";
import { UploadService } from "../upload/upload.service";

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private notificationService: NotificationService,
    private queueService: QueueService,
    private pdfService: PdfService,
    private uploadService: UploadService,
  ) {}
  async createInternal(dto: CreateInternalBookingDto, studioId: string) {
    const studio = await this.prisma.studio.findUnique({
      where: { id: studioId },
    });

    if (!studio) {
      throw new NotFoundException("Studio not found");
    }

    // Find service
    const service = await this.prisma.service.findFirst({
      where: {
        id: dto.serviceId,
        studioId: studio.id,
      },
    });

    if (!service) {
      throw new NotFoundException("Service not found");
    }

    // Find customer
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: dto.customerId,
        studioId: studio.id,
      },
    });

    if (!customer) {
      throw new NotFoundException("Customer not found");
    }

    // Check for schedule conflicts
    const scheduledAt = new Date(dto.scheduledDate);
    await this.checkConflicts(studio.id, scheduledAt, service.durationMinutes);

    // Create booking
    const booking = await this.prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          studioId: studio.id,
          customerId: customer.id,
          serviceId: service.id,
          scheduledAt,
          status: "CONFIRMED", // Internal bookings are usually confirmed
          customerNotes: dto.notes,
        },
        include: {
          customer: true,
          service: true,
          studio: true,
        },
      });

      await tx.bookingStatusLog.create({
        data: {
          bookingId: newBooking.id,
          status: "CONFIRMED",
          notes: "Booking created manually by staff",
        },
      });

      return newBooking;
    });

    await this.processStatusChangeSideEffects(
      booking,
      "CONFIRMED",
      "Booking created manually by staff",
    );
    return booking;
  }

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
    await this.checkConflicts(studio.id, scheduledAt, service.durationMinutes);

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
            defaultTerms: true,
            brandingConfig: true,
            billingModel: true,
            currency: true,
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
      const serviceId = dto.serviceId || booking.serviceId;
      const service = await this.prisma.service.findUnique({
        where: { id: serviceId },
      });
      await this.checkConflicts(
        booking.studioId,
        newDate,
        service?.durationMinutes || 60,
        id,
      );
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
        studio: true, // Need studio for notifications
        assignedTo: true,
      },
    });

    if (dto.status && dto.status !== booking.status) {
      await this.processStatusChangeSideEffects(updated, dto.status, dto.notes);
    } else {
      // Invalidate cache if status didn't change (if it did, side effects does it)
      await this.cacheService.del(`studio:${booking.studioId}:bookings`);
    }

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

      await tx.bookingStatusLog.create({
        data: {
          bookingId: id,
          status: dto.status,
          notes: dto.notes || `Status changed to ${dto.status}`,
        },
      });

      return updatedBooking;
    });

    await this.processStatusChangeSideEffects(updated, dto.status, dto.notes);
    return updated;
  }

  private async processStatusChangeSideEffects(
    booking: any,
    status: BookingStatus,
    notes?: string,
  ) {
    // Invalidate cache
    await this.cacheService.del(`studio:${booking.studioId}:bookings`);

    // Handle contract generation if confirmed
    if (status === "CONFIRMED") {
      try {
        const fullBooking = await this.findOne(booking.id, booking.studioId);

        const pdfBuffer = await this.pdfService.generateContractPdf({
          studioName: fullBooking.studio.name,
          studioEmail: fullBooking.studio.email,
          studioPhone: fullBooking.studio.phone,
          customerName: fullBooking.customer.name,
          customerEmail: fullBooking.customer.email || undefined,
          customerPhone: fullBooking.customer.phone,
          serviceName: fullBooking.service.name,
          serviceDescription: fullBooking.service.description || undefined,
          scheduledAt: fullBooking.scheduledAt,
          price: Number(fullBooking.service.price),
          terms: fullBooking.studio.defaultTerms || "Standard Terms Apply",
          bookingId: fullBooking.id,
          acceptedAt: new Date(),
        });

        const contractUrl = await this.uploadService.uploadContractPDF(
          booking.studioId,
          fullBooking.id,
          pdfBuffer,
        );

        await this.prisma.booking.update({
          where: { id: booking.id },
          data: { contractUrl },
        });

        this.logger.log(
          `Contract generated and uploaded for booking ${booking.id}`,
        );
      } catch (error: any) {
        this.logger.error("Failed to generate/upload contract:", error.stack);
      }
    }

    // Send status update email to customer
    if (booking.customer.email) {
      try {
        await this.notificationService.sendBookingStatusUpdate({
          to: booking.customer.email,
          customerName: booking.customer.name,
          studioName: booking.studio.name,
          serviceName: booking.service.name,
          scheduledDate: booking.scheduledAt,
          newStatus: status,
          notes: notes,
        });
      } catch (error: any) {
        this.logger.error("Failed to send status update email:", error.stack);
      }
    }

    // Schedule automated emails based on status change
    try {
      if (status === "CONFIRMED") {
        await this.queueService.scheduleBookingReminder(
          booking.id,
          booking.scheduledAt,
        );
        this.logger.log(
          `[Queue] Scheduled booking reminder for booking ${booking.id}`,
        );
      } else if (status === "COMPLETED") {
        await this.queueService.scheduleFollowUpEmail(booking.id);
        this.logger.log(
          `[Queue] Scheduled follow-up email for booking ${booking.id}`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        "[Queue] Failed to schedule automated email:",
        error.stack,
      );
    }
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

    await this.processStatusChangeSideEffects(cancelled, "CANCELLED", notes);
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

  async sendQuote(id: string, studioId: string, dto: SendQuoteDto) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, studioId },
    });

    if (!booking) throw new NotFoundException("Booking not found");

    const updated = await this.prisma.$transaction(async (tx) => {
      const b = await tx.booking.update({
        where: { id },
        data: {
          status: "QUOTED",
          quoteAmount: dto.amount,
          quoteNotes: dto.notes,
          quotedAt: new Date(),
        },
        include: { customer: true, studio: true, service: true },
      });

      await tx.bookingStatusLog.create({
        data: {
          bookingId: id,
          status: "QUOTED",
          notes: `Quote sent: $${dto.amount}. ${dto.notes || ""}`,
        },
      });

      return b;
    });

    await this.cacheService.del(`studio:${studioId}:bookings`);
    return updated;
  }

  async acceptQuote(id: string, userId: string) {
    // Find customer linked to this user
    const customer = await this.prisma.customer.findFirst({
      where: { globalUserId: userId },
    });
    if (!customer)
      throw new ForbiddenException("No customer record found for this user");

    const booking = await this.prisma.booking.findFirst({
      where: { id, customerId: customer.id },
    });

    if (!booking) throw new NotFoundException("Booking not found");
    if (booking.status !== "QUOTED")
      throw new BadRequestException("Only quoted bookings can be accepted");

    const updated = await this.prisma.$transaction(async (tx) => {
      const b = await tx.booking.update({
        where: { id },
        data: {
          status: "CONFIRMED",
          quoteAcceptedAt: new Date(),
        },
        include: { customer: true, studio: true, service: true },
      });

      await tx.bookingStatusLog.create({
        data: {
          bookingId: id,
          status: "CONFIRMED",
          notes: `Quote accepted by customer`,
        },
      });

      return b;
    });

    await this.processStatusChangeSideEffects(
      updated,
      "CONFIRMED",
      "Quote accepted by customer",
    );
    return updated;
  }

  async rejectQuote(id: string, userId: string, notes?: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { globalUserId: userId },
    });
    if (!customer)
      throw new ForbiddenException("No customer record found for this user");

    const booking = await this.prisma.booking.findFirst({
      where: { id, customerId: customer.id },
    });

    if (!booking) throw new NotFoundException("Booking not found");

    const updated = await this.prisma.$transaction(async (tx) => {
      const b = await tx.booking.update({
        where: { id },
        data: { status: "CANCELLED" },
        include: { customer: true, studio: true, service: true },
      });

      await tx.bookingStatusLog.create({
        data: {
          bookingId: id,
          status: "CANCELLED",
          notes: notes || `Quote rejected by customer`,
        },
      });

      return b;
    });

    await this.processStatusChangeSideEffects(
      updated,
      "CANCELLED",
      notes || "Quote rejected by customer",
    );
    return updated;
  }

  private async checkConflicts(
    studioId: string,
    scheduledAt: Date,
    durationMinutes: number,
    excludeBookingId?: string,
  ) {
    const endAt = new Date(scheduledAt.getTime() + durationMinutes * 60000);

    const conflictingBooking = await this.prisma.booking.findFirst({
      where: {
        studioId,
        status: {
          in: ["INQUIRY", "QUOTED", "CONFIRMED"],
        },
        id: excludeBookingId ? { not: excludeBookingId } : undefined,
        OR: [
          {
            scheduledAt: {
              gte: scheduledAt,
              lt: endAt,
            },
          },
          {
            // Simple check for potential overlaps
            scheduledAt: {
              lt: scheduledAt,
            },
          },
        ],
      },
      include: {
        service: true,
      },
    });

    if (conflictingBooking) {
      const conflictDuration = conflictingBooking.service.durationMinutes;
      const conflictEnd = new Date(
        conflictingBooking.scheduledAt.getTime() + conflictDuration * 60000,
      );

      const overlaps =
        scheduledAt < conflictEnd && endAt > conflictingBooking.scheduledAt;

      if (overlaps) {
        throw new ConflictException(
          "This time slot overlaps with an existing booking. Please choose another time.",
        );
      }
    }
  }
}
