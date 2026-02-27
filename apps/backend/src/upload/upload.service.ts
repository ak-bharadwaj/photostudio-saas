import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import * as fs from "fs";
import * as path from "path";
const { v4: uuidv4 } = require("uuid");

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly useLocalFallback: boolean;
  private readonly localUploadDir: string;
  private readonly localBaseUrl: string;

  constructor(private configService: ConfigService) {
    const cloudinaryUrl =
      this.configService.get<string>("CLOUDINARY_URL") || "";
    const isPlaceholder =
      !cloudinaryUrl ||
      cloudinaryUrl.includes("<your_api_key>") ||
      cloudinaryUrl.includes("<your_api_secret>") ||
      cloudinaryUrl === "cloudinary://undefined:undefined@undefined";

    if (!isPlaceholder) {
      cloudinary.config({ cloudinary_url: cloudinaryUrl });
      this.useLocalFallback = false;
      this.logger.log("Cloudinary configured — using cloud storage");
    } else {
      this.useLocalFallback = true;
      this.logger.warn(
        "CLOUDINARY_URL not configured — falling back to local disk storage. " +
          "Set a real CLOUDINARY_URL in .env to use cloud storage.",
      );
    }

    // Local fallback paths
    this.localUploadDir = path.join(process.cwd(), "public", "uploads");
    const port = this.configService.get<number>("PORT") || 3000;
    this.localBaseUrl = `http://localhost:${port}/uploads`;
  }

  /** Upload studio logo */
  async uploadStudioLogo(
    studioId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    if (this.useLocalFallback) {
      return this.saveLocally(file, `logo`);
    }
    try {
      const result = await this.uploadToCloudinary(file.buffer, {
        folder: `studios/${studioId}/logo`,
        transformation: [
          { width: 500, height: 500, crop: "limit" },
          { quality: "auto" },
          { fetch_format: "auto" },
        ],
        allowed_formats: ["jpg", "jpeg", "png", "webp", "gif", "svg"],
      });
      return result.secure_url;
    } catch (error) {
      throw new BadRequestException(`Failed to upload logo: ${error.message}`);
    }
  }

  /** Upload portfolio image */
  async uploadPortfolioImage(
    studioId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    if (this.useLocalFallback) {
      return this.saveLocally(file, `portfolio`);
    }
    try {
      const result = await this.uploadToCloudinary(file.buffer, {
        folder: `studios/${studioId}/portfolio`,
        transformation: [
          { width: 1920, height: 1920, crop: "limit" },
          { quality: "auto" },
          { fetch_format: "auto" },
        ],
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
      });
      return result.secure_url;
    } catch (error) {
      throw new BadRequestException(
        `Failed to upload portfolio image: ${error.message}`,
      );
    }
  }

  /** Upload service cover image */
  async uploadServiceCover(
    studioId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    if (this.useLocalFallback) {
      return this.saveLocally(file, `service`);
    }
    try {
      const result = await this.uploadToCloudinary(file.buffer, {
        folder: `studios/${studioId}/services`,
        transformation: [
          { width: 800, height: 600, crop: "limit" },
          { quality: "auto" },
          { fetch_format: "auto" },
        ],
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
      });
      return result.secure_url;
    } catch (error) {
      throw new BadRequestException(
        `Failed to upload service cover: ${error.message}`,
      );
    }
  }

  /** Upload contract PDF */
  async uploadContractPDF(
    studioId: string,
    bookingId: string,
    buffer: Buffer,
  ): Promise<string> {
    if (this.useLocalFallback) {
      return this.saveBufferLocally(buffer, `contract_${bookingId}.pdf`);
    }
    try {
      const result = await this.uploadToCloudinary(buffer, {
        folder: `studios/${studioId}/contracts`,
        resource_type: "raw",
        public_id: `contract_${bookingId}`,
        allowed_formats: ["pdf"],
      });
      return result.secure_url;
    } catch (error) {
      throw new BadRequestException(
        `Failed to upload contract PDF: ${error.message}`,
      );
    }
  }

  /** Upload invoice PDF */
  async uploadInvoicePDF(
    studioId: string,
    invoiceNumber: string,
    buffer: Buffer,
  ): Promise<string> {
    if (this.useLocalFallback) {
      return this.saveBufferLocally(buffer, `invoice_${invoiceNumber}.pdf`);
    }
    try {
      const result = await this.uploadToCloudinary(buffer, {
        folder: `studios/${studioId}/invoices`,
        resource_type: "raw",
        public_id: `invoice_${invoiceNumber}`,
        allowed_formats: ["pdf"],
      });
      return result.secure_url;
    } catch (error) {
      throw new BadRequestException(
        `Failed to upload invoice PDF: ${error.message}`,
      );
    }
  }

  /** Delete a Cloudinary file (no-op for local) */
  async deleteFile(publicId: string): Promise<void> {
    if (this.useLocalFallback) return;
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error: any) {
      this.logger.error(`Failed to delete file ${publicId}:`, error.stack);
    }
  }

  /** Get optimised image URL */
  getOptimizedImageUrl(
    publicId: string,
    options: {
      width?: number;
      height?: number;
      crop?: string;
      quality?: string;
      format?: string;
    } = {},
  ): string {
    if (this.useLocalFallback) return publicId; // already a full URL
    return cloudinary.url(publicId, {
      width: options.width,
      height: options.height,
      crop: options.crop || "fill",
      quality: options.quality || "auto",
      fetch_format: options.format || "auto",
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Private Helpers                                                     */
  /* ------------------------------------------------------------------ */

  /** Save an uploaded file to local disk and return a public URL */
  private saveLocally(file: Express.Multer.File, prefix: string): string {
    return this.saveBufferLocally(
      file.buffer,
      `${prefix}_${uuidv4()}${this.extFromMime(file.mimetype)}`,
    );
  }

  private saveBufferLocally(buffer: Buffer, filename: string): string {
    const dir = this.localUploadDir;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = path.join(dir, safeFilename);
    fs.writeFileSync(filePath, buffer);
    this.logger.log(`Saved file locally: ${filePath}`);
    return `${this.localBaseUrl}/${safeFilename}`;
  }

  private extFromMime(mime: string): string {
    const map: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/gif": ".gif",
      "image/svg+xml": ".svg",
      "application/pdf": ".pdf",
    };
    return map[mime] ?? ".bin";
  }

  /** Helper: stream buffer to Cloudinary */
  private uploadToCloudinary(
    fileBuffer: Buffer,
    options: any,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error) reject(error);
          else if (result) resolve(result);
          else reject(new Error("Upload failed: no result returned"));
        },
      );
      stream.end(fileBuffer);
    });
  }
}
