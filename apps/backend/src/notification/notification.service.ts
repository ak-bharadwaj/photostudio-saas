import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";
import * as nodemailer from "nodemailer";

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
  /** ISO 4217 currency code for formatting the amount (e.g. "INR", "USD"). Defaults to "INR". */
  currency?: string;
}

interface BookingReminderData {
  scheduledAt: Date | string;
  customerNotes?: string | null;
  customer: { name: string; email: string | null };
  service: { name: string };
  studio: { name: string; email: string; phone: string | null };
}

interface PaymentReminderData {
  dueDate?: Date | string | null;
  total: unknown;
  invoiceNumber: string;
  status: string;
  payments: Array<{ amount: unknown }>;
  customer: { name: string; email: string | null };
  studio: {
    name: string;
    email: string;
    phone: string | null;
    currency?: string | null;
  };
}

interface FollowUpEmailData {
  customer: { name: string; email: string | null };
  service: { name: string };
  studio: { name: string; email: string; phone: string | null; slug: string };
}

@Injectable()
export class NotificationService {
  private resend!: Resend | null;
  private transporter!: nodemailer.Transporter | null;
  private readonly logger = new Logger(NotificationService.name);
  private readonly fromEmail: string;

  /** Escape user-supplied strings before embedding in HTML email templates. */
  private esc(str: string | null | undefined): string {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");
  }

