import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePublicBookingDto } from "./dto/public-booking.dto";
import { BookingStatus } from "@prisma/client";

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get public studio information by slug (for booking page)
   */
  async getStudioBySlug(slug: string) {
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
        status: true,
        services: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            durationMinutes: true,
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

    if (studio.status !== "ACTIVE") {
      throw new BadRequestException(
        "Studio is not accepting bookings at this time",
      );
    }

    return studio;
  }

  /**
   * Create a public booking (no authentication required)
   */
  async createPublicBooking(slug: string, dto: CreatePublicBookingDto) {
    // Get studio
    const studio = await this.prisma.studio.findUnique({
      where: { slug },
    });

    if (!studio) {
      throw new NotFoundException("Studio not found");
    }

    if (studio.status !== "ACTIVE") {
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

    // Check if scheduledAt is in the future
    const scheduledAt = new Date(dto.scheduledAt);
    if (scheduledAt < new Date()) {
      throw new BadRequestException("Scheduled time must be in the future");
    }

    // Check for scheduling conflicts
    const conflictingBooking = await this.prisma.booking.findFirst({
      where: {
        studioId: studio.id,
        scheduledAt: {
          gte: new Date(
            scheduledAt.getTime() - service.durationMinutes * 60000,
          ),
          lte: new Date(
            scheduledAt.getTime() + service.durationMinutes * 60000,
          ),
        },
        status: {
          notIn: [BookingStatus.CANCELLED, BookingStatus.COMPLETED],
        },
      },
    });

    if (conflictingBooking) {
      throw new BadRequestException("This time slot is not available");
    }

    // Find or create customer
    let customer = await this.prisma.customer.findFirst({
      where: {
        studioId: studio.id,
        phone: dto.customerPhone,
      },
    });

    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          studioId: studio.id,
          name: dto.customerName,
          email: dto.customerEmail,
          phone: dto.customerPhone,
        },
      });
    } else {
      // Update customer info if provided
      customer = await this.prisma.customer.update({
        where: { id: customer.id },
        data: {
          name: dto.customerName,
          email: dto.customerEmail || customer.email,
        },
      });
    }

    // Create booking
    const booking = await this.prisma.booking.create({
      data: {
        studioId: studio.id,
        customerId: customer.id,
        serviceId: service.id,
        scheduledAt,
        status: BookingStatus.INQUIRY,
        customerNotes: dto.customerNotes,
      },
      include: {
        service: true,
        customer: true,
      },
    });

    // Create status log
    await this.prisma.bookingStatusLog.create({
      data: {
        bookingId: booking.id,
        status: BookingStatus.INQUIRY,
        notes: "Booking created via public form",
      },
    });

    // TODO: Send confirmation email to customer
    // TODO: Send notification to studio

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
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
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

    // Get all bookings for the date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

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
    const slots = [];
    const currentTime = new Date();

    for (let hour = 9; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotTime = new Date(date);
        slotTime.setHours(hour, minute, 0, 0);

        // Skip past times
        if (slotTime < currentTime) {
          continue;
        }

        // Check if slot conflicts with existing bookings
        const hasConflict = existingBookings.some((booking) => {
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
