jest.mock("uuid", () => ({ v4: () => "mocked-uuid" }));

import { Test, TestingModule } from "@nestjs/testing";
import { BookingService } from "./booking.service";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationService } from "../notification/notification.service";
import { CacheService } from "../cache/cache.service";
import { QueueService } from "../queue/queue.service";
import { PdfService } from "../pdf/pdf.service";
import { UploadService } from "../upload/upload.service";
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";

describe("BookingService", () => {
  let service: BookingService;
  let mockPrismaService: any;
  let mockNotificationService: any;
  let mockCacheService: any;
  let mockQueueService: any;
  let mockPdfService: any;
  let mockUploadService: any;

  beforeEach(async () => {
    mockPrismaService = {
      studio: { findUnique: jest.fn() },
      service: { findFirst: jest.fn(), findUnique: jest.fn() },
      customer: { findFirst: jest.fn(), create: jest.fn() },
      booking: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      bookingStatusLog: { create: jest.fn() },
      $transaction: jest.fn((callback) => callback(mockPrismaService)),
    };

    mockNotificationService = {
      sendBookingConfirmation: jest.fn(),
      sendBookingStatusUpdate: jest.fn(),
    };

    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    mockQueueService = {
      scheduleBookingReminder: jest.fn(),
      scheduleFollowUpEmail: jest.fn(),
      schedulePaymentReminder: jest.fn(),
    };

    mockPdfService = {
      generateContractPdf: jest.fn(),
      generateInvoicePdf: jest.fn(),
    };

    mockUploadService = {
      uploadContractPDF: jest.fn(),
      uploadInvoicePDF: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: QueueService, useValue: mockQueueService },
        { provide: PdfService, useValue: mockPdfService },
        { provide: UploadService, useValue: mockUploadService },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("create", () => {
    const createDto = {
      studioSlug: "test-studio",
      customerName: "John Doe",
      customerEmail: "john@example.com",
      customerPhone: "+1234567890",
      serviceId: "service-1",
      scheduledDate: new Date().toISOString(),
      notes: "Test booking",
    };

    it("should create a new booking successfully", async () => {
      const mockStudio = {
        id: "studio-1",
        slug: "test-studio",
        status: "ACTIVE",
        email: "s@s.com",
        name: "Studio",
        phone: "123",
      };
      const mockService = {
        id: "service-1",
        name: "Wedding",
        isActive: true,
        studioId: "studio-1",
        durationMinutes: 60,
      };
      const mockCustomer = {
        id: "customer-1",
        email: "john@example.com",
        name: "John Doe",
        phone: "123",
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
      mockPrismaService.booking.findFirst.mockResolvedValue(null);
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.booking.create.mockResolvedValue(mockBooking);

      const result = await service.create(createDto);

      expect(result).toEqual(mockBooking);
      expect(
        mockNotificationService.sendBookingConfirmation,
      ).toHaveBeenCalled();
    });

    it("should throw NotFoundException if studio not found", async () => {
      mockPrismaService.studio.findUnique.mockResolvedValue(null);
      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ConflictException if there is a schedule conflict", async () => {
      const mockStudio = {
        id: "studio-1",
        slug: "test-studio",
        status: "ACTIVE",
      };
      const mockService = { id: "service-1", durationMinutes: 60 };
      const mockConflictingBooking = {
        id: "b-conf",
        scheduledAt: new Date(),
        service: { durationMinutes: 60 },
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

  describe("updateStatus", () => {
    const bookingId = "booking-1";
    const updateDto = { status: "CONFIRMED" as const, notes: "Confirmed" };

    it("should update booking status successfully and trigger side effects", async () => {
      const mockInitialBooking = {
        id: bookingId,
        status: "INQUIRY",
        studioId: "studio-1",
      };
      const mockUpdatedBooking = {
        id: bookingId,
        status: "CONFIRMED",
        studioId: "studio-1",
        scheduledAt: new Date(),
        customer: { email: "test@example.com", name: "John Doe" },
        service: { name: "Service", durationMinutes: 60, price: 100 },
        studio: { name: "Studio", email: "s@s.com", phone: "123" },
      };

      mockPrismaService.booking.findFirst.mockResolvedValueOnce(
        mockInitialBooking,
      ); // findFirst in updateStatus
      mockPrismaService.booking.update.mockResolvedValueOnce(
        mockUpdatedBooking,
      ); // updatedBooking in transaction

      // Mocks for processStatusChangeSideEffects
      mockPrismaService.booking.findFirst.mockResolvedValueOnce(
        mockUpdatedBooking,
      ); // findOne inside sideEffects
      mockPdfService.generateContractPdf.mockResolvedValue(Buffer.from("pdf"));
      mockUploadService.uploadContractPDF.mockResolvedValue(
        "http://contract.url",
      );
      mockPrismaService.booking.update.mockResolvedValueOnce({
        ...mockUpdatedBooking,
        contractUrl: "http://contract.url",
      }); // second update for contractUrl

      const result = await service.updateStatus(bookingId, updateDto);

      expect(result.status).toBe("CONFIRMED");
      expect(
        mockNotificationService.sendBookingStatusUpdate,
      ).toHaveBeenCalled();
      expect(mockQueueService.scheduleBookingReminder).toHaveBeenCalled();
      expect(mockPdfService.generateContractPdf).toHaveBeenCalled();
    });

    it("should throw NotFoundException if booking not found", async () => {
      mockPrismaService.booking.findFirst.mockResolvedValue(null);
      await expect(service.updateStatus(bookingId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("cancel", () => {
    const bookingId = "booking-1";

    it("should cancel a booking successfully", async () => {
      const mockBooking = {
        id: bookingId,
        status: "CONFIRMED",
        studioId: "studio-1",
      };
      const mockCancelledBooking = {
        ...mockBooking,
        status: "CANCELLED",
        customer: { email: "c@c.com", name: "C" },
        service: { name: "S" },
        studio: { name: "St" },
        scheduledAt: new Date(),
      };

      mockPrismaService.booking.findFirst.mockResolvedValue(mockBooking);
      mockPrismaService.booking.update.mockResolvedValue(mockCancelledBooking);

      const result = await service.cancel(bookingId);

      expect(result.status).toBe("CANCELLED");
      expect(
        mockNotificationService.sendBookingStatusUpdate,
      ).toHaveBeenCalled();
    });

    it("should throw BadRequestException if booking already completed", async () => {
      const mockBooking = { id: bookingId, status: "COMPLETED" };
      mockPrismaService.booking.findFirst.mockResolvedValue(mockBooking);
      await expect(service.cancel(bookingId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("findOne", () => {
    it("should return a booking with relations", async () => {
      const mockBooking = { id: "b1", customerId: "c1", serviceId: "s1" };
      mockPrismaService.booking.findFirst.mockResolvedValue(mockBooking);

      const result = await service.findOne("b1");
      expect(result).toEqual(mockBooking);
      expect(mockPrismaService.booking.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.anything(),
        }),
      );
    });

    it("should throw NotFoundException if booking not found", async () => {
      mockPrismaService.booking.findFirst.mockResolvedValue(null);
      await expect(service.findOne("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("acceptQuote", () => {
    const userId = "user-1";
    const bookingId = "booking-1";

    it("should accept a quote and confirm booking", async () => {
      const mockCustomer = { id: "customer-1", globalUserId: userId };
      const mockBooking = {
        id: bookingId,
        status: "QUOTED",
        studioId: "studio-1",
      };
      const mockConfirmedBooking = {
        ...mockBooking,
        status: "CONFIRMED",
        customer: { email: "test@example.com", name: "John Doe" },
        service: { name: "Service", durationMinutes: 60, price: 100 },
        studio: { name: "Studio", email: "s@s.com", phone: "123" },
        scheduledAt: new Date(),
      };

      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.booking.findFirst.mockResolvedValueOnce(mockBooking); // First check
      mockPrismaService.booking.update.mockResolvedValueOnce(
        mockConfirmedBooking,
      ); // transaction update

      // Side effects mocks
      mockPrismaService.booking.findFirst.mockResolvedValueOnce(
        mockConfirmedBooking,
      ); // findOne in sideEffects

      const result = await service.acceptQuote(bookingId, userId);

      expect(result.status).toBe("CONFIRMED");
      expect(
        mockNotificationService.sendBookingStatusUpdate,
      ).toHaveBeenCalled();
    });

    it("should throw ForbiddenException if customer record not found", async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(null);
      await expect(service.acceptQuote(bookingId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should throw BadRequestException if booking not in QUOTED status", async () => {
      const mockCustomer = { id: "customer-1", globalUserId: userId };
      const mockBooking = { id: bookingId, status: "INQUIRY" };
      mockPrismaService.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrismaService.booking.findFirst.mockResolvedValue(mockBooking);
      await expect(service.acceptQuote(bookingId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("sendQuote", () => {
    it("should update booking status to QUOTED", async () => {
      const bookingId = "b1";
      const studioId = "s1";
      const quoteDto = { amount: 500, notes: "Good price" };
      const mockBooking = { id: bookingId, studioId };
      const mockQuotedBooking = {
        ...mockBooking,
        status: "QUOTED",
        quoteAmount: 500,
        customer: { name: "C" },
        service: { name: "S" },
        studio: { name: "St" },
      };

      mockPrismaService.booking.findFirst.mockResolvedValue(mockBooking);
      mockPrismaService.booking.update.mockResolvedValue(mockQuotedBooking);

      const result = await service.sendQuote(bookingId, studioId, quoteDto);

      expect(result.status).toBe("QUOTED");
      expect(result.quoteAmount).toBe(500);
    });
  });

  describe("getUpcoming", () => {
    it("should return upcoming bookings", async () => {
      const studioId = "studio-1";
      mockPrismaService.booking.findMany.mockResolvedValue([{ id: "b1" }]);

      const result = await service.getUpcoming(studioId);
      expect(result).toHaveLength(1);
      expect(mockPrismaService.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            studioId,
            scheduledAt: expect.anything(),
          }),
        }),
      );
    });
  });
});