  /**
   * Format a numeric amount using the studio's configured currency.
   * Falls back to INR if the currency code is invalid.
   */
  private formatAmount(amount: number, currency = "INR"): string {
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
      }).format(amount);
    } catch {
      // Unknown currency code — fall back to prefixed number
      return `${currency} ${amount.toFixed(2)}`;
    }
  }

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>("email.resendApiKey");
    this.fromEmail =
      this.configService.get<string>("email.fromEmail") ||
      "noreply@yourdomain.com";

    // Initialize Resend if API key is present
    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.resend = null;
    }

    // Initialize Nodemailer if SMTP config is present
    const smtpUser = this.configService.get<string>("email.user");
    const smtpPass = this.configService.get<string>("email.pass");
    const smtpHost = this.configService.get<string>("email.host");
    const smtpPort = this.configService.get<number>("email.port");

    if (smtpUser && smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      this.logger.log("Nodemailer SMTP transporter initialized");
    } else {
      this.transporter = null;
      if (!apiKey) {
        this.logger.warn(
          "Neither Resend nor SMTP configured. Email notifications will not be sent.",
        );
      }
    }
  }

  private async sendEmail(options: { to: string; subject: string; html: string }) {
    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: `ReviewsFeedback <${this.fromEmail}>`,
          to: options.to,
          subject: options.subject,
          html: options.html,
        });
        this.logger.log(`Email sent via SMTP to ${options.to}: ${info.messageId}`);
        return { data: { id: info.messageId } };
      } catch (error) {
        this.logger.error("Failed to send email via SMTP", error);
        throw error;
      }
    } else if (this.resend) {
      try {
        const result = await this.resend.emails.send({
          from: `ReviewsFeedback <${this.fromEmail}>`,
          to: options.to,
          subject: options.subject,
          html: options.html,
        });
        this.logger.log(`Email sent via Resend to ${options.to}: ${result.data?.id}`);
        return result;
      } catch (error) {
        this.logger.error("Failed to send email via Resend", error);
        throw error;
      }
    } else {
      this.logger.warn("No email provider configured, skipping email");
      return null;
    }
  }

  async sendBookingConfirmation(data: BookingConfirmationEmailData) {
    try {
      const formattedDate = data.scheduledDate.toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const result = await this.sendEmail({
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
                 <p>Hi ${this.esc(data.customerName)},</p>
                 <p>Thank you for your booking inquiry with <strong>${this.esc(data.studioName)}</strong>.</p>
                 
                 <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                   <h2 style="color: #3498db; margin-top: 0;">Booking Details</h2>
                   <p><strong>Service:</strong> ${this.esc(data.serviceName)}</p>
                   <p><strong>Scheduled Date:</strong> ${this.esc(formattedDate)}</p>
                   <p><strong>Booking ID:</strong> ${this.esc(data.bookingId)}</p>
                 </div>

                 <p>We will review your booking and get back to you shortly to confirm availability.</p>
                 
                 <div style="background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                   <p style="margin: 0;"><strong>Questions?</strong> Contact us:</p>
                   <p style="margin: 5px 0;">Email: ${this.esc(data.studioEmail)}</p>
                   <p style="margin: 5px 0;">Phone: ${this.esc(data.studioPhone)}</p>
                 </div>

                <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
                  This is an automated email. Please do not reply directly to this message.
                </p>
              </div>
            </body>
          </html>
        `,
      });

      return result;
    } catch (error: unknown) {
      this.logger.error("Failed to send booking confirmation email", error);
      throw error;
    }
  }

  async sendBookingStatusUpdate(data: BookingStatusUpdateEmailData) {
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

      const result = await this.sendEmail({
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
                 <p>Hi ${this.esc(data.customerName)},</p>
                 <p>${statusInfo.message}</p>
                 
                 <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                   <h2 style="color: #3498db; margin-top: 0;">Booking Details</h2>
                   <p><strong>Service:</strong> ${this.esc(data.serviceName)}</p>
                   <p><strong>Scheduled Date:</strong> ${this.esc(formattedDate)}</p>
                   <p><strong>Status:</strong> <span style="color: ${statusInfo.color};">${this.esc(data.newStatus)}</span></p>
                   ${data.notes ? `<p><strong>Notes:</strong> ${this.esc(data.notes)}</p>` : ""}
                 </div>

                 <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
                   If you have any questions, please contact ${this.esc(data.studioName)}.
                 </p>
              </div>
            </body>
          </html>
        `,
      });

      return result;
    } catch (error: unknown) {
      this.logger.error("Failed to send booking status update email", error);
      throw error;
    }
  }

  async sendInvoice(data: InvoiceEmailData) {
    try {
      const formattedDueDate = data.dueDate
        ? data.dueDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "Upon receipt";

      const result = await this.sendEmail({
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
                 <p>Hi ${this.esc(data.customerName)},</p>
                 <p>You have received a new invoice from <strong>${this.esc(data.studioName)}</strong>.</p>
                 
                 <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                   <h2 style="color: #3498db; margin-top: 0;">Invoice Details</h2>
                   <p><strong>Invoice Number:</strong> ${this.esc(data.invoiceNumber)}</p>
                   <p><strong>Amount Due:</strong> ${this.formatAmount(data.total, data.currency)}</p>
                   <p><strong>Due Date:</strong> ${this.esc(formattedDueDate)}</p>
                 </div>

                 ${
                   data.invoiceUrl
                     ? `
                 <div style="text-align: center; margin: 30px 0;">
                   <a href="${this.esc(data.invoiceUrl)}" style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">View Invoice</a>
                 </div>
                 `
                     : ""
                 }

                 <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
                   If you have any questions about this invoice, please contact ${this.esc(data.studioName)}.
                 </p>
              </div>
            </body>
          </html>
        `,
      });

      return result;
    } catch (error: unknown) {
      this.logger.error("Failed to send invoice email", error);
      throw error;
    }
  }

  async sendStudioWelcome(
    email: string,
    studioName: string,
    ownerName: string,
    slug: string,
  ) {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL");
    if (!frontendUrl) {
      this.logger.error(
        "FRONTEND_URL env var is not set — cannot build email links",
      );
    }
    const baseUrl = frontendUrl ?? "";

    try {
      const result = await this.sendEmail({
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
                 <p>Hi ${this.esc(ownerName)},</p>
                 <p>Your studio <strong>${this.esc(studioName)}</strong> has been successfully created!</p>
                 
                 <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                   <h2 style="color: #3498db; margin-top: 0;">Your Studio Details</h2>
                   <p><strong>Studio Name:</strong> ${this.esc(studioName)}</p>
                   <p><strong>Studio URL:</strong> yourdomain.com/studio/${this.esc(slug)}</p>
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
                  <a href="${baseUrl}/dashboard" style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Go to Dashboard</a>
                </div>

                <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
                  Need help? Contact our support team anytime.
                </p>
              </div>
            </body>
          </html>
        `,
      });

      return result;
    } catch (error: unknown) {
      this.logger.error("Failed to send studio welcome email", error);
      throw error;
    }
  }

  /**
   * Send booking reminder (1 day before event)
   */
  async sendBookingReminder(booking: BookingReminderData) {
    try {
      if (!booking.customer.email) {
        this.logger.warn(
          `No email for customer "${booking.customer.name}", skipping booking reminder`,
        );
        return;
      }

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

      const result = await this.sendEmail({
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
                 <p>Hi ${this.esc(booking.customer.name)},</p>
                 <p>This is a friendly reminder about your upcoming photography session with <strong>${this.esc(booking.studio.name)}</strong>.</p>
                 
                 <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                   <h2 style="color: #3498db; margin-top: 0;">Session Details</h2>
                   <p><strong>Service:</strong> ${this.esc(booking.service.name)}</p>
                   <p><strong>Date & Time:</strong> ${this.esc(formattedDate)}</p>
                   ${booking.customerNotes ? `<p><strong>Your Notes:</strong> ${this.esc(booking.customerNotes)}</p>` : ""}
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
                   <p style="margin: 5px 0;">Email: ${this.esc(booking.studio.email)}</p>
                   <p style="margin: 5px 0;">Phone: ${this.esc(booking.studio.phone)}</p>
                 </div>

                 <p>We look forward to seeing you!</p>
                 <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
                   Best regards,<br>${this.esc(booking.studio.name)}
                 </p>
              </div>
            </body>
          </html>
        `,
      });

      return result;
    } catch (error: unknown) {
      this.logger.error("Failed to send booking reminder", error);
      throw error;
    }
  }

  /**
   * Send payment reminder for overdue invoices
   */
  async sendPaymentReminder(invoice: PaymentReminderData) {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL");
    if (!frontendUrl) {
      this.logger.error(
        "FRONTEND_URL env var is not set — cannot build email links",
      );
    }
    const baseUrl = frontendUrl ?? "";

    try {
      if (!invoice.customer.email) {
        this.logger.warn(
          `No email for customer "${invoice.customer.name}", skipping payment reminder for invoice #${invoice.invoiceNumber}`,
        );
        return;
      }

      const dueDate = invoice.dueDate
        ? new Date(invoice.dueDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "Not specified";

      const paidAmount = invoice.payments.reduce(
        (sum: number, payment: { amount: unknown }) =>
          sum + Number(payment.amount),
        0,
      );
      const remainingAmount = Number(invoice.total) - paidAmount;

      const result = await this.sendEmail({
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
                 <p>Hi ${this.esc(invoice.customer.name)},</p>
                 <p>This is a friendly reminder about your outstanding payment with <strong>${this.esc(invoice.studio.name)}</strong>.</p>
                 
                 <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                   <h2 style="color: #3498db; margin-top: 0;">Invoice Details</h2>
                   <p><strong>Invoice Number:</strong> ${this.esc(invoice.invoiceNumber)}</p>
                   <p><strong>Total Amount:</strong> ${this.formatAmount(Number(invoice.total), invoice.studio?.currency ?? undefined)}</p>
                   ${paidAmount > 0 ? `<p><strong>Paid:</strong> ${this.formatAmount(paidAmount, invoice.studio?.currency ?? undefined)}</p>` : ""}
                   <p><strong>Amount Due:</strong> ${this.formatAmount(remainingAmount, invoice.studio?.currency ?? undefined)}</p>
                   <p><strong>Due Date:</strong> ${this.esc(dueDate)}</p>
                   <p><strong>Status:</strong> <span style="color: #dc3545; font-weight: bold;">${this.esc(invoice.status)}</span></p>
                 </div>

                 <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
                   <p style="margin: 0;"><strong>⚠️ Action Required:</strong></p>
                   <p style="margin: 10px 0;">Please submit your payment at your earliest convenience to avoid any service interruptions.</p>
                 </div>

                 <div style="text-align: center; margin: 30px 0;">
                   <a href="${baseUrl}/portal" style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Make Payment</a>
                 </div>
                 
                 <div style="background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                   <p style="margin: 0;"><strong>Payment Methods:</strong></p>
                   <ul style="margin: 10px 0;">
                     <li>Bank Transfer</li>
                     <li>UPI</li>
                     <li>Cash</li>
                     <li>Card</li>
                   </ul>
                   <p style="margin: 5px 0;"><strong>Contact:</strong> ${this.esc(invoice.studio.email)} | ${this.esc(invoice.studio.phone)}</p>
                 </div>

                 <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
                   Thank you for your business!<br>${this.esc(invoice.studio.name)}
                 </p>
              </div>
            </body>
          </html>
        `,
      });

      return result;
    } catch (error: unknown) {
      this.logger.error("Failed to send payment reminder", error);
      throw error;
    }
  }

  /**
   * Send follow-up email after booking completion
   */
  async sendFollowUpEmail(booking: FollowUpEmailData) {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL");
    if (!frontendUrl) {
      this.logger.error(
        "FRONTEND_URL env var is not set — cannot build email links",
      );
    }
    const baseUrl = frontendUrl ?? "";

    try {
      if (!booking.customer.email) {
        this.logger.warn(
          `No email for customer "${booking.customer.name}", skipping follow-up email`,
        );
        return;
      }

      const result = await this.sendEmail({
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
                 <p>Hi ${this.esc(booking.customer.name)},</p>
                 <p>Thank you for choosing <strong>${this.esc(booking.studio.name)}</strong> for your ${this.esc(booking.service.name)} session!</p>
                 
                 <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                   <h2 style="color: #3498db; margin-top: 0;">We Hope You Loved Your Experience!</h2>
                   <p>Your photos will be ready for review soon. We'll notify you as soon as they're available.</p>
                 </div>

                 <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
                   <p style="margin: 0;"><strong>⭐ Loved our service?</strong></p>
                   <p style="margin: 10px 0;">We'd love to hear your feedback! Please take a moment to leave us a review.</p>
                    <div style="text-align: center; margin: 15px 0;">
                       <a href="${baseUrl}/portal" style="background-color: #28a745; color: white; padding: 10px 25px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Leave a Review</a>
                    </div>
                 </div>

                 <div style="background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                   <p style="margin: 0;"><strong>💡 Share Your Photos!</strong></p>
                   <p style="margin: 10px 0;">Tag us on social media when you share your photos:</p>
                   <p style="margin: 5px 0;">Instagram: @${this.esc(booking.studio.name.toLowerCase().replace(/[^a-z0-9._]/g, ""))}</p>
                   <p style="margin: 5px 0;">Facebook: ${this.esc(booking.studio.name)}</p>
                 </div>

                 <h3 style="color: #2c3e50;">Book Your Next Session</h3>
                 <p>Planning another event? We'd love to work with you again!</p>
                  <div style="text-align: center; margin: 20px 0;">
                     <a href="${baseUrl}/studio/${this.esc(booking.studio.slug)}" style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Book Again</a>
                  </div>

                 <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                   <p style="margin: 0;"><strong>🎁 Referral Bonus</strong></p>
                   <p style="margin: 10px 0;">Refer a friend and both of you get 10% off your next session!</p>
                 </div>

                 <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
                   Thank you for your trust,<br>${this.esc(booking.studio.name)}<br>
                   ${this.esc(booking.studio.email)} | ${this.esc(booking.studio.phone)}
                 </p>
              </div>
            </body>
          </html>
        `,
      });

      return result;
    } catch (error: unknown) {
      this.logger.error("Failed to send follow-up email", error);
      throw error;
    }
  }

  async sendPasswordResetEmail(email: string, name: string, resetUrl: string) {
    try {
      const result = await this.sendEmail({
        to: email,
        subject: "Reset Your Password - ReviewsFeedback",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Reset Password</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
                <h1 style="color: #2c3e50; margin-top: 0;">Password Reset Request</h1>
                 <p>Hi ${this.esc(name)},</p>
                 <p>We received a request to reset your password for your <strong>ReviewsFeedback</strong> account.</p>
                 
                 <div style="text-align: center; margin: 30px 0;">
                   <a href="${this.esc(resetUrl)}" style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset My Password</a>
                 </div>

                 <p>If you didn't request this, you can safely ignore this email. This link will expire in 15 minutes.</p>
                 
                 <p style="word-break: break-all; color: #7f8c8d; font-size: 12px;">
                   If you're having trouble clicking the button, copy and paste this URL into your browser:<br>
                   ${this.esc(resetUrl)}
                 </p>

                <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
                  Best regards,<br>The ReviewsFeedback Team
                </p>
              </div>
            </body>
          </html>
        `,
      });

      return result;
    } catch (error: unknown) {
      this.logger.error("Failed to send password reset email", error);
      throw error;
    }
  }
}
