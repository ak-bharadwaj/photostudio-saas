import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private configService: ConfigService) {
    const cloudinaryUrl = this.configService.get<string>("cloudinary.url");

    if (cloudinaryUrl) {
      cloudinary.config({
        cloudinary_url: cloudinaryUrl,
      });
    }
  }

  /**
   * Upload studio logo
   */
  async uploadStudioLogo(
    studioId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    try {
      const result = await this.uploadToCloudinary(file.buffer, {
        folder: `studios/${studioId}/logo`,
        transformation: [
          { width: 500, height: 500, crop: "limit" },
          { quality: "auto" },
          { fetch_format: "auto" },
        ],
        allowed_formats: ["jpg", "png", "webp", "gif"],
      });

      return result.secure_url;
    } catch (error) {
      throw new BadRequestException(`Failed to upload logo: ${error.message}`);
    }
  }

  /**
   * Upload portfolio image
   */
  async uploadPortfolioImage(
    studioId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    try {
      const result = await this.uploadToCloudinary(file.buffer, {
        folder: `studios/${studioId}/portfolio`,
        transformation: [
          { width: 1920, height: 1920, crop: "limit" },
          { quality: "auto" },
          { fetch_format: "auto" },
        ],
        allowed_formats: ["jpg", "png", "webp"],
      });

      return result.secure_url;
    } catch (error) {
      throw new BadRequestException(
        `Failed to upload portfolio image: ${error.message}`,
      );
    }
  }

  /**
   * Upload invoice PDF
   */
  async uploadInvoicePDF(
    studioId: string,
    invoiceNumber: string,
    buffer: Buffer,
  ): Promise<string> {
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

  /**
   * Delete file from Cloudinary
   */
  async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error: any) {
      this.logger.error(`Failed to delete file ${publicId}:`, error.stack);
    }
  }

  /**
   * Get optimized image URL
   */
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
    return cloudinary.url(publicId, {
      width: options.width,
      height: options.height,
      crop: options.crop || "fill",
      quality: options.quality || "auto",
      fetch_format: options.format || "auto",
    });
  }

  /**
   * Helper method to upload to Cloudinary
   */
  private uploadToCloudinary(
    buffer: Buffer,
    options: any,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve(result);
          } else {
            reject(new Error("Upload failed: No result returned"));
          }
        },
      );

      uploadStream.end(buffer);
    });
  }
}
