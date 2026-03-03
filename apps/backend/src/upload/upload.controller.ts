import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UploadService } from "./upload.service";
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { UserPayload } from "../common/interfaces/user-payload.interface";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

function validateImageFile(file: Express.Multer.File): void {
  if (file.size > MAX_IMAGE_SIZE) {
    throw new BadRequestException("File size must not exceed 10 MB");
  }
  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
    throw new BadRequestException(
      "Invalid file type. Allowed types: JPEG, PNG, WebP, GIF, SVG",
    );
  }
}

@ApiTags("upload")
@ApiBearerAuth()
@Controller("upload")
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post("logo")
  @ApiOperation({ summary: "Upload studio logo" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file"))
  async uploadLogo(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: UserPayload,
  ) {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }
    validateImageFile(file);

    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }

    const url = await this.uploadService.uploadStudioLogo(user.studioId, file);
    return { url };
  }

  @Post("portfolio")
  @ApiOperation({ summary: "Upload portfolio image" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file"))
  async uploadPortfolioImage(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: UserPayload,
  ) {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }
    validateImageFile(file);

    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }

    const url = await this.uploadService.uploadPortfolioImage(
      user.studioId,
      file,
    );
    return { url };
  }

  @Post("service-cover")
  @ApiOperation({ summary: "Upload service cover image" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file"))
  async uploadServiceCover(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: UserPayload,
  ) {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }
    validateImageFile(file);

    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }

    const url = await this.uploadService.uploadServiceCover(
      user.studioId,
      file,
    );
    return { url };
  }
}
