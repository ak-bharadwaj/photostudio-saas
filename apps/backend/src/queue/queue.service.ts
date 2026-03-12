import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationService } from "../notification/notification.service";
import { CacheService } from "../cache/cache.service";
import { subDays, addDays, format } from "date-fns";

/**
 * QueueService — Scheduled background tasks.
 *
 * Uses @nestjs/schedule Cron decorators instead of Bull so that the service
 * works without Redis. For high-throughput production workloads you can re-add
 * BullMQ alongside these cron jobs for fine-grained per-booking scheduling.
 */
@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Trigger a booking reminder immediately (called on booking confirmation).
   * The actual send-time enforcement (1 day before event) is handled by the
   * daily cron — this is kept for API compatibility with BookingService.
   */
  async scheduleBookingReminder(bookingId: string, scheduledAt: Date) {
    this.logger.log(
      `Booking reminder registered for ${bookingId} (event at ${scheduledAt.toISOString()})`,
    );
    // The cron @checkUpcomingBookings picks this up automatically.
  }

  /**
   * Register a payment reminder — handled by the daily overdue cron.
   */
  async schedulePaymentReminder(invoiceId: string, dueDate: Date) {
    this.logger.log(
      `Payment reminder registered for invoice ${invoiceId} (due ${dueDate.toISOString()})`,
    );
    // The cron @checkOverdueInvoices picks this up automatically.
  }

  /**
   * Register a follow-up email — handled by the daily completed cron.
   */
  async scheduleFollowUpEmail(bookingId: string) {
    this.logger.log(`Follow-up email registered for booking ${bookingId}`);
    // The cron @checkCompletedBookings picks this up automatically.
  }

  // ============================================================
  // CRON JOBS
  // ============================================================

  /**
   * Every hour — find confirmed bookings in the next 25–26 hours and send reminders.
   * The 25-hour window ensures each booking gets exactly one reminder
   * (next hourly run the booking will be < 24 h away and already processed).
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkUpcomingBookings() {
    this.logger.log("Cron: checking upcoming bookings for reminders…");

    try {
      const now = new Date();
      const windowStart = addDays(now, 1); // 24 h from now
      const windowEnd = new Date(windowStart.getTime() + 60 * 60 * 1000); // +1 h

      const bookings = await this.prisma.booking.findMany({
        where: {
          status: "CONFIRMED",
          scheduledAt: { gte: windowStart, lte: windowEnd },
        },
        include: { customer: true, service: true, studio: true },
      });

      this.logger.log(`Found ${bookings.length} bookings for reminders`);

      for (const booking of bookings) {
        try {
          const idempotencyKey = `reminder_sent:booking:${booking.id}`;
          const alreadySent = await this.cacheService.get(idempotencyKey);
          if (alreadySent) {
            this.logger.log(
              `Reminder already sent for booking ${booking.id}, skipping`,
            );
            continue;
          }
          await this.notificationService.sendBookingReminder(booking);
          // Mark as sent for 25 hours to prevent duplicate in next cron run
          await this.cacheService.set(idempotencyKey, "1", 90000);
        } catch (err: unknown) {
          this.logger.error(
            `Reminder failed for booking ${booking.id}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    } catch (error: unknown) {
      this.logger.error(
        `checkUpcomingBookings failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Daily at 9 AM — mark overdue invoices and send payment reminders.
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkOverdueInvoices() {
    this.logger.log("Cron: checking overdue invoices…");

    try {
      const overdueInvoices = await this.prisma.invoice.findMany({
        where: {
          status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] },
          dueDate: { lt: new Date() },
        },
        include: { customer: true, studio: true, payments: true },
      });

      this.logger.log(`Found ${overdueInvoices.length} overdue invoices`);

      for (const invoice of overdueInvoices) {
        try {
          // Auto-escalate status
          if (invoice.status !== "OVERDUE") {
            await this.prisma.invoice.update({
              where: { id: invoice.id },
              data: { status: "OVERDUE" },
            });
          }

          const dateKey = format(new Date(), "yyyy-MM-dd");
          const idempotencyKey = `reminder_sent:invoice:${invoice.id}:${dateKey}`;
          const alreadySent = await this.cacheService.get(idempotencyKey);
          if (alreadySent) {
            this.logger.log(
              `Payment reminder already sent for invoice ${invoice.id} today, skipping`,
            );
            continue;
          }
          await this.notificationService.sendPaymentReminder(invoice);
          // Mark as sent for 25 hours (one day) to prevent duplicate in next run
          await this.cacheService.set(idempotencyKey, "1", 90000);
        } catch (err: unknown) {
          this.logger.error(
            `Payment reminder failed for invoice ${invoice.id}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    } catch (error: unknown) {
      this.logger.error(
        `checkOverdueInvoices failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Daily at 10 AM — send follow-up emails for bookings completed 24–48 h ago.
   */
  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async checkCompletedBookings() {
    this.logger.log(
      "Cron: checking recently completed bookings for follow-ups…",
    );

    try {
      const completedBookings = await this.prisma.booking.findMany({
        where: {
          status: "COMPLETED",
          updatedAt: {
            gte: subDays(new Date(), 2),
            lte: subDays(new Date(), 1),
          },
        },
        include: { customer: true, service: true, studio: true },
      });

      this.logger.log(
        `Found ${completedBookings.length} recently completed bookings`,
      );

      for (const booking of completedBookings) {
        try {
          const idempotencyKey = `followup_sent:booking:${booking.id}`;
          const alreadySent = await this.cacheService.get(idempotencyKey);
          if (alreadySent) {
            this.logger.log(
              `Follow-up already sent for booking ${booking.id}, skipping`,
            );
            continue;
          }
          await this.notificationService.sendFollowUpEmail(booking);
          // Mark as sent for 49 hours to prevent duplicates in next cron run
          await this.cacheService.set(idempotencyKey, "1", 176400);
        } catch (err: unknown) {
          this.logger.error(
            `Follow-up failed for booking ${booking.id}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    } catch (error: unknown) {
      this.logger.error(
        `checkCompletedBookings failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
