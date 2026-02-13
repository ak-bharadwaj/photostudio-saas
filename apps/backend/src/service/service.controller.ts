import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ForbiddenException,
} from "@nestjs/common";
import { ServiceService } from "./service.service";
import { CreateServiceDto, UpdateServiceDto } from "./dto/service.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

interface UserPayload {
  id: string;
  email: string;
  role?: "OWNER" | "PHOTOGRAPHER" | "ASSISTANT";
  studioId?: string;
  isAdmin?: boolean;
}

@Controller("services")
@UseGuards(RolesGuard)
@Roles("OWNER", "PHOTOGRAPHER", "ASSISTANT")
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Post()
  @Roles("OWNER") // Only owners can create services
  create(
    @Body() createServiceDto: CreateServiceDto,
    @CurrentUser() user: UserPayload,
  ) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    return this.serviceService.create(createServiceDto, user.studioId);
  }

  @Get()
  findAll(
    @CurrentUser() user: UserPayload,
    @Query("includeInactive") includeInactive?: string,
  ) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }

    const includeInactiveBool = includeInactive === "true";
    return this.serviceService.findAll(user.studioId, includeInactiveBool);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: UserPayload) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    return this.serviceService.findOne(id, user.studioId);
  }

  @Get(":id/stats")
  getStats(@Param("id") id: string, @CurrentUser() user: UserPayload) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    return this.serviceService.getStats(id, user.studioId);
  }

  @Patch(":id")
  @Roles("OWNER") // Only owners can update services
  update(
    @Param("id") id: string,
    @Body() updateServiceDto: UpdateServiceDto,
    @CurrentUser() user: UserPayload,
  ) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    return this.serviceService.update(id, updateServiceDto, user.studioId);
  }

  @Patch(":id/toggle-active")
  @Roles("OWNER") // Only owners can toggle service status
  toggleActive(@Param("id") id: string, @CurrentUser() user: UserPayload) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    return this.serviceService.toggleActive(id, user.studioId);
  }

  @Post("reorder")
  @Roles("OWNER") // Only owners can reorder services
  reorder(
    @Body() body: { serviceIds: string[] },
    @CurrentUser() user: UserPayload,
  ) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    return this.serviceService.reorder(user.studioId, body.serviceIds);
  }

  @Delete(":id")
  @Roles("OWNER") // Only owners can delete services
  remove(@Param("id") id: string, @CurrentUser() user: UserPayload) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    return this.serviceService.remove(id, user.studioId);
  }
}
