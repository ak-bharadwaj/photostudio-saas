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
import { PortfolioService } from "./portfolio.service";
import {
  CreatePortfolioItemDto,
  UpdatePortfolioItemDto,
} from "./dto/portfolio.dto";
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

@Controller("portfolio")
@UseGuards(RolesGuard)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Post()
  @Roles("OWNER") // Only owners can add portfolio items
  create(
    @Body() createPortfolioItemDto: CreatePortfolioItemDto,
    @CurrentUser() user: UserPayload,
  ) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    return this.portfolioService.create(createPortfolioItemDto, user.studioId);
  }

  @Get("studio/:studioId")
  @Public() // Public endpoint for displaying portfolio on booking page
  findAllPublic(@Param("studioId") studioId: string) {
    return this.portfolioService.findAll(studioId, false);
  }

  @Get()
  @Roles("OWNER", "PHOTOGRAPHER", "ASSISTANT")
  findAll(
    @CurrentUser() user: UserPayload,
    @Query("includeHidden") includeHidden?: string,
  ) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }

    const includeHiddenBool = includeHidden === "true";
    return this.portfolioService.findAll(user.studioId, includeHiddenBool);
  }

  @Get("categories")
  @Roles("OWNER", "PHOTOGRAPHER", "ASSISTANT")
  getCategories(@CurrentUser() user: UserPayload) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    return this.portfolioService.getCategories(user.studioId);
  }

  @Get(":id")
  @Roles("OWNER", "PHOTOGRAPHER", "ASSISTANT")
  findOne(@Param("id") id: string, @CurrentUser() user: UserPayload) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    return this.portfolioService.findOne(id, user.studioId);
  }

  @Patch(":id")
  @Roles("OWNER") // Only owners can update portfolio items
  update(
    @Param("id") id: string,
    @Body() updatePortfolioItemDto: UpdatePortfolioItemDto,
    @CurrentUser() user: UserPayload,
  ) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    return this.portfolioService.update(
      id,
      updatePortfolioItemDto,
      user.studioId,
    );
  }

  @Patch(":id/toggle-visibility")
  @Roles("OWNER") // Only owners can toggle visibility
  toggleVisibility(@Param("id") id: string, @CurrentUser() user: UserPayload) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    return this.portfolioService.toggleVisibility(id, user.studioId);
  }

  @Post("reorder")
  @Roles("OWNER") // Only owners can reorder portfolio items
  reorder(
    @Body() body: { itemIds: string[] },
    @CurrentUser() user: UserPayload,
  ) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    return this.portfolioService.reorder(user.studioId, body.itemIds);
  }

  @Delete(":id")
  @Roles("OWNER") // Only owners can delete portfolio items
  remove(@Param("id") id: string, @CurrentUser() user: UserPayload) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    return this.portfolioService.remove(id, user.studioId);
  }
}
