import { Test, TestingModule } from "@nestjs/testing";
import { BookingService } from "./booking.service";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationService } from "../notification/notification.service";
import { CacheService } from "../cache/cache.service";
import { QueueService } from "../queue/queue.service";
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";

describe("BookingService", () => {
  let service: BookingService;
  let prismaService: PrismaService;

  const mockPrismaService: any = {
    studio: {
      findUnique: jest.fn(),
    },
    service: {
      findFirst: jest.fn(),
    },
    customer: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    booking: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    bookingStatusLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockNotificationService = {
    sendBookingConfirmation: jest.fn(),
    sendBookingStatusUpdate: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockQueueService = {
    addEmailJob: jest.fn(),
    scheduleBookingReminder: jest.fn(),
    scheduleFollowUpEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a new booking successfully", async () => {
      const createDto = {
        studioSlug: "test-studio",
        customerName: "John Doe",
        customerEmail: "john@example.com",
        customerPhone: "+1234567890",
        serviceId: "service-1",
        scheduledDate: new Date().toISOString(),
        notes: "Test booking",
      };

      const mockStudio = {
        id: "studio-1",
        slug: "test-studio",
        status: "ACTIVE",
      };

      const mockService = {
        id: "service-1",
        name: "Wedding Photography",
        isActive: true,
        studioId: "studio-1",
      };

      const mockCustomer = {
        id: "customer-1",
        email: "john@example.com",
        name: "John Doe",
      };

      const mockBooking = {
        id: "booking-1",
        studioId: "studio-1",
        customerId: "customer-1",
        serviceId: "service-1",
        status: "INQUIRY",
      };

      mockPrismaService.studio.findUnique.mockResolvedValue(mockStudio);
      mockPrismaService.service.findFirst.mockResolvedValue(mockService);
      mockPrismaService.booking.findFirst.mockResolvedValue(null); // No conflicts
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.booking.create.mockResolvedValue(mockBooking);

      const result = await service.create(createDto);

      expect(result).toEqual(mockBooking);
      expect(
        mockNotificationService.sendBookingConfirmation,
      ).toHaveBeenCalled();
    });

    it("should throw NotFoundException if studio not found", async () => {
      const createDto = {
        studioSlug: "invalid-studio",
        customerName: "John Doe",
        customerEmail: "john@example.com",
        customerPhone: "+1234567890",
        serviceId: "service-1",
        scheduledDate: new Date().toISOString(),
      };

      mockPrismaService.studio.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException if studio is inactive", async () => {
      const createDto = {
        studioSlug: "test-studio",
        customerName: "John Doe",
        customerEmail: "john@example.com",
        customerPhone: "+1234567890",
        serviceId: "service-1",
        scheduledDate: new Date().toISOString(),
      };

      const mockStudio = {
        id: "studio-1",
        slug: "test-studio",
        status: "SUSPENDED",
      };

      mockPrismaService.studio.findUnique.mockResolvedValue(mockStudio);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw ConflictException if time slot is already booked", async () => {
      const createDto = {
        studioSlug: "test-studio",
        customerName: "John Doe",
        customerEmail: "john@example.com",
        customerPhone: "+1234567890",
        serviceId: "service-1",
        scheduledDate: new Date().toISOString(),
      };

      const mockStudio = {
        id: "studio-1",
        slug: "test-studio",
        status: "ACTIVE",
      };

      const mockService = {
        id: "service-1",
        isActive: true,
      };

      const mockConflictingBooking = {
        id: "booking-2",
        status: "CONFIRMED",
      };

      mockPrismaService.studio.findUnique.mockResolvedValue(mockStudio);
      mockPrismaService.service.findFirst.mockResolvedValue(mockService);
      mockPrismaService.booking.findFirst.mockResolvedValue(
        mockConflictingBooking,
      );

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("findAll", () => {
    it("should return paginated bookings for a studio", async () => {
      const studioId = "studio-1";
      const mockBookings = [
        { id: "booking-1", studioId, status: "INQUIRY" },
        { id: "booking-2", studioId, status: "CONFIRMED" },
      ];

      mockPrismaService.booking.findMany.mockResolvedValue(mockBookings);
      mockPrismaService.booking.count.mockResolvedValue(2);

      const result = await service.findAll(studioId);

      expect(result.data).toEqual(mockBookings);
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(mockPrismaService.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ studioId }),
        }),
      );
      expect(mockPrismaService.booking.count).toHaveBeenCalledWith({
        where: { studioId },
      });
    });
  });

  describe("findOne", () => {
    it("should return a booking by id", async () => {
      const bookingId = "booking-1";
      const mockBooking = {
        id: bookingId,
        studioId: "studio-1",
        status: "INQUIRY",
      };

      mockPrismaService.booking.findFirst.mockResolvedValue(mockBooking);

      const result = await service.findOne(bookingId);

      expect(result).toEqual(mockBooking);
    });

    it("should throw NotFoundException if booking not found", async () => {
      mockPrismaService.booking.findFirst.mockResolvedValue(null);

      await expect(service.findOne("invalid-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("updateStatus", () => {
    it("should update booking status successfully", async () => {
      const bookingId = "booking-1";
      const updateDto = {
        status: "CONFIRMED" as const,
        notes: "Booking confirmed",
      };

      const mockBooking = {
        id: bookingId,
        status: "QUOTED",
        studioId: "studio-1",
      };

      const mockUpdatedBooking = {
        id: bookingId,
        status: "CONFIRMED",
        studioId: "studio-1",
        scheduledAt: new Date(),
        customer: { email: "test@example.com", name: "John Doe" },
        service: { name: "Wedding Photography" },
        studio: { name: "Test Studio" },
      };

      mockPrismaService.booking.findFirst.mockResolvedValue(mockBooking);
      mockPrismaService.booking.update.mockResolvedValue(mockUpdatedBooking);

      const result = await service.updateStatus(bookingId, updateDto);

      expect(result.status).toBe("CONFIRMED");
      expect(
        mockNotificationService.sendBookingStatusUpdate,
      ).toHaveBeenCalled();
      expect(mockQueueService.scheduleBookingReminder).toHaveBeenCalledWith(
        mockUpdatedBooking.id,
        mockUpdatedBooking.scheduledAt,
      );
    });

    it("should update booking to COMPLETED and schedule follow-up", async () => {
      const bookingId = "booking-1";
      const updateDto = {
        status: "COMPLETED" as const,
      };

      const mockBooking = {
        id: bookingId,
        status: "CONFIRMED",
        studioId: "studio-1",
      };

      const mockUpdatedBooking = {
        id: bookingId,
        status: "COMPLETED",
        studioId: "studio-1",
        scheduledAt: new Date(),
        customer: { email: "test@example.com", name: "John Doe" },
        service: { name: "Wedding Photography" },
        studio: { name: "Test Studio" },
      };

      mockPrismaService.booking.findFirst.mockResolvedValue(mockBooking);
      mockPrismaService.booking.update.mockResolvedValue(mockUpdatedBooking);

      const result = await service.updateStatus(bookingId, updateDto);

      expect(result.status).toBe("COMPLETED");
      expect(mockQueueService.scheduleFollowUpEmail).toHaveBeenCalledWith(
        mockUpdatedBooking.id,
      );
    });
  });

  describe("cancel", () => {
    it("should cancel a booking successfully", async () => {
      const bookingId = "booking-1";
      const notes = "Customer requested cancellation";

      const mockBooking = {
        id: bookingId,
        status: "CONFIRMED",
        studioId: "studio-1",
        customer: { email: "test@example.com", name: "John Doe" },
        service: { name: "Wedding Photography" },
      };

      const mockCancelledBooking = {
        id: bookingId,
        status: "CANCELLED",
        studioId: "studio-1",
        customer: { email: "test@example.com", name: "John Doe" },
        service: { name: "Wedding Photography" },
        studio: { name: "Test Studio" },
      };

      mockPrismaService.booking.findFirst.mockResolvedValue(mockBooking);
      mockPrismaService.booking.update.mockResolvedValue(mockCancelledBooking);

      const result = await service.cancel(bookingId, notes);

      expect(result.status).toBe("CANCELLED");
      // cancel() does not send notification emails - it only updates status
      expect(mockPrismaService.booking.update).toHaveBeenCalled();
    });

    it("should throw BadRequestException if booking already completed", async () => {
      const bookingId = "booking-1";

      const mockBooking = {
        id: bookingId,
        status: "COMPLETED",
      };

      mockPrismaService.booking.findFirst.mockResolvedValue(mockBooking);

      await expect(service.cancel(bookingId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException if booking already cancelled", async () => {
      const bookingId = "booking-1";

      const mockBooking = {
        id: bookingId,
        status: "CANCELLED",
      };

      mockPrismaService.booking.findFirst.mockResolvedValue(mockBooking);

      await expect(service.cancel(bookingId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
