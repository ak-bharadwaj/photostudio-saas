import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import type { Queue } from "bull";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { addDays, addHours, subDays, isAfter, isBefore } from "date-fns";

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue("email") private emailQueue: Queue,
    private prisma: PrismaService,
  ) {}

  /**
   * Schedule booking reminder (to be sent 1 day before event)
   */
  async scheduleBookingReminder(bookingId: string, scheduledAt: Date) {
    try {
      // Calculate when to send reminder (1 day before event)
      const reminderTime = subDays(scheduledAt, 1);

      // Don't schedule if reminder time is in the past
      if (isBefore(reminderTime, new Date())) {
        this.logger.log(
          `Reminder time for booking ${bookingId} is in the past, skipping`,
        );
        return;
      }

      const job = await this.emailQueue.add(
        "booking_reminder",
        {
          type: "booking_reminder",
          bookingId,
        },
        {
          delay: reminderTime.getTime() - Date.now(),
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 60000, // 1 minute
          },
        },
      );

      this.logger.log(
        `Scheduled booking reminder for ${bookingId} at ${reminderTime.toISOString()}`,
      );
      return job;
    } catch (error) {
      this.logger.error(
        `Failed to schedule booking reminder: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Schedule payment reminder for overdue invoice
   */
  async schedulePaymentReminder(invoiceId: string, dueDate: Date) {
    try {
      // Send reminder 1 day after due date
      const reminderTime = addDays(dueDate, 1);

      // Don't schedule if reminder time is in the past
      if (isBefore(reminderTime, new Date())) {
        // If already overdue, send immediately
        const job = await this.emailQueue.add(
          "payment_reminder",
          {
            type: "payment_reminder",
            invoiceId,
          },
          {
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 60000,
            },
          },
        );

        this.logger.log(
          `Scheduled immediate payment reminder for invoice ${invoiceId}`,
        );
        return job;
      }

      const job = await this.emailQueue.add(
        "payment_reminder",
        {
          type: "payment_reminder",
          invoiceId,
        },
        {
          delay: reminderTime.getTime() - Date.now(),
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 60000,
          },
        },
      );

      this.logger.log(
        `Scheduled payment reminder for invoice ${invoiceId} at ${reminderTime.toISOString()}`,
      );
      return job;
    } catch (error) {
      this.logger.error(
        `Failed to schedule payment reminder: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Schedule follow-up email (to be sent 1 day after booking completion)
   */
  async scheduleFollowUpEmail(bookingId: string) {
    try {
      // Send follow-up 1 day after completion
      const followUpTime = addDays(new Date(), 1);

      const job = await this.emailQueue.add(
        "follow_up",
        {
          type: "follow_up",
          bookingId,
        },
        {
          delay: followUpTime.getTime() - Date.now(),
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 60000,
          },
        },
      );

      this.logger.log(
        `Scheduled follow-up email for booking ${bookingId} at ${followUpTime.toISOString()}`,
      );
      return job;
    } catch (error) {
      this.logger.error(
        `Failed to schedule follow-up email: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Cron job to check for upcoming bookings and schedule reminders
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkUpcomingBookings() {
    this.logger.log("Checking for upcoming bookings to schedule reminders...");

    try {
      // Find confirmed bookings in the next 2 days
      const upcomingBookings = await this.prisma.booking.findMany({
        where: {
          status: "CONFIRMED",
          scheduledAt: {
            gte: new Date(),
            lte: addDays(new Date(), 2),
          },
        },
      });

      this.logger.log(`Found ${upcomingBookings.length} upcoming bookings`);

      for (const booking of upcomingBookings) {
        await this.scheduleBookingReminder(booking.id, booking.scheduledAt);
      }
    } catch (error) {
      this.logger.error(
        `Failed to check upcoming bookings: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Cron job to check for overdue invoices and send payment reminders
   * Runs daily at 9 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkOverdueInvoices() {
    this.logger.log("Checking for overdue invoices...");

    try {
      // Find overdue invoices (SENT or PARTIALLY_PAID, past due date)
      const overdueInvoices = await this.prisma.invoice.findMany({
        where: {
          status: {
            in: ["SENT", "PARTIALLY_PAID", "OVERDUE"],
          },
          dueDate: {
            lt: new Date(),
          },
        },
      });

      this.logger.log(`Found ${overdueInvoices.length} overdue invoices`);

      for (const invoice of overdueInvoices) {
        // Update status to OVERDUE if not already
        if (invoice.status !== "OVERDUE") {
          await this.prisma.invoice.update({
            where: { id: invoice.id },
            data: { status: "OVERDUE" },
          });
        }

        // Schedule payment reminder
        if (invoice.dueDate) {
          await this.schedulePaymentReminder(invoice.id, invoice.dueDate);
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to check overdue invoices: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Cron job to check for completed bookings and send follow-ups
   * Runs daily at 10 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async checkCompletedBookings() {
    this.logger.log("Checking for recently completed bookings...");

    try {
      // Find bookings completed in the last 24-48 hours
      const completedBookings = await this.prisma.booking.findMany({
        where: {
          status: "COMPLETED",
          updatedAt: {
            gte: subDays(new Date(), 2),
            lte: subDays(new Date(), 1),
          },
        },
      });

      this.logger.log(
        `Found ${completedBookings.length} recently completed bookings`,
      );

      for (const booking of completedBookings) {
        await this.scheduleFollowUpEmail(booking.id);
      }
    } catch (error) {
      this.logger.error(
        `Failed to check completed bookings: ${error.message}`,
        error.stack,
      );
    }
  }
}
