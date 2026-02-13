import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
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

interface UserPayload {
  id: string;
  email: string;
  role?: string;
  studioId?: string;
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

    if (!user.studioId) {
      throw new BadRequestException("User must belong to a studio");
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

    if (!user.studioId) {
      throw new BadRequestException("User must belong to a studio");
    }

    const url = await this.uploadService.uploadPortfolioImage(
      user.studioId,
      file,
    );
    return { url };
  }
}
