import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../cache/cache.service";
import { NotificationService } from "../notification/notification.service";
import { CreatePublicBookingDto } from "./dto/public-booking.dto";
import { BookingStatus, Prisma } from "@prisma/client";

@Injectable()
export class PublicService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private notificationService: NotificationService,
  ) { }

  /**
   * Get public studio information by slug (for booking page)
   */
  async getStudioBySlug(slug: string) {
    const cacheKey = `public:studio:${slug}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const studio = await this.prisma.studio.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        logoUrl: true,
        brandingConfig: true,
        defaultTerms: true,
        status: true,
        services: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            durationMinutes: true,
            occasion: true,
            coverImage: true,
          },
          orderBy: { sortOrder: "asc" },
        },
        portfolioItems: {
          where: { isVisible: true },
          select: {
            id: true,
            title: true,
            description: true,
            imageUrl: true,
            category: true,
          },
          orderBy: { sortOrder: "asc" },
          take: 12, // Limit portfolio items on public page
        },
      },
    });

    if (!studio) {
      throw new NotFoundException("Studio not found");
    }

    if (studio.status !== "ACTIVE" && studio.status !== "TRIAL") {
      throw new BadRequestException(
        "Studio is not accepting bookings at this time",
      );
    }

    // Cache the studio data for 10 minutes (600 seconds)
    await this.cacheService.set(cacheKey, studio, 600);

    return studio;
  }

  /**
   * Create a public booking (no authentication required)
   */
  async createPublicBooking(
    slug: string,
    dto: CreatePublicBookingDto,
    globalUserId?: string,
  ) {
    // Get studio
    const studio = await this.prisma.studio.findUnique({
      where: { slug },
    });

    if (!studio) {
      throw new NotFoundException("Studio not found");
    }

    if (studio.status !== "ACTIVE" && studio.status !== "TRIAL") {
      throw new BadRequestException(
        "Studio is not accepting bookings at this time",
      );
    }

    // Verify service exists and is active
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

    // Validate and parse scheduledAt — reject invalid date strings before any comparison
    const scheduledAt = new Date(dto.scheduledAt);
    if (isNaN(scheduledAt.getTime())) {
      throw new BadRequestException("Invalid scheduledAt date");
    }
    if (scheduledAt < new Date()) {
      throw new BadRequestException("Scheduled time must be in the future");
    }

    // Check for scheduling conflicts using correct overlap algorithm
    const endAt = new Date(scheduledAt.getTime() + service.durationMinutes * 60000);
    const candidates = await this.prisma.booking.findMany({
      where: {
        studioId: studio.id,
        status: { in: [BookingStatus.INQUIRY, BookingStatus.QUOTED, BookingStatus.CONFIRMED] },
        // Optimisation: booking starting on or after endAt can never overlap
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
        candidate.scheduledAt.getTime() + candidate.service.durationMinutes * 60000,
      );
      // True overlap: new booking starts before candidate ends AND new booking ends after candidate starts
      if (scheduledAt < candidateEnd && endAt > candidate.scheduledAt) {
        throw new BadRequestException("This time slot is not available");
      }
    }

    // Find or create customer + create booking atomically in one transaction
    // Using upsert keyed on (studioId, phone) eliminates the non-atomic
    // find-then-create race condition that could produce duplicate customers.
    const booking = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const customer = await tx.customer.upsert({
        where: {
          studioId_phone: {
            studioId: studio.id,
            phone: dto.customerPhone,
          },
        },
        create: {
          studioId: studio.id,
          globalUserId: globalUserId || undefined,
          name: dto.customerName,
          email: dto.customerEmail,
          phone: dto.customerPhone,
        },
        update: {
          // Only update globalUserId when we have one — never overwrite an existing
          // link with undefined (which would NULL it out in Prisma).
          ...(globalUserId ? { globalUserId } : {}),
          name: dto.customerName,
          email: dto.customerEmail || undefined,
        },
      });

      const newBooking = await tx.booking.create({
        data: {
          studioId: studio.id,
          customerId: customer.id,
          serviceId: service.id,
          scheduledAt,
          status: BookingStatus.INQUIRY,
          customerNotes: dto.customerNotes,
          acceptedTerms: dto.acceptedTerms ?? false,
        },
        include: {
          service: true,
          customer: true,
        },
      });

      await tx.bookingStatusLog.create({
        data: {
          bookingId: newBooking.id,
          status: BookingStatus.INQUIRY,
          notes: "Booking created via public form",
        },
      });

      return newBooking;
    });

    // TODO: Send confirmation email to customer
    // TODO: Send notification to studio

    // Send confirmation email to customer (non-blocking)
    if (booking.customer.email) {
      this.notificationService.sendBookingConfirmation({
        to: booking.customer.email,
        customerName: booking.customer.name,
        studioName: studio.name,
        serviceName: service.name,
        scheduledDate: scheduledAt,
        studioEmail: studio.email,
        studioPhone: studio.phone ?? '',
        bookingId: booking.id,
      }).catch(() => {
        // Non-critical — do not fail the request if email delivery fails
      });
    }

    return {
      id: booking.id,
      scheduledAt: booking.scheduledAt,
      status: booking.status,
      service: {
        name: service.name,
        price: service.price,
        durationMinutes: service.durationMinutes,
      },
      customer: {
        name: booking.customer.name,
        email: booking.customer.email,
        phone: booking.customer.phone,
      },
    };
  }

  /**
   * Get available time slots for a service on a specific date
   */
  async getAvailableTimeSlots(slug: string, serviceId: string, date: string) {
    const studio = await this.prisma.studio.findUnique({
      where: { slug },
    });

    if (!studio) {
      throw new NotFoundException("Studio not found");
    }

    const service = await this.prisma.service.findFirst({
      where: {
        id: serviceId,
        studioId: studio.id,
        isActive: true,
      },
    });

    if (!service) {
      throw new NotFoundException("Service not found");
    }

    // Parse date parts explicitly to avoid UTC-vs-local timezone ambiguity.
    // "YYYY-MM-DD" passed to `new Date()` is treated as UTC midnight, but
    // `setHours` operates in local time — mixing them causes off-by-one-day
    // errors when the server timezone is not UTC.
    const [year, month, day] = date.split("-").map(Number);
    if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) {
      throw new BadRequestException("Invalid date format — expected YYYY-MM-DD");
    }
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

    const existingBookings = await this.prisma.booking.findMany({
      where: {
        studioId: studio.id,
        scheduledAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          notIn: [BookingStatus.CANCELLED, BookingStatus.COMPLETED],
        },
      },
      select: {
        scheduledAt: true,
        service: {
          select: {
            durationMinutes: true,
          },
        },
      },
    });

    // Generate available slots (9 AM - 6 PM, assuming studio hours)
    const slots: { time: string; available: boolean }[] = [];
    const currentTime = new Date();

    for (let hour = 9; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotTime = new Date(year, month - 1, day, hour, minute, 0, 0);

        // Skip past times
        if (slotTime < currentTime) {
          continue;
        }

        // Check if slot conflicts with existing bookings
        const hasConflict = existingBookings.some((booking: { scheduledAt: Date; service: { durationMinutes: number } }) => {
          const bookingEnd = new Date(
            booking.scheduledAt.getTime() +
            booking.service.durationMinutes * 60000,
          );
          const slotEnd = new Date(
            slotTime.getTime() + service.durationMinutes * 60000,
          );

          return (
            (slotTime >= booking.scheduledAt && slotTime < bookingEnd) ||
            (slotEnd > booking.scheduledAt && slotEnd <= bookingEnd) ||
            (slotTime <= booking.scheduledAt && slotEnd >= bookingEnd)
          );
        });

        if (!hasConflict) {
          slots.push({
            time: slotTime.toISOString(),
            available: true,
          });
        }
      }
    }

    return {
      date,
      serviceId,
      serviceName: service.name,
      durationMinutes: service.durationMinutes,
      slots,
    };
  }
}
