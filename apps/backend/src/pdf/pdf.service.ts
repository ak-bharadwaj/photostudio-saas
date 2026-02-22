import { Injectable, Logger } from "@nestjs/common";
import puppeteer, { Browser } from "puppeteer";

interface InvoiceData {
  invoiceNumber: string;
  studioName: string;
  studioEmail: string;
  studioPhone: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  dueDate?: Date;
  notes?: string;
  createdAt: Date;
}

interface ContractData {
  studioName: string;
  studioEmail: string;
  studioPhone: string;
  studioLogo?: string;
  primaryColor?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  serviceName: string;
  serviceDescription?: string;
  scheduledAt: Date;
  location?: string;
  price: number;
  terms: string;
  bookingId: string;
  acceptedAt: Date;
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private browser: Browser | null = null;

  async onModuleInit() {
    // Initialize browser on module startup
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      this.logger.log("Puppeteer browser initialized");
    } catch (error) {
      this.logger.error("Failed to initialize Puppeteer browser", error.stack);
    }
  }

  async onModuleDestroy() {
    // Close browser on module shutdown
    if (this.browser) {
      await this.browser.close();
      this.logger.log("Puppeteer browser closed");
    }
  }

  async generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
    if (!this.browser) {
      throw new Error("Puppeteer browser not initialized");
    }

    const page = await this.browser.newPage();

    try {
      const html = this.generateInvoiceHtml(data);
      await page.setContent(html, { waitUntil: "networkidle0" });

      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "20px",
          right: "20px",
          bottom: "20px",
          left: "20px",
        },
      });

      this.logger.log(`Generated PDF for invoice ${data.invoiceNumber}`);
      return Buffer.from(pdf);
    } catch (error) {
      this.logger.error("Failed to generate PDF", error.stack);
      throw error;
    } finally {
      await page.close();
    }
  }

  async generateContractPdf(data: ContractData): Promise<Buffer> {
    if (!this.browser) {
      throw new Error("Puppeteer browser not initialized");
    }

    const page = await this.browser.newPage();

    try {
      const html = this.generateContractHtml(data);
      await page.setContent(html, { waitUntil: "networkidle0" });

      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "30px",
          right: "30px",
          bottom: "30px",
          left: "30px",
        },
      });

      this.logger.log(
        `Generated contract PDF for booking ${data.bookingId}`,
      );
      return Buffer.from(pdf);
    } catch (error) {
      this.logger.error("Failed to generate contract PDF", error.stack);
      throw error;
    } finally {
      await page.close();
    }
  }

  private generateInvoiceHtml(data: InvoiceData): string {
    const formatDate = (date: Date) => {
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };

    const formatCurrency = (amount: number) => {
      return `₹${amount.toLocaleString("en-IN")}`;
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Invoice ${data.invoiceNumber}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Helvetica', 'Arial', sans-serif;
              color: #333;
              line-height: 1.6;
              padding: 40px;
            }
            .invoice-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 40px;
              padding-bottom: 20px;
              border-bottom: 2px solid #3498db;
            }
            .studio-info h1 {
              color: #2c3e50;
              font-size: 28px;
              margin-bottom: 10px;
            }
            .studio-info p {
              color: #7f8c8d;
              font-size: 14px;
              margin: 2px 0;
            }
            .invoice-meta {
              text-align: right;
            }
            .invoice-meta h2 {
              color: #3498db;
              font-size: 32px;
              margin-bottom: 10px;
            }
            .invoice-meta p {
              color: #7f8c8d;
              font-size: 14px;
              margin: 2px 0;
            }
            .billing-section {
              margin-bottom: 40px;
            }
            .billing-section h3 {
              color: #2c3e50;
              font-size: 16px;
              margin-bottom: 10px;
            }
            .billing-section p {
              color: #555;
              font-size: 14px;
              margin: 2px 0;
            }
            .line-items {
              margin-bottom: 40px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            thead {
              background-color: #ecf0f1;
            }
            th {
              text-align: left;
              padding: 12px;
              color: #2c3e50;
              font-weight: 600;
              font-size: 14px;
            }
            td {
              padding: 12px;
              border-bottom: 1px solid #ecf0f1;
              font-size: 14px;
            }
            .text-right {
              text-align: right;
            }
            .totals {
              margin-left: auto;
              width: 300px;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 12px;
              font-size: 14px;
            }
            .totals-row.subtotal {
              color: #7f8c8d;
            }
            .totals-row.total {
              background-color: #3498db;
              color: white;
              font-weight: bold;
              font-size: 18px;
              margin-top: 10px;
            }
            .notes {
              margin-top: 40px;
              padding: 20px;
              background-color: #f8f9fa;
              border-radius: 5px;
            }
            .notes h3 {
              color: #2c3e50;
              font-size: 16px;
              margin-bottom: 10px;
            }
            .notes p {
              color: #555;
              font-size: 14px;
              white-space: pre-wrap;
            }
            .footer {
              margin-top: 60px;
              text-align: center;
              color: #95a5a6;
              font-size: 12px;
              padding-top: 20px;
              border-top: 1px solid #ecf0f1;
            }
          </style>
        </head>
        <body>
          <div class="invoice-header">
            <div class="studio-info">
              <h1>${data.studioName}</h1>
              <p>${data.studioEmail}</p>
              <p>${data.studioPhone}</p>
            </div>
            <div class="invoice-meta">
              <h2>INVOICE</h2>
              <p><strong>Invoice #:</strong> ${data.invoiceNumber}</p>
              <p><strong>Date:</strong> ${formatDate(data.createdAt)}</p>
              ${data.dueDate ? `<p><strong>Due Date:</strong> ${formatDate(data.dueDate)}</p>` : ""}
            </div>
          </div>

          <div class="billing-section">
            <h3>Bill To:</h3>
            <p><strong>${data.customerName}</strong></p>
            ${data.customerEmail ? `<p>${data.customerEmail}</p>` : ""}
            <p>${data.customerPhone}</p>
          </div>

          <div class="line-items">
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th class="text-right">Quantity</th>
                  <th class="text-right">Rate</th>
                  <th class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${data.lineItems
        .map(
          (item) => `
                  <tr>
                    <td>${item.description}</td>
                    <td class="text-right">${item.quantity}</td>
                    <td class="text-right">${formatCurrency(item.rate)}</td>
                    <td class="text-right">${formatCurrency(item.amount)}</td>
                  </tr>
                `,
        )
        .join("")}
              </tbody>
            </table>
          </div>

          <div class="totals">
            <div class="totals-row subtotal">
              <span>Subtotal:</span>
              <span>${formatCurrency(data.subtotal)}</span>
            </div>
            ${data.discount > 0
        ? `
            <div class="totals-row subtotal">
              <span>Discount:</span>
              <span>-${formatCurrency(data.discount)}</span>
            </div>
            `
        : ""
      }
            ${data.tax > 0
        ? `
            <div class="totals-row subtotal">
              <span>Tax:</span>
              <span>${formatCurrency(data.tax)}</span>
            </div>
            `
        : ""
      }
            <div class="totals-row total">
              <span>Total:</span>
              <span>${formatCurrency(data.total)}</span>
            </div>
          </div>

          ${data.notes
        ? `
          <div class="notes">
            <h3>Notes:</h3>
            <p>${data.notes}</p>
          </div>
          `
        : ""
      }

          <div class="footer">
            <p>Thank you for your business!</p>
            <p>This invoice was generated on ${formatDate(new Date())}</p>
          </div>
        </body>
      </html>
    `;
  }

  private generateContractHtml(data: ContractData): string {
    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };

    const formatDateTime = (date: Date) => {
      return new Date(date).toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    const formatCurrency = (amount: number) => {
      return `₹${amount.toLocaleString("en-IN")}`;
    };

    const primaryColor = data.primaryColor || "#3498db";

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Booking Contract - ${data.bookingId}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Helvetica', 'Arial', sans-serif;
              color: #333;
              line-height: 1.7;
              padding: 40px;
              font-size: 14px;
            }
            .contract-header {
              text-align: center;
              margin-bottom: 40px;
              padding-bottom: 20px;
              border-bottom: 3px solid ${primaryColor};
            }
            .contract-header h1 {
              color: ${primaryColor};
              font-size: 28px;
              margin-bottom: 5px;
            }
            .contract-header h2 {
              color: #2c3e50;
              font-size: 18px;
              font-weight: 400;
              margin-bottom: 10px;
            }
            .contract-header .ref {
              color: #7f8c8d;
              font-size: 12px;
            }
            .section {
              margin-bottom: 30px;
            }
            .section h3 {
              color: ${primaryColor};
              font-size: 16px;
              margin-bottom: 12px;
              padding-bottom: 5px;
              border-bottom: 1px solid #ecf0f1;
            }
            .details-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
            }
            .detail-group {
              margin-bottom: 8px;
            }
            .detail-group label {
              display: block;
              font-size: 12px;
              color: #7f8c8d;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 2px;
            }
            .detail-group p {
              font-size: 14px;
              color: #2c3e50;
              font-weight: 500;
            }
            .service-box {
              background-color: #f8f9fa;
              border-radius: 8px;
              padding: 20px;
              border-left: 4px solid ${primaryColor};
            }
            .service-box .name {
              font-size: 18px;
              font-weight: 600;
              color: #2c3e50;
              margin-bottom: 5px;
            }
            .service-box .desc {
              color: #555;
              font-size: 13px;
              margin-bottom: 10px;
            }
            .service-box .price {
              font-size: 22px;
              font-weight: 700;
              color: ${primaryColor};
            }
            .terms-box {
              background-color: #fafafa;
              border: 1px solid #e0e0e0;
              border-radius: 8px;
              padding: 20px;
              max-height: none;
              white-space: pre-wrap;
              font-size: 13px;
              line-height: 1.6;
              color: #444;
            }
            .signature-section {
              margin-top: 40px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
            }
            .signature-block {
              padding-top: 20px;
            }
            .signature-block .label {
              font-size: 12px;
              color: #7f8c8d;
              text-transform: uppercase;
              margin-bottom: 30px;
            }
            .signature-line {
              border-bottom: 1px solid #333;
              margin-bottom: 8px;
              height: 30px;
            }
            .signature-name {
              font-size: 14px;
              color: #2c3e50;
              font-weight: 500;
            }
            .signature-date {
              font-size: 12px;
              color: #7f8c8d;
            }
            .acceptance-note {
              margin-top: 30px;
              padding: 15px;
              background-color: #e8f5e9;
              border-radius: 8px;
              border: 1px solid #c8e6c9;
              text-align: center;
            }
            .acceptance-note p {
              color: #2e7d32;
              font-size: 13px;
            }
            .acceptance-note .checkmark {
              font-size: 24px;
              margin-bottom: 5px;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              color: #95a5a6;
              font-size: 11px;
              padding-top: 20px;
              border-top: 1px solid #ecf0f1;
            }
          </style>
        </head>
        <body>
          <div class="contract-header">
            <h1>${data.studioName}</h1>
            <h2>Photography Service Contract</h2>
            <p class="ref">Contract Ref: ${data.bookingId}</p>
          </div>

          <div class="section">
            <h3>Parties</h3>
            <div class="details-grid">
              <div>
                <div class="detail-group">
                  <label>Service Provider</label>
                  <p>${data.studioName}</p>
                </div>
                <div class="detail-group">
                  <label>Email</label>
                  <p>${data.studioEmail}</p>
                </div>
                <div class="detail-group">
                  <label>Phone</label>
                  <p>${data.studioPhone}</p>
                </div>
              </div>
              <div>
                <div class="detail-group">
                  <label>Client</label>
                  <p>${data.customerName}</p>
                </div>
                ${data.customerEmail ? `<div class="detail-group"><label>Email</label><p>${data.customerEmail}</p></div>` : ""}
                <div class="detail-group">
                  <label>Phone</label>
                  <p>${data.customerPhone}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="section">
            <h3>Service Details</h3>
            <div class="service-box">
              <div class="name">${data.serviceName}</div>
              ${data.serviceDescription ? `<div class="desc">${data.serviceDescription}</div>` : ""}
              <div class="price">${formatCurrency(data.price)}</div>
            </div>
          </div>

          <div class="section">
            <h3>Schedule</h3>
            <div class="details-grid">
              <div class="detail-group">
                <label>Date & Time</label>
                <p>${formatDateTime(data.scheduledAt)}</p>
              </div>
              ${data.location
        ? `<div class="detail-group"><label>Location</label><p>${data.location}</p></div>`
        : ""
      }
            </div>
          </div>

          <div class="section">
            <h3>Terms & Conditions</h3>
            <div class="terms-box">${data.terms}</div>
          </div>

          <div class="signature-section">
            <div class="signature-block">
              <div class="label">Service Provider</div>
              <div class="signature-line"></div>
              <div class="signature-name">${data.studioName}</div>
            </div>
            <div class="signature-block">
              <div class="label">Client</div>
              <div class="signature-line"></div>
              <div class="signature-name">${data.customerName}</div>
              <div class="signature-date">Accepted on: ${formatDate(data.acceptedAt)}</div>
            </div>
          </div>

          <div class="acceptance-note">
            <div class="checkmark">&#10003;</div>
            <p>Terms accepted electronically by <strong>${data.customerName}</strong> on ${formatDateTime(data.acceptedAt)}</p>
          </div>

          <div class="footer">
            <p>This contract was generated electronically by ${data.studioName}</p>
            <p>Contract Reference: ${data.bookingId} | Generated on ${formatDate(new Date())}</p>
          </div>
        </body>
      </html>
    `;
  }
}
