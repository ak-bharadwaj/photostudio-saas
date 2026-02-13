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

  private generateInvoiceHtml(data: InvoiceData): string {
    const formatDate = (date: Date) => {
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };

    const formatCurrency = (amount: number) => {
      return `$${amount.toFixed(2)}`;
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
            ${
              data.discount > 0
                ? `
            <div class="totals-row subtotal">
              <span>Discount:</span>
              <span>-${formatCurrency(data.discount)}</span>
            </div>
            `
                : ""
            }
            ${
              data.tax > 0
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

          ${
            data.notes
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
}
