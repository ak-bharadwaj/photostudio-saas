import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import type { Job } from "bull";
import { NotificationService } from "../notification/notification.service";
import { PrismaService } from "../prisma/prisma.service";

export interface EmailJobData {
  type: "booking_reminder" | "payment_reminder" | "follow_up";
  bookingId?: string;
  invoiceId?: string;
  studioId?: string; // Optional - studio is fetched via booking/invoice relation
}

@Processor("email")
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
  ) {}

  @Process("booking_reminder")
  async handleBookingReminder(job: Job<EmailJobData>) {
    this.logger.log(`Processing booking reminder job ${job.id}`);

    try {
      const { bookingId } = job.data;

      if (!bookingId) {
        this.logger.warn(
          `Booking reminder job ${job.id} missing bookingId — skipping`,
        );
        return;
      }

      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          customer: true,
          service: true,
          studio: true,
        },
      });

      if (!booking) {
        this.logger.warn(`Booking ${bookingId} not found`);
        return;
      }

      // Check if booking is still confirmed
      if (booking.status !== "CONFIRMED") {
        this.logger.log(
          `Booking ${bookingId} is not confirmed, skipping reminder`,
        );
        return;
      }

      // Send reminder email
      await this.notificationService.sendBookingReminder(booking);

      this.logger.log(`Booking reminder sent for ${bookingId}`);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to process booking reminder: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error; // Bull will retry
    }
  }

  @Process("payment_reminder")
  async handlePaymentReminder(job: Job<EmailJobData>) {
    this.logger.log(`Processing payment reminder job ${job.id}`);

    try {
      const { invoiceId } = job.data;

      if (!invoiceId) {
        this.logger.warn(
          `Payment reminder job ${job.id} missing invoiceId — skipping`,
        );
        return;
      }

      const invoice = await this.prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          customer: true,
          studio: true,
          payments: true,
        },
      });

      if (!invoice) {
        this.logger.warn(`Invoice ${invoiceId} not found`);
        return;
      }

      // Check if invoice is still unpaid or overdue
      if (invoice.status === "PAID" || invoice.status === "CANCELLED") {
        this.logger.log(
          `Invoice ${invoiceId} is ${invoice.status}, skipping reminder`,
        );
        return;
      }

      // Send payment reminder email
      await this.notificationService.sendPaymentReminder(invoice);

      this.logger.log(`Payment reminder sent for invoice ${invoiceId}`);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to process payment reminder: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error; // Bull will retry
    }
  }

  @Process("follow_up")
  async handleFollowUp(job: Job<EmailJobData>) {
    this.logger.log(`Processing follow-up job ${job.id}`);

    try {
      const { bookingId } = job.data;

      if (!bookingId) {
        this.logger.warn(
          `Follow-up job ${job.id} missing bookingId — skipping`,
        );
        return;
      }

      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          customer: true,
          service: true,
          studio: true,
        },
      });

      if (!booking) {
        this.logger.warn(`Booking ${bookingId} not found`);
        return;
      }

      // Check if booking is completed
      if (booking.status !== "COMPLETED") {
        this.logger.log(
          `Booking ${bookingId} is not completed, skipping follow-up`,
        );
        return;
      }

      // Send follow-up email
      await this.notificationService.sendFollowUpEmail(booking);

      this.logger.log(`Follow-up email sent for ${bookingId}`);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to process follow-up: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error; // Bull will retry
    }
  }
}
