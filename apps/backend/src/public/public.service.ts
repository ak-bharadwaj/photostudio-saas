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
  ) {}

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
        brandingConfig: true,
        defaultTerms: true,
        hotDeal: true,
        status: true,
        address: true,
        city: true,
        state: true,
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
        reviews: {
          where: { isVisible: true },
          select: {
            id: true,
            rating: true,
            comment: true,
            reply: true,
            createdAt: true,
            customer: {
              select: { name: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
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

    // Handle multiple services
    const serviceIds = (
      dto.serviceIds && dto.serviceIds.length > 0
        ? dto.serviceIds
        : [dto.serviceId]
    ) as string[];

    // Verify all services exist and belong to the studio
    const services = await this.prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        studioId: studio.id,
        isActive: true,
      },
    });

    if (services.length === 0) {
      throw new NotFoundException("No valid services found");
    }

    // Sort found services to match input order if possible, though not strictly required
    const primaryService = services[0];
    const totalDuration = services.reduce(
      (acc, s) => acc + Number(s.durationMinutes || 0),
      0,
    );

    // Validate and parse scheduledAt
    const scheduledAt = new Date(dto.scheduledAt);
    if (isNaN(scheduledAt.getTime())) {
      throw new BadRequestException("Invalid scheduledAt date");
    }
    if (scheduledAt < new Date()) {
      throw new BadRequestException("Scheduled time must be in the future");
    }

    // Check for scheduling conflicts using total duration
    const endAt = new Date(scheduledAt.getTime() + totalDuration * 60000);
    const candidates = await this.prisma.booking.findMany({
      where: {
        studioId: studio.id,
        status: {
          in: [
            BookingStatus.INQUIRY,
            BookingStatus.QUOTED,
            BookingStatus.CONFIRMED,
          ],
        },
        scheduledAt: { lt: endAt },
      },
      select: {
        scheduledAt: true,
        service: { select: { durationMinutes: true } },
        // Also check sibling bookings or booking items if they exist
        bookingItems: {
          select: { service: { select: { durationMinutes: true } } },
        },
      },
    });

    for (const candidate of candidates) {
      // If the candidate has bookingItems, sum their durations. Otherwise use candidate.service.durationMinutes
      const candidateDuration =
        candidate.bookingItems && candidate.bookingItems.length > 0
          ? candidate.bookingItems.reduce(
              (acc, item) => acc + Number(item.service.durationMinutes || 0),
              0,
            )
          : candidate.service?.durationMinutes || 0;

      const candidateEnd = new Date(
        candidate.scheduledAt.getTime() + candidateDuration * 60000,
      );

      if (scheduledAt < candidateEnd && endAt > candidate.scheduledAt) {
        throw new BadRequestException(
          "This time slot is not available for the selected services' total duration",
        );
      }
    }

    // Find or create customer + create booking atomically
    const booking = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const normalizedPhone = dto.customerPhone.replace(/\D/g, "");
        const searchPhone =
          normalizedPhone.length >= 10
            ? normalizedPhone.slice(-10)
            : normalizedPhone;
        const processedEmail = dto.customerEmail?.trim() || null;

        const customerByPhone = await tx.customer.findFirst({
          where: { studioId: studio.id, phone: { contains: searchPhone } },
        });

        const customerByEmail = processedEmail
          ? await tx.customer.findFirst({
              where: {
                studioId: studio.id,
                email: { equals: processedEmail, mode: "insensitive" },
              },
            })
          : null;

        let customer;

        if (
          customerByPhone &&
          customerByEmail &&
          customerByPhone.id !== customerByEmail.id
        ) {
          // Both match DIFFERENT records, merge phone record into email record
          const mergedGlobalUserId =
            globalUserId ||
            customerByEmail.globalUserId ||
            customerByPhone.globalUserId ||
            undefined;

          await tx.booking.updateMany({
            where: { customerId: customerByPhone.id },
            data: { customerId: customerByEmail.id },
          });
          await tx.invoice.updateMany({
            where: { customerId: customerByPhone.id },
            data: { customerId: customerByEmail.id },
          });
          await tx.review.updateMany({
            where: { customerId: customerByPhone.id },
            data: { customerId: customerByEmail.id },
          });
          await tx.customer.delete({ where: { id: customerByPhone.id } });

          customer = await tx.customer.update({
            where: { id: customerByEmail.id },
            data: {
              globalUserId: mergedGlobalUserId,
              name: dto.customerName,
              phone: dto.customerPhone,
            },
          });
        } else {
          customer = customerByEmail || customerByPhone;

          if (!customer) {
            customer = await tx.customer.create({
              data: {
                studioId: studio.id,
                globalUserId: globalUserId || undefined,
                name: dto.customerName,
                email: processedEmail,
                phone: dto.customerPhone,
              },
            });
          } else {
            customer = await tx.customer.update({
              where: { id: customer.id },
              data: {
                globalUserId:
                  globalUserId || customer.globalUserId || undefined,
                name: dto.customerName,
                email: processedEmail || customer.email,
                phone: dto.customerPhone,
              },
            });
          }
        }

        // Create the single booking record
        const newBooking = await tx.booking.create({
          data: {
            studioId: studio.id,
            customerId: customer.id,
            serviceId: primaryService.id, // Use the first service as primary for compatibility
            scheduledAt,
            status: BookingStatus.INQUIRY,
            customerNotes: dto.customerNotes,
            acceptedTerms: dto.acceptedTerms ?? false,
            // Initialize empty serviceQuotes for all services
            serviceQuotes: services.map((s) => ({
              serviceId: s.id,
              serviceName: s.name,
              originalPrice: s.price,
              quotedAmount: null,
            })) as any,
          },
          include: {
            service: true,
            customer: true,
          },
        });

        // Create BookingItem records for all services
        await (tx as any).bookingItem.createMany({
          data: services.map((s) => ({
            bookingId: newBooking.id,
            serviceId: s.id,
            originalPrice: s.price,
          })),
        });

        await tx.bookingStatusLog.create({
          data: {
            bookingId: newBooking.id,
            status: BookingStatus.INQUIRY,
            notes: `Booking created with ${services.length} services via public form`,
          },
        });

        return newBooking;
      },
    );

    // Send confirmation email to customer (non-blocking)
    const multiServiceName =
      services.length > 1
        ? services.map((s) => s.name).join(" + ")
        : services[0]?.name || "Service";

    if ((booking as any).customer.email) {
      this.notificationService
        .sendBookingConfirmation({
          to: (booking as any).customer.email,
          customerName: (booking as any).customer.name,
          studioName: studio.name,
          studioEmail: studio.email,
          studioPhone: studio.phone ?? "",
          bookingId: booking.id,
          serviceName: multiServiceName,
          scheduledDate: scheduledAt,
          studioId: studio.id,
        })
        .catch(() => {
          // Non-critical — do not fail the request if email delivery fails
        });
    }

    // Send notification to studio (non-blocking)
    this.notificationService
      .sendNewBookingInquiry({
        to: studio.email,
        studioName: studio.name,
        customerName: (booking as any).customer.name,
        customerPhone: (booking as any).customer.phone, // Use the phone from the created/updated customer
        serviceName: multiServiceName,
        scheduledDate: scheduledAt,
        bookingId: booking.id,
        studioId: studio.id,
      })
      .catch(() => {
        // Non-critical
      });

    return {
      id: booking.id,
      scheduledAt: booking.scheduledAt,
      status: booking.status,
      service: {
        name: multiServiceName,
        price: services.reduce((acc, s) => acc + Number(s.price || 0), 0),
        durationMinutes: services.reduce(
          (acc, s) => acc + Number(s.durationMinutes || 0),
          0,
        ),
      },
      customer: {
        name: (booking as any).customer.name,
        email: (booking as any).customer.email,
        phone: (booking as any).customer.phone,
      },
    };
  }

  /**
   * Get available time slots for a service on a specific date
   */
  async getAvailableTimeSlots(
    slug: string,
    serviceId: string,
    date: string,
    durationOverride?: number,
  ) {
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
      throw new BadRequestException(
        "Invalid date format — expected YYYY-MM-DD",
      );
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
        id: true,
        scheduledAt: true,
        service: {
          select: {
            durationMinutes: true,
          },
        },
        bookingItems: {
          select: {
            service: { select: { durationMinutes: true } },
          },
        },
      },
    });

    // Generate available slots (9 AM - 6 PM, assuming studio hours)
    const slots: { time: string; available: boolean }[] = [];
    const currentTime = new Date();

    const checkDuration = durationOverride || service.durationMinutes;

    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotTime = new Date(year, month - 1, day, hour, minute, 0, 0);

        // Skip past times
        if (slotTime < currentTime) {
          continue;
        }

        // Check if slot conflicts with existing bookings
        const hasConflict = existingBookings.some((booking: any) => {
          const bookingDuration =
            booking.bookingItems && booking.bookingItems.length > 0
              ? booking.bookingItems.reduce(
                  (acc: number, item: any) =>
                    acc + Number(item.service.durationMinutes || 0),
                  0,
                )
              : booking.service?.durationMinutes || 0;

          const bookingEnd = new Date(
            booking.scheduledAt.getTime() + bookingDuration * 60000,
          );
          const slotEnd = new Date(slotTime.getTime() + checkDuration * 60000);

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
      durationMinutes: checkDuration,
      slots,
    };
  }

  /**
   * Marketplace: Search results for services across all studios
   */
  async searchServices(
    q?: string,
    categoryId?: string,
    location?: string,
    isRecommended = false,
    uniquePerStudio = false,
    limit = 12,
    offset = 0,
  ) {
    const cacheKey = `public:search:q=${q}:cat=${categoryId}:loc=${location}:rec=${isRecommended}:uniq=${uniquePerStudio}:lim=${limit}:off=${offset}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const where: any = {
      isActive: true,
      studio: {
        status: { in: ["ACTIVE", "TRIAL"] },
        isPublic: true,
      },
    };

    if (location) {
      where.studio.city = { contains: location, mode: "insensitive" };
    }

    if (isRecommended) {
      where.studio.isRecommended = true;
    }

    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { occasion: { contains: q, mode: "insensitive" } },
        { studio: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const [total, items] = await Promise.all([
      this.prisma.service.count({ where }),
      this.prisma.service.findMany({
        where,
        include: {
          studio: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              brandingConfig: true,
              isRecommended: true,
              address: true,
              city: true,
              state: true,
              reviews: {
                where: { isVisible: true },
                select: { rating: true },
              },
            },
          },
          category: true,
        },
        orderBy: { createdAt: "desc" },
        take: uniquePerStudio ? limit * 3 : limit, // Fetch more to allow deduping
        skip: offset,
      }),
    ]);

    let finalItems = items;
    if (uniquePerStudio) {
      const seenStudios = new Set();
      finalItems = [];
      for (const item of items) {
        if (!seenStudios.has(item.studio.id)) {
          seenStudios.add(item.studio.id);
          finalItems.push(item);
        }
        if (finalItems.length === limit) break;
      }
    }

    // Ensure we don't return duplicates if uniquePerStudio was NOT requested but somehow crept in
    // (Though normally Prisma handles this, it's safer for this specific requirement)

    const itemsWithStats = finalItems.map((item: any) => {
      const studioReviews = item.studio.reviews || [];
      const avgRating =
        studioReviews.length > 0
          ? studioReviews.reduce(
              (acc: number, r: any) => acc + Number(r.rating || 0),
              0,
            ) / studioReviews.length
          : 0;

      const { reviews: _, ...studioWithoutReviews } = item.studio;

      return {
        ...item,
        studio: {
          ...studioWithoutReviews,
          avgRating: Number(avgRating.toFixed(1)),
          reviewCount: studioReviews.length,
        },
      };
    });

    return { total, items: itemsWithStats, limit, offset };
  }

  /**
   * Marketplace: Discover studios
   */
  async discoverStudios(
    location?: string,
    isRecommended = false,
    limit = 12,
    offset = 0,
  ) {
    const cacheKey = `public:discover:loc=${location}:rec=${isRecommended}:lim=${limit}:off=${offset}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const where: any = {
      status: { in: ["ACTIVE", "TRIAL"] },
      isPublic: true,
    };

    if (location) {
      where.city = { contains: location, mode: "insensitive" };
    }

    if (isRecommended) {
      where.isRecommended = true;
    }

    const [total, items] = await Promise.all([
      this.prisma.studio.count({ where }),
      this.prisma.studio.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          brandingConfig: true,
          address: true,
          city: true,
          state: true,
          defaultTerms: true,
          hotDeal: true,
          reviews: {
            where: { isVisible: true },
            select: { rating: true },
          },
          _count: {
            select: { services: true, reviews: true },
          },
        },
        take: limit,
        skip: offset,
      }),
    ]);

    const itemsWithStats = items.map((item: any) => {
      const reviews = item.reviews || [];
      const avgRating =
        reviews.length > 0
          ? reviews.reduce(
              (acc: number, r: any) => acc + Number(r.rating || 0),
              0,
            ) / reviews.length
          : 0;

      const { reviews: _, ...studioWithoutReviews } = item;

      return {
        ...studioWithoutReviews,
        avgRating: Number(avgRating.toFixed(1)),
        reviewCount: reviews.length,
      };
    });

    return { total, items: itemsWithStats, limit, offset };
  }

  /**
   * Marketplace: Get all categories
   */
  async getCategories() {
    const cacheKey = `public:categories`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    await this.cacheService.set(cacheKey, categories, 3600); // 1 hour
    return categories;
  }

  /**
   * Marketplace: Get recent reviews for global display
   */
  async getRecentReviews(limit = 10) {
    return this.prisma.review.findMany({
      where: { isVisible: true },
      include: {
        customer: { select: { name: true } },
        studio: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /**
   * Marketplace: Get single service details by ID
   */
  async getServiceById(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id, isActive: true },
      include: {
        studio: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            brandingConfig: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
            reviews: {
              where: { isVisible: true },
              select: { rating: true },
            },
          },
        },
        category: true,
      },
    });

    if (!service) {
      throw new NotFoundException("Service not found");
    }

    // Add aggregate stats for the studio
    const reviews = (service.studio as any).reviews || [];
    const avgRating =
      reviews.length > 0
        ? reviews.reduce(
            (acc: number, r: any) => acc + Number(r.rating || 0),
            0,
          ) / reviews.length
        : 0;

    const { reviews: _, ...studioWithoutReviews } = service.studio as any;

    return {
      ...service,
      studio: {
        ...studioWithoutReviews,
        avgRating: Number(avgRating.toFixed(1)),
        reviewCount: reviews.length,
      },
    };
  }

  /**
   * Marketplace: Get all distinct studio cities
   */
  async getLocations() {
    const cacheKey = `public:locations`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const studios = await this.prisma.studio.findMany({
      where: {
        status: { in: ["ACTIVE", "TRIAL"] },
        isPublic: true,
      },
      select: { city: true },
      distinct: ["city"],
    });

    const locations = studios.map((s: any) => s.city).filter(Boolean);
    await this.cacheService.set(cacheKey, locations, 3600); // 1 hour
    return locations;
  }
}
