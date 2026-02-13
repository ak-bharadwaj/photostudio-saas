import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";

interface BookingConfirmationEmailData {
  to: string;
  customerName: string;
  studioName: string;
  serviceName: string;
  scheduledDate: Date;
  studioEmail: string;
  studioPhone: string;
  bookingId: string;
}

interface BookingStatusUpdateEmailData {
  to: string;
  customerName: string;
  studioName: string;
  serviceName: string;
  scheduledDate: Date;
  newStatus: string;
  notes?: string;
}

interface InvoiceEmailData {
  to: string;
  customerName: string;
  studioName: string;
  invoiceNumber: string;
  total: number;
  dueDate?: Date;
  invoiceUrl?: string;
}

@Injectable()
export class NotificationService {
  private resend: Resend;
  private readonly logger = new Logger(NotificationService.name);
  private readonly fromEmail: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>("resend.apiKey");
    this.fromEmail =
      this.configService.get<string>("resend.fromEmail") ||
      "noreply@yourdomain.com";

    if (!apiKey) {
      this.logger.warn(
        "Resend API key not configured. Email notifications will not be sent.",
      );
    } else {
      this.resend = new Resend(apiKey);
    }
  }

  async sendBookingConfirmation(data: BookingConfirmationEmailData) {
    if (!this.resend) {
      this.logger.warn("Resend not configured, skipping email");
      return;
    }

    try {
      const formattedDate = data.scheduledDate.toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: data.to,
        subject: `Booking Confirmation - ${data.studioName}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Booking Confirmation</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
                <h1 style="color: #2c3e50; margin-top: 0;">Booking Received!</h1>
                <p>Hi ${data.customerName},</p>
                <p>Thank you for your booking inquiry with <strong>${data.studioName}</strong>.</p>
                
                <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                  <h2 style="color: #3498db; margin-top: 0;">Booking Details</h2>
                  <p><strong>Service:</strong> ${data.serviceName}</p>
                  <p><strong>Scheduled Date:</strong> ${formattedDate}</p>
                  <p><strong>Booking ID:</strong> ${data.bookingId}</p>
                </div>

                <p>We will review your booking and get back to you shortly to confirm availability.</p>
                
                <div style="background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p style="margin: 0;"><strong>Questions?</strong> Contact us:</p>
                  <p style="margin: 5px 0;">Email: ${data.studioEmail}</p>
                  <p style="margin: 5px 0;">Phone: ${data.studioPhone}</p>
                </div>

                <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
                  This is an automated email. Please do not reply directly to this message.
                </p>
              </div>
            </body>
          </html>
        `,
      });

      this.logger.log(
        `Booking confirmation email sent to ${data.to}: ${result.data?.id}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to send booking confirmation email: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async sendBookingStatusUpdate(data: BookingStatusUpdateEmailData) {
    if (!this.resend) {
      this.logger.warn("Resend not configured, skipping email");
      return;
    }

    try {
      const formattedDate = data.scheduledDate.toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const statusMessages: Record<
        string,
        { title: string; message: string; color: string }
      > = {
        QUOTED: {
          title: "Quote Sent",
          message:
            "We have prepared a quote for your booking. Please review and confirm.",
          color: "#3498db",
        },
        CONFIRMED: {
          title: "Booking Confirmed",
          message:
            "Your booking has been confirmed! We look forward to seeing you.",
          color: "#27ae60",
        },
        IN_PROGRESS: {
          title: "Booking In Progress",
          message: "Your photo session is now in progress.",
          color: "#f39c12",
        },
        COMPLETED: {
          title: "Booking Completed",
          message: "Your photo session is complete. Thank you for choosing us!",
          color: "#2ecc71",
        },
        CANCELLED: {
          title: "Booking Cancelled",
          message: "Your booking has been cancelled.",
          color: "#e74c3c",
        },
      };

      const statusInfo = statusMessages[data.newStatus] || {
        title: `Status Update: ${data.newStatus}`,
        message: "Your booking status has been updated.",
        color: "#95a5a6",
      };

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: data.to,
        subject: `${statusInfo.title} - ${data.studioName}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Booking Status Update</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
                <h1 style="color: ${statusInfo.color}; margin-top: 0;">${statusInfo.title}</h1>
                <p>Hi ${data.customerName},</p>
                <p>${statusInfo.message}</p>
                
                <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                  <h2 style="color: #3498db; margin-top: 0;">Booking Details</h2>
                  <p><strong>Service:</strong> ${data.serviceName}</p>
                  <p><strong>Scheduled Date:</strong> ${formattedDate}</p>
                  <p><strong>Status:</strong> <span style="color: ${statusInfo.color};">${data.newStatus}</span></p>
                  ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ""}
                </div>

                <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
                  If you have any questions, please contact ${data.studioName}.
                </p>
              </div>
            </body>
          </html>
        `,
      });

      this.logger.log(
        `Booking status update email sent to ${data.to}: ${result.data?.id}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to send booking status update email: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async sendInvoice(data: InvoiceEmailData) {
    if (!this.resend) {
      this.logger.warn("Resend not configured, skipping email");
      return;
    }

    try {
      const formattedDueDate = data.dueDate
        ? data.dueDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "Upon receipt";

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: data.to,
        subject: `Invoice ${data.invoiceNumber} - ${data.studioName}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Invoice</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
                <h1 style="color: #2c3e50; margin-top: 0;">New Invoice</h1>
                <p>Hi ${data.customerName},</p>
                <p>You have received a new invoice from <strong>${data.studioName}</strong>.</p>
                
                <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                  <h2 style="color: #3498db; margin-top: 0;">Invoice Details</h2>
                  <p><strong>Invoice Number:</strong> ${data.invoiceNumber}</p>
                  <p><strong>Amount Due:</strong> $${data.total.toFixed(2)}</p>
                  <p><strong>Due Date:</strong> ${formattedDueDate}</p>
                </div>

                ${
                  data.invoiceUrl
                    ? `
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${data.invoiceUrl}" style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">View Invoice</a>
                </div>
                `
                    : ""
                }

                <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
                  If you have any questions about this invoice, please contact ${data.studioName}.
                </p>
              </div>
            </body>
          </html>
        `,
      });

      this.logger.log(`Invoice email sent to ${data.to}: ${result.data?.id}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to send invoice email: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async sendStudioWelcome(
    email: string,
    studioName: string,
    ownerName: string,
    slug: string,
  ) {
    if (!this.resend) {
      this.logger.warn("Resend not configured, skipping email");
      return;
    }

    try {
      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: `Welcome to Photo Studio SaaS - ${studioName}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Welcome</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
                <h1 style="color: #2c3e50; margin-top: 0;">Welcome to Photo Studio SaaS! 🎉</h1>
                <p>Hi ${ownerName},</p>
                <p>Your studio <strong>${studioName}</strong> has been successfully created!</p>
                
                <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                  <h2 style="color: #3498db; margin-top: 0;">Your Studio Details</h2>
                  <p><strong>Studio Name:</strong> ${studioName}</p>
                  <p><strong>Studio URL:</strong> yourdomain.com/studio/${slug}</p>
                  <p><strong>Trial Period:</strong> 14 days</p>
                </div>

                <h3 style="color: #2c3e50;">Getting Started</h3>
                <ol style="line-height: 2;">
                  <li>Log in to your dashboard</li>
                  <li>Add your services and pricing</li>
                  <li>Upload portfolio images</li>
                  <li>Customize your booking page</li>
                  <li>Share your studio URL with clients</li>
                </ol>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="#" style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Go to Dashboard</a>
                </div>

                <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
                  Need help? Contact our support team anytime.
                </p>
              </div>
            </body>
          </html>
        `,
      });

      this.logger.log(
        `Studio welcome email sent to ${email}: ${result.data?.id}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to send studio welcome email: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send booking reminder (1 day before event)
   */
  async sendBookingReminder(booking: any) {
    if (!this.resend) {
      this.logger.warn("Resend not configured, skipping email");
      return;
    }

    try {
      const formattedDate = new Date(booking.scheduledAt).toLocaleString(
        "en-US",
        {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        },
      );

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: booking.customer.email,
        subject: `Reminder: Your ${booking.service.name} session tomorrow`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Booking Reminder</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
                <h1 style="color: #2c3e50; margin-top: 0;">⏰ Reminder: Session Tomorrow</h1>
                <p>Hi ${booking.customer.name},</p>
                <p>This is a friendly reminder about your upcoming photography session with <strong>${booking.studio.name}</strong>.</p>
                
                <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                  <h2 style="color: #3498db; margin-top: 0;">Session Details</h2>
                  <p><strong>Service:</strong> ${booking.service.name}</p>
                  <p><strong>Date & Time:</strong> ${formattedDate}</p>
                  ${booking.customerNotes ? `<p><strong>Your Notes:</strong> ${booking.customerNotes}</p>` : ""}
                </div>

                <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
                  <p style="margin: 0;"><strong>📝 Please Remember:</strong></p>
                  <ul style="margin: 10px 0;">
                    <li>Arrive 10 minutes early</li>
                    <li>Bring any props or outfits discussed</li>
                    <li>Let us know if you need to reschedule</li>
                  </ul>
                </div>
                
                <div style="background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p style="margin: 0;"><strong>Questions or need to reschedule?</strong></p>
                  <p style="margin: 5px 0;">Email: ${booking.studio.email}</p>
                  <p style="margin: 5px 0;">Phone: ${booking.studio.phone}</p>
                </div>

                <p>We look forward to seeing you!</p>
                <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
                  Best regards,<br>${booking.studio.name}
                </p>
              </div>
            </body>
          </html>
        `,
      });

      this.logger.log(
        `Booking reminder sent to ${booking.customer.email}: ${result.data?.id}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to send booking reminder: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send payment reminder for overdue invoices
   */
  async sendPaymentReminder(invoice: any) {
    if (!this.resend) {
      this.logger.warn("Resend not configured, skipping email");
      return;
    }

    try {
      const dueDate = invoice.dueDate
        ? new Date(invoice.dueDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "Not specified";

      const paidAmount = invoice.payments.reduce(
        (sum: number, payment: any) => sum + Number(payment.amount),
        0,
      );
      const remainingAmount = Number(invoice.total) - paidAmount;

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: invoice.customer.email,
        subject: `Payment Reminder - Invoice #${invoice.invoiceNumber}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Payment Reminder</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
                <h1 style="color: #2c3e50; margin-top: 0;">💳 Payment Reminder</h1>
                <p>Hi ${invoice.customer.name},</p>
                <p>This is a friendly reminder about your outstanding payment with <strong>${invoice.studio.name}</strong>.</p>
                
                <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                  <h2 style="color: #3498db; margin-top: 0;">Invoice Details</h2>
                  <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
                  <p><strong>Total Amount:</strong> ₹${Number(invoice.total).toLocaleString()}</p>
                  ${paidAmount > 0 ? `<p><strong>Paid:</strong> ₹${paidAmount.toLocaleString()}</p>` : ""}
                  <p><strong>Amount Due:</strong> ₹${remainingAmount.toLocaleString()}</p>
                  <p><strong>Due Date:</strong> ${dueDate}</p>
                  <p><strong>Status:</strong> <span style="color: #dc3545; font-weight: bold;">${invoice.status}</span></p>
                </div>

                <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
                  <p style="margin: 0;"><strong>⚠️ Action Required:</strong></p>
                  <p style="margin: 10px 0;">Please submit your payment at your earliest convenience to avoid any service interruptions.</p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="#" style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Make Payment</a>
                </div>
                
                <div style="background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p style="margin: 0;"><strong>Payment Methods:</strong></p>
                  <ul style="margin: 10px 0;">
                    <li>Bank Transfer</li>
                    <li>UPI</li>
                    <li>Cash</li>
                    <li>Card</li>
                  </ul>
                  <p style="margin: 5px 0;"><strong>Contact:</strong> ${invoice.studio.email} | ${invoice.studio.phone}</p>
                </div>

                <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
                  Thank you for your business!<br>${invoice.studio.name}
                </p>
              </div>
            </body>
          </html>
        `,
      });

      this.logger.log(
        `Payment reminder sent to ${invoice.customer.email}: ${result.data?.id}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to send payment reminder: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send follow-up email after booking completion
   */
  async sendFollowUpEmail(booking: any) {
    if (!this.resend) {
      this.logger.warn("Resend not configured, skipping email");
      return;
    }

    try {
      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: booking.customer.email,
        subject: `Thank you for choosing ${booking.studio.name}!`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Thank You</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
                <h1 style="color: #2c3e50; margin-top: 0;">🎉 Thank You!</h1>
                <p>Hi ${booking.customer.name},</p>
                <p>Thank you for choosing <strong>${booking.studio.name}</strong> for your ${booking.service.name} session!</p>
                
                <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                  <h2 style="color: #3498db; margin-top: 0;">We Hope You Loved Your Experience!</h2>
                  <p>Your photos will be ready for review soon. We'll notify you as soon as they're available.</p>
                </div>

                <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
                  <p style="margin: 0;"><strong>⭐ Loved our service?</strong></p>
                  <p style="margin: 10px 0;">We'd love to hear your feedback! Please take a moment to leave us a review.</p>
                  <div style="text-align: center; margin: 15px 0;">
                    <a href="#" style="background-color: #28a745; color: white; padding: 10px 25px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Leave a Review</a>
                  </div>
                </div>

                <div style="background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p style="margin: 0;"><strong>💡 Share Your Photos!</strong></p>
                  <p style="margin: 10px 0;">Tag us on social media when you share your photos:</p>
                  <p style="margin: 5px 0;">Instagram: @${booking.studio.name.toLowerCase().replace(/\s+/g, "")}</p>
                  <p style="margin: 5px 0;">Facebook: ${booking.studio.name}</p>
                </div>

                <h3 style="color: #2c3e50;">Book Your Next Session</h3>
                <p>Planning another event? We'd love to work with you again!</p>
                <div style="text-align: center; margin: 20px 0;">
                  <a href="#" style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Book Again</a>
                </div>

                <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p style="margin: 0;"><strong>🎁 Referral Bonus</strong></p>
                  <p style="margin: 10px 0;">Refer a friend and both of you get 10% off your next session!</p>
                </div>

                <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
                  Thank you for your trust,<br>${booking.studio.name}<br>
                  ${booking.studio.email} | ${booking.studio.phone}
                </p>
              </div>
            </body>
          </html>
        `,
      });

      this.logger.log(
        `Follow-up email sent to ${booking.customer.email}: ${result.data?.id}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to send follow-up email: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
