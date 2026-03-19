import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiOptions,
} from "cloudinary";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly useLocalFallback: boolean;
  private readonly localUploadDir: string;
  private readonly localBaseUrl: string;
  private readonly s3Client: S3Client | null = null;
  private readonly r2BucketName: string;
  private readonly r2PublicUrl: string;

  constructor(private configService: ConfigService) {
    // -------------------------------------------------------------------------
    // Cloudflare R2 / S3 Configuration
    // -------------------------------------------------------------------------
    const r2AccessKeyId = this.configService.get<string>("R2_ACCESS_KEY_ID");
    const r2SecretAccessKey = this.configService.get<string>(
      "R2_SECRET_ACCESS_KEY",
    );
    const r2Endpoint = this.configService.get<string>("R2_ENDPOINT");
    this.r2BucketName = this.configService.get<string>("R2_BUCKET_NAME") || "";
    this.r2PublicUrl = this.configService.get<string>("R2_PUBLIC_URL") || "";

    if (r2AccessKeyId && r2SecretAccessKey && r2Endpoint) {
      this.s3Client = new S3Client({
        region: "auto",
        endpoint: r2Endpoint,
        credentials: {
          accessKeyId: r2AccessKeyId,
          secretAccessKey: r2SecretAccessKey,
        },
      });
      this.useLocalFallback = false;
      this.logger.log("Cloudflare R2 storage configured");
    } else {
      // Fallback to Cloudinary logic (existing)
      const cloudinaryUrl =
        this.configService.get<string>("CLOUDINARY_URL") || "";

      const isPlaceholder =
        !cloudinaryUrl ||
        cloudinaryUrl.includes("<your_api_key>") ||
        cloudinaryUrl.includes("<your_api_secret>") ||
        cloudinaryUrl === "cloudinary://undefined:undefined@undefined";

      if (!isPlaceholder) {
        try {
          const urlMatch = cloudinaryUrl.match(
            /cloudinary:\/\/([^:]+):([^@]+)@(.+)/,
          );
          if (urlMatch) {
            cloudinary.config({
              api_key: urlMatch[1],
              api_secret: urlMatch[2],
              cloud_name: urlMatch[3],
              secure: true,
            });
            this.useLocalFallback = false;
            this.logger.log(`Cloudinary configured for cloud: ${urlMatch[3]}`);
          } else {
            cloudinary.config({ cloudinary_url: cloudinaryUrl });
            this.useLocalFallback = false;
            this.logger.log("Cloudinary configured using URL string");
          }
        } catch (err) {
          this.logger.error("Failed to parse Cloudinary URL:", err);
          this.useLocalFallback = true;
        }
      } else {
        this.useLocalFallback = true;
        this.logger.warn(
          "No cloud storage configured (R2 or Cloudinary) — falling back to local disk storage.",
        );
      }
    }

    // Local fallback paths
    this.localUploadDir = path.join(process.cwd(), "public", "uploads");
    const port = this.configService.get<number>("PORT") || 3001;
    const backendUrl =
      this.configService.get<string>("BACKEND_URL") ||
      `http://localhost:${port}`;
    this.localBaseUrl = `${backendUrl}/uploads`;
  }

  /** Upload studio logo */
  async uploadStudioLogo(
    studioId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    if (this.useLocalFallback) {
      return this.saveLocally(file, `logo`);
    }

    if (this.s3Client) {
      return this.uploadToR2(
        file.buffer,
        `studios/${studioId}/logo/${uuidv4()}${this.extFromMime(file.mimetype)}`,
        file.mimetype,
      );
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
    } catch (error: unknown) {
      this.logger.error("Logo upload failed:", error);
      throw new InternalServerErrorException("Failed to upload logo");
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

    if (this.s3Client) {
      return this.uploadToR2(
        file.buffer,
        `studios/${studioId}/portfolio/${uuidv4()}${this.extFromMime(file.mimetype)}`,
        file.mimetype,
      );
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
    } catch (error: unknown) {
      this.logger.error("Portfolio image upload failed:", error);
      throw new InternalServerErrorException(
        "Failed to upload portfolio image",
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

    if (this.s3Client) {
      return this.uploadToR2(
        file.buffer,
        `studios/${studioId}/services/${uuidv4()}${this.extFromMime(file.mimetype)}`,
        file.mimetype,
      );
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
    } catch (error: unknown) {
      this.logger.error("Service cover upload failed:", error);
      throw new InternalServerErrorException("Failed to upload service cover");
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

    if (this.s3Client) {
      return this.uploadToR2(
        buffer,
        `studios/${studioId}/contracts/contract_${bookingId}.pdf`,
        "application/pdf",
      );
    }

    try {
      const result = await this.uploadToCloudinary(buffer, {
        folder: `studios/${studioId}/contracts`,
        resource_type: "raw",
        public_id: `contract_${bookingId}`,
        allowed_formats: ["pdf"],
      });
      return result.secure_url;
    } catch (error: unknown) {
      this.logger.error("Contract PDF upload failed:", error);
      throw new InternalServerErrorException("Failed to upload contract PDF");
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

    if (this.s3Client) {
      return this.uploadToR2(
        buffer,
        `studios/${studioId}/invoices/invoice_${invoiceNumber}.pdf`,
        "application/pdf",
      );
    }

    try {
      const result = await this.uploadToCloudinary(buffer, {
        folder: `studios/${studioId}/invoices`,
        resource_type: "raw",
        public_id: `invoice_${invoiceNumber}`,
        allowed_formats: ["pdf"],
      });
      return result.secure_url;
    } catch (error: unknown) {
      this.logger.error("Invoice PDF upload failed:", error);
      throw new InternalServerErrorException("Failed to upload invoice PDF");
    }
  }

  /** Delete a Cloudinary file (no-op for local) */
  async deleteFile(publicId: string): Promise<void> {
    if (this.useLocalFallback) return;
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to delete file ${publicId}:`,
        error instanceof Error ? error.stack : String(error),
      );
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
    options: UploadApiOptions,
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

  /** Helper: upload buffer to Cloudflare R2 */
  private async uploadToR2(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<string> {
    if (!this.s3Client) throw new Error("R2 Client not initialized");

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.r2BucketName,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );

      const baseUrl = this.r2PublicUrl.endsWith("/")
        ? this.r2PublicUrl.slice(0, -1)
        : this.r2PublicUrl;
      return `${baseUrl}/${key}`;
    } catch (error) {
      this.logger.error(`R2 Upload failed for ${key}:`, error);
      throw new InternalServerErrorException(
        "Failed to upload to cloud storage",
      );
    }
  }
}
