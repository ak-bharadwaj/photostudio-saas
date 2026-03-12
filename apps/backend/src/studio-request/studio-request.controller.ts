import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { StudioRequestService } from "./studio-request.service";
import {
  CreateStudioRequestDto,
  UpdateStudioRequestStatusDto,
} from "./dto/studio-request.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Public } from "../auth/decorators/public.decorator";

@Controller("studio-requests")
export class StudioRequestController {
  constructor(private readonly studioRequestService: StudioRequestService) {}

  @Public()
  @Post()
  async create(@Body() dto: CreateStudioRequestDto) {
    return this.studioRequestService.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll() {
    return this.studioRequestService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id/status")
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateStudioRequestStatusDto,
  ) {
    return this.studioRequestService.updateStatus(id, dto.status);
  }
}
