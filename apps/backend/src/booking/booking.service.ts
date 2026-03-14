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
} from "./dto/booking.dto";
import { BookingStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

import { InvoiceService } from "../invoice/invoice.service";
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
    private invoiceService: InvoiceService,
  ) {}
  async createInternal(dto: CreateInternalBookingDto, studioId: string) {
    const studio = await this.prisma.studio.findUnique({
      where: { id: studioId },
    });

    if (!studio) {
      throw new NotFoundException("Studio not found");
    }

    if (studio.status !== "ACTIVE" && studio.status !== "TRIAL") {
      throw new BadRequestException("Studio is not accepting bookings");
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
    if (isNaN(scheduledAt.getTime())) {
      throw new BadRequestException("Invalid scheduled date");
    }
    await this.checkConflicts(studio.id, scheduledAt, service.durationMinutes);

    // Create booking
    const booking = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
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
      },
    );

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

    // Normalize phone number (digits only, last 10 digits for local matching if needed, but here we just take all digits)
    const normalizedPhone = dto.customerPhone.replace(/\D/g, '');
    const searchPhone = normalizedPhone.length >= 10 ? normalizedPhone.slice(-10) : normalizedPhone;

    // Find or create customer AND create booking atomically inside one transaction.
    const booking = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        let customer = null;
        // SMART MERGE: Independently search by email and phone to handle cross-matches
        const byEmail = dto.customerEmail ? await tx.customer.findFirst({
          where: { studioId: studio.id, email: { equals: dto.customerEmail, mode: 'insensitive' } }
        }) : null;
        
        const byPhone = await tx.customer.findFirst({
          where: { studioId: studio.id, phone: { contains: searchPhone } }
        });

        if (byEmail && byPhone && byEmail.id !== byPhone.id) {
          // If both match different records, merge the 'phone' record into the 'email' record
          await tx.booking.updateMany({ where: { customerId: byPhone.id }, data: { customerId: byEmail.id } });
          await tx.invoice.updateMany({ where: { customerId: byPhone.id }, data: { customerId: byEmail.id } });
          await tx.review.updateMany({ where: { customerId: byPhone.id }, data: { customerId: byEmail.id } });
          await tx.customer.delete({ where: { id: byPhone.id } });
          customer = byEmail;
        } else {
          customer = byEmail || byPhone;
        }

        if (!customer) {
          customer = await tx.customer.create({
            data: {
              name: dto.customerName,
              email: dto.customerEmail,
              phone: dto.customerPhone,
              studioId: studio.id,
            },
          });
        } else {
          // Update existing customer info
          customer = await tx.customer.update({
            where: { id: customer.id },
            data: { 
              name: dto.customerName, 
              email: dto.customerEmail || customer.email,
              phone: dto.customerPhone 
            },
          });
        }

        // Check if there's a global user with this email or phone
        if (!customer.globalUserId) {
          const globalUser = await tx.user.findFirst({
            where: {
              OR: [
                ...(dto.customerEmail ? [{ email: dto.customerEmail }] : []),
                { phone: dto.customerPhone },
              ],
              role: "CUSTOMER",
            },
          });
          if (globalUser) {
            customer = await tx.customer.update({
              where: { id: customer.id },
              data: { globalUserId: globalUser.id },
            });
          }
        }

        // Create booking with status log in transaction
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
      },
    );

    // Invalidate relevant caches
    await this.cacheService.del(`studio:${studio.id}:bookings`);

    // Send confirmation email to customer
    if (booking.customer.email) {
      try {
        await this.notificationService.sendBookingConfirmation({
          to: booking.customer.email,
          customerName: booking.customer.name,
          studioName: studio.name,
          serviceName: service.name,
          scheduledDate: scheduledAt,
          studioEmail: studio.email,
          studioPhone: studio.phone,
          bookingId: booking.id,
        });
      } catch (error: unknown) {
        // Log error but don't fail the booking creation
        this.logger.error(
          "Failed to send booking confirmation email:",
          error instanceof Error ? error.stack : String(error),
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
    search?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.BookingWhereInput = { studioId };
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { customer: { name: { contains: search, mode: "insensitive" } } },
        { customer: { email: { contains: search, mode: "insensitive" } } },
        { service: { name: { contains: search, mode: "insensitive" } } },
      ];
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
          invoices: {
            select: { id: true, status: true },
          },
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

    // Auto-update status to IN_PROGRESS if scheduled time has passed for CONFIRMED bookings
    const now = new Date();
    const updatedBookings = await Promise.all(
      bookings.map(async (b) => {
        if (b.status === "CONFIRMED" && b.scheduledAt <= now) {
          try {
            await this.updateStatus(b.id, {
              status: "IN_PROGRESS",
              notes: "Automatically moved to In Progress (time reached)",
            });
            return { ...b, status: "IN_PROGRESS" as BookingStatus };
          } catch (e) {
            this.logger.error(`Failed to auto-update booking ${b.id} to IN_PROGRESS: ${e instanceof Error ? e.message : String(e)}`);
            return b;
          }
        }
        return b;
      })
    );

    return {
      data: updatedBookings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, studioId?: string) {
    const where: Prisma.BookingWhereInput = studioId
      ? { id, studioId }
      : { id };

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

    // Auto-update status to IN_PROGRESS if scheduled time has passed for CONFIRMED bookings
    if (booking.status === "CONFIRMED" && booking.scheduledAt <= new Date()) {
      try {
        await this.updateStatus(booking.id, {
          status: "IN_PROGRESS",
          notes: "Automatically moved to In Progress (time reached)",
        });
        booking.status = "IN_PROGRESS";
      } catch (e) {
        this.logger.error(`Failed to auto-update booking ${booking.id} to IN_PROGRESS (findOne): ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return booking;
  }

  async update(id: string, dto: UpdateBookingDto, studioId?: string) {
    const where: Prisma.BookingWhereInput = studioId
      ? { id, studioId }
      : { id };

    const booking = await this.prisma.booking.findFirst({ where });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    // If changing scheduled date, check for conflicts
    if (dto.scheduledDate) {
      const newDate = new Date(dto.scheduledDate);
      if (isNaN(newDate.getTime())) {
        throw new BadRequestException("Invalid scheduled date");
      }
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
    const updateData: Prisma.BookingUpdateInput = {};
    if (dto.status) updateData.status = dto.status;
    if (dto.scheduledDate) updateData.scheduledAt = new Date(dto.scheduledDate);
    if (dto.assignedTo)
      updateData.assignedTo = { connect: { id: dto.assignedTo } };
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
    const where: Prisma.BookingWhereInput = studioId
      ? { id, studioId }
      : { id };

    const booking = await this.prisma.booking.findFirst({ where });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    // For studio owners, we allow manual overrides to any status
    if (studioId) {
      // Basic check: completed or cancelled bookings can be moved back if owner really wants to
      // but we still want to log it
    } else {
      // Validate status transitions for non-owners/automation
      const validTransitions: Record<string, BookingStatus[]> = {
        INQUIRY: ["QUOTED", "CONFIRMED", "CANCELLED"],
        QUOTED: ["CONFIRMED", "CANCELLED"],
        CONFIRMED: ["IN_PROGRESS", "CANCELLED"],
        IN_PROGRESS: ["COMPLETED", "CANCELLED"],
        COMPLETED: [],
        CANCELLED: [],
      };
      const allowed = validTransitions[booking.status] ?? [];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(
          `Cannot transition from ${booking.status} to ${dto.status}`,
        );
      }
    }

    const updated = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
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
      },
    );

    await this.processStatusChangeSideEffects(updated, dto.status, dto.notes);
    return updated;
  }

  private async processStatusChangeSideEffects(
    booking: {
      id: string;
      studioId: string;
      scheduledAt: Date;
      customer: { email: string | null; name: string };
      service: { name: string };
      studio: { name: string; email: string; phone: string | null };
    },
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
      } catch (error: unknown) {
        this.logger.error(
          "Failed to generate/upload contract:",
          error instanceof Error ? error.stack : String(error),
        );
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
      } catch (error: unknown) {
        this.logger.error(
          "Failed to send status update email:",
          error instanceof Error ? error.stack : String(error),
        );
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

        // Auto-generate invoice if not exists
        const fullBooking: any = await this.findOne(booking.id, booking.studioId);
        if (fullBooking) {
          const existingInvoice = await this.prisma.invoice.findFirst({
            where: { bookingId: booking.id }
          });
          
          if (!existingInvoice) {
            const unitPrice = fullBooking.quoteAmount ? Number(fullBooking.quoteAmount) : Number(fullBooking.service.price);
            try {
               await this.invoiceService.create({
                  customerId: fullBooking.customer.id,
                  bookingId: fullBooking.id,
                  lineItems: [{
                     description: fullBooking.service.name + (fullBooking.quoteAmount ? ' (Negotiated Rate)' : ''),
                     quantity: 1,
                     rate: unitPrice,
                     amount: unitPrice
                  }],
                  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                  notes: "Auto-generated upon completion.",
               }, fullBooking.studioId);
               this.logger.log(`Auto-generated invoice for completed booking ${booking.id}`);
            } catch(err) {
               this.logger.error("Failed to auto-generate invoice:", err);
            }
          }
        }
      }
    } catch (error: unknown) {
      this.logger.error(
        "[Queue] Failed to schedule automated email:",
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async cancel(id: string, notes?: string, studioId?: string) {
    const where: Prisma.BookingWhereInput = studioId
      ? { id, studioId }
      : { id };

    const booking = await this.prisma.booking.findFirst({ where });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    if (booking.status === "COMPLETED" || booking.status === "CANCELLED") {
      throw new BadRequestException(
        `Cannot cancel a ${booking.status.toLowerCase()} booking`,
      );
    }

    const cancelled = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
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
      },
    );

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

    // Allow updating quote if in QUOTED or INQUIRY
    if (booking.status !== "INQUIRY" && booking.status !== "QUOTED") {
      throw new BadRequestException(
        "Can only send quote for inquiry or update existing quote",
      );
    }

    const updated = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const b = await tx.booking.update({
          where: { id },
          data: {
            status: "QUOTED",
            quoteAmount: dto.amount as unknown as Prisma.Decimal,
            quoteNotes: dto.notes,
            quoteRejectionNotes: null,
            quotedAt: new Date(),
          },
          include: { customer: true, studio: true, service: true },
        });

        await tx.bookingStatusLog.create({
          data: {
            bookingId: id,
            status: "QUOTED",
            notes: `Quote sent/updated: ${b.studio?.currency ?? ""}${dto.amount}. ${dto.notes || ""}`,
          },
        });

        return b;
      },
    );

    await this.cacheService.del(`studio:${studioId}:bookings`);

    if (updated.customer.email) {
      try {
        await this.notificationService.sendBookingStatusUpdate({
          to: updated.customer.email,
          customerName: updated.customer.name,
          studioName: updated.studio.name,
          serviceName: updated.service?.name ?? "Service",
          scheduledDate: updated.scheduledAt,
          newStatus: "QUOTED",
          notes: dto.notes,
        });
      } catch (err: unknown) {
        this.logger.error(
          `sendQuote notification failed for booking ${id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return updated;
  }

  async negotiateQuote(id: string, userId: string, notes: string) {
    const customerIds = await this.getCustomerIdsByUserId(userId);
    const booking = await this.prisma.booking.findFirst({
      where: { id, customerId: { in: customerIds } },
    });

    if (!booking) throw new NotFoundException("Booking not found");
    if (booking.status !== "QUOTED")
      throw new BadRequestException("No active quote to negotiate");

    const updated = await this.prisma.$transaction(async (tx) => {
      const b = await tx.booking.update({
        where: { id },
        data: {
          quoteRejectionNotes: notes,
          // We keep it in QUOTED but log the negotiation request
        },
        include: { customer: true, studio: true, service: true },
      });

      await tx.bookingStatusLog.create({
        data: {
          bookingId: id,
          status: "QUOTED",
          notes: `Customer requested adjustment: ${notes}`,
        },
      });
      return b;
    });

    await this.cacheService.del(`studio:${updated.studioId}:bookings`);
    return updated;
  }

  // Helper to DRY up customer lookup mapping globally across studios
  private async getCustomerIdsByUserId(userId: string) {
    let records = await this.prisma.customer.findMany({
      where: { globalUserId: userId },
      select: { id: true }
    });
    
    let ids = records.map(r => r.id);

    if (ids.length === 0) {
      const globalUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      if (globalUser?.email) {
        records = await this.prisma.customer.findMany({
          where: { email: globalUser.email },
          select: { id: true }
        });
        ids = records.map(r => r.id);
      }
    }

    if (ids.length === 0) throw new ForbiddenException("No customer record found");
    return ids;
  }

  async acceptQuote(id: string, userId: string) {
    const customerIds = await this.getCustomerIdsByUserId(userId);
    const booking = await this.prisma.booking.findFirst({
      where: { id, customerId: { in: customerIds } },
    });

    if (!booking) throw new NotFoundException("Booking not found");
    if (booking.status !== "QUOTED")
      throw new BadRequestException("Only quoted bookings can be accepted");

    const updated = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
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
            notes: `Quote accepted by customer. Final amount: ${b.studio?.currency ?? ""}${b.quoteAmount}`,
          },
        });

        return b;
      },
    );

    await this.processStatusChangeSideEffects(
      updated,
      "CONFIRMED",
      "Quote accepted by customer",
    );
    return updated;
  }

  async rejectQuote(id: string, userId: string, notes: string) {
    const customerIds = await this.getCustomerIdsByUserId(userId);
    const booking = await this.prisma.booking.findFirst({
      where: { id, customerId: { in: customerIds } },
    });

    if (!booking) throw new NotFoundException("Booking not found");

    const updated = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const b = await tx.booking.update({
          where: { id },
          data: {
            status: "CANCELLED",
            quoteRejectionNotes: notes,
          },
          include: { customer: true, studio: true, service: true },
        });

        await tx.bookingStatusLog.create({
          data: {
            bookingId: id,
            status: "CANCELLED",
            notes: `Quote rejected by customer: ${notes}`,
          },
        });

        return b;
      },
    );

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

    // Fetch all active bookings for the studio that could potentially overlap.
    // We join service to get durationMinutes so we can compute each booking's endAt.
    const candidates = await this.prisma.booking.findMany({
      where: {
        studioId,
        status: { in: ["INQUIRY", "QUOTED", "CONFIRMED"] },
        id: excludeBookingId ? { not: excludeBookingId } : undefined,
        // Optimisation: a booking starting on or after our endAt can never overlap
        scheduledAt: { lt: endAt },
      },
      select: {
        scheduledAt: true,
        service: {
          select: { durationMinutes: true },
        },
      },
    });

    for (const candidate of candidates) {
      const candidateEnd = new Date(
        candidate.scheduledAt.getTime() +
          candidate.service.durationMinutes * 60000,
      );

      // True overlap: new booking starts before candidate ends AND ends after candidate starts
      const overlaps =
        scheduledAt < candidateEnd && endAt > candidate.scheduledAt;

      if (overlaps) {
        throw new ConflictException(
          "This time slot overlaps with an existing booking. Please choose another time.",
        );
      }
    }
  }
}
