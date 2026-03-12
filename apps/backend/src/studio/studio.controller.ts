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
import { UserPayload } from "../common/interfaces/user-payload.interface";
import { SkipSubscriptionCheck } from "../auth/decorators/skip-subscription-check.decorator";

@Controller("studios")
@UseGuards(RolesGuard)
export class StudioController {
  constructor(private readonly studioService: StudioService) {}

  // Admin only: Create a new partner
  @Post()
  create(
    @Body() createStudioDto: CreateStudioDto,
    @CurrentUser() user: UserPayload,
  ) {
    // Only platform admins can create partners
    if (!user.isAdmin) {
      throw new ForbiddenException("Only admins can create partners");
    }
    return this.studioService.create(createStudioDto);
  }

  // Admin only: List all partners with pagination
  @Get()
  findAll(
    @CurrentUser() user: UserPayload,
    @Query("page", new ParseIntPipe({ optional: true })) page?: number,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number,
    @Query("status") status?: string,
  ) {
    if (!user.isAdmin) {
      throw new ForbiddenException("Only admins can list all partners");
    }
    const pageNum = page || 1;
    const limitNum = limit || 10;
    return this.studioService.findAll(pageNum, limitNum, status);
  }

  // Public: Get partner by slug (for booking page)
  @Get("slug/:slug")
  @Public()
  findBySlug(@Param("slug") slug: string) {
    return this.studioService.findBySlug(slug);
  }

  // Partner owner: Get partner statistics
  @Get(":id/stats")
  @Roles("OWNER")
  getStats(@Param("id") id: string, @CurrentUser() user: UserPayload) {
    // Verify user owns this partner
    if (user.studioId !== id && !user.isAdmin) {
      throw new ForbiddenException("You do not have access to this partner");
    }
    return this.studioService.getStats(id);
  }

  // Partner owner or admin: Get partner by ID
  @Get(":id")
  @Roles("OWNER", "PHOTOGRAPHER", "ASSISTANT")
  @SkipSubscriptionCheck()
  findOne(@Param("id") id: string, @CurrentUser() user: UserPayload) {
    // Verify user belongs to this partner or is admin
    if (user.studioId !== id && !user.isAdmin) {
      throw new ForbiddenException("You do not have access to this partner");
    }
    return this.studioService.findOne(id);
  }

  // Partner owner: Update partner
  @Patch(":id")
  @Roles("OWNER")
  @SkipSubscriptionCheck()
  update(
    @Param("id") id: string,
    @Body() updateStudioDto: UpdateStudioDto,
    @CurrentUser() user: UserPayload,
  ) {
    // Verify user owns this partner
    if (user.studioId !== id && !user.isAdmin) {
      throw new ForbiddenException("You do not have access to this partner");
    }
    return this.studioService.update(id, updateStudioDto);
  }

  // Admin only: Suspend partner
  @Patch(":id/suspend")
  suspend(@Param("id") id: string, @CurrentUser() user: UserPayload) {
    if (!user.isAdmin) {
      throw new ForbiddenException("Only admins can suspend partners");
    }
    return this.studioService.suspend(id);
  }

  // Admin only: Activate partner
  @Patch(":id/activate")
  activate(@Param("id") id: string, @CurrentUser() user: UserPayload) {
    if (!user.isAdmin) {
      throw new ForbiddenException("Only admins can activate partners");
    }
    return this.studioService.activate(id);
  }

  // Admin only: Delete partner
  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: UserPayload) {
    if (!user.isAdmin) {
      throw new ForbiddenException("Only admins can delete partners");
    }
    return this.studioService.remove(id);
  }
}
