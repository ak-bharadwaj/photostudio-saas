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
  ParseIntPipe,
  ForbiddenException,
} from "@nestjs/common";
import { StudioService } from "./studio.service";
import { CreateStudioDto, UpdateStudioDto } from "./dto/studio.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";

interface UserPayload {
  id: string;
  email: string;
  role?: "OWNER" | "PHOTOGRAPHER" | "ASSISTANT";
  studioId?: string;
  isAdmin?: boolean;
}

@Controller("studios")
@UseGuards(RolesGuard)
export class StudioController {
  constructor(private readonly studioService: StudioService) {}

  // Admin only: Create a new studio
  @Post()
  create(
    @Body() createStudioDto: CreateStudioDto,
    @CurrentUser() user: UserPayload,
  ) {
    // Only platform admins can create studios
    if (!user.isAdmin) {
      throw new ForbiddenException("Only admins can create studios");
    }
    return this.studioService.create(createStudioDto);
  }

  // Admin only: List all studios with pagination
  @Get()
  findAll(
    @Query("page", new ParseIntPipe({ optional: true })) page?: number,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number,
    @Query("status") status?: string,
  ) {
    const pageNum = page || 1;
    const limitNum = limit || 10;
    return this.studioService.findAll(pageNum, limitNum, status);
  }

  // Public: Get studio by slug (for booking page)
  @Get("slug/:slug")
  @Public()
  findBySlug(@Param("slug") slug: string) {
    return this.studioService.findBySlug(slug);
  }

  // Studio owner: Get studio statistics
  @Get(":id/stats")
  @Roles("OWNER")
  getStats(@Param("id") id: string, @CurrentUser() user: UserPayload) {
    // Verify user owns this studio
    if (user.studioId !== id && !user.isAdmin) {
      throw new ForbiddenException("You do not have access to this studio");
    }
    return this.studioService.getStats(id);
  }

  // Studio owner or admin: Get studio by ID
  @Get(":id")
  @Roles("OWNER", "PHOTOGRAPHER", "ASSISTANT")
  findOne(@Param("id") id: string, @CurrentUser() user: UserPayload) {
    // Verify user belongs to this studio or is admin
    if (user.studioId !== id && !user.isAdmin) {
      throw new ForbiddenException("You do not have access to this studio");
    }
    return this.studioService.findOne(id);
  }

  // Studio owner: Update studio
  @Patch(":id")
  @Roles("OWNER")
  update(
    @Param("id") id: string,
    @Body() updateStudioDto: UpdateStudioDto,
    @CurrentUser() user: UserPayload,
  ) {
    // Verify user owns this studio
    if (user.studioId !== id && !user.isAdmin) {
      throw new ForbiddenException("You do not have access to this studio");
    }
    return this.studioService.update(id, updateStudioDto);
  }

  // Admin only: Suspend studio
  @Patch(":id/suspend")
  suspend(@Param("id") id: string, @CurrentUser() user: UserPayload) {
    if (!user.isAdmin) {
      throw new ForbiddenException("Only admins can suspend studios");
    }
    return this.studioService.suspend(id);
  }

  // Admin only: Activate studio
  @Patch(":id/activate")
  activate(@Param("id") id: string, @CurrentUser() user: UserPayload) {
    if (!user.isAdmin) {
      throw new ForbiddenException("Only admins can activate studios");
    }
    return this.studioService.activate(id);
  }

  // Admin only: Delete studio
  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: UserPayload) {
    if (!user.isAdmin) {
      throw new ForbiddenException("Only admins can delete studios");
    }
    return this.studioService.remove(id);
  }
}
