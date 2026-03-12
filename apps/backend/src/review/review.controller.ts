import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
} from "@nestjs/common";
import { Request } from "express";
import { ReviewService } from "./review.service";

interface UserPayload {
  id: string;
  studioId?: string;
  role: string;
}

@Controller("reviews")
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  /**
   * GET /reviews
   * Get all reviews for authenticated studio, with optional filters
   */
  @Get()
  async findAll(
    @Req() req: Request & { user: UserPayload },
    @Query("rating") rating?: string,
    @Query("isVisible") isVisible?: string,
  ) {
    const studioId = req.user.studioId;
    if (!studioId) return { reviews: [], total: 0, stats: null };

    return this.reviewService.findAll(studioId, {
      rating: rating ? parseInt(rating) : undefined,
      isVisible: isVisible !== undefined ? isVisible === "true" : undefined,
    });
  }

  /**
   * GET /reviews/:id
   * Get single review
   */
  @Get(":id")
  async findOne(
    @Param("id") id: string,
    @Req() req: Request & { user: UserPayload },
  ) {
    const studioId = req.user.studioId;
    if (!studioId) throw new Error("Not a studio user");
    return this.reviewService.findOne(id, studioId);
  }

  /**
   * PATCH /reviews/:id/reply
   * Reply to a review
   */
  @Patch(":id/reply")
  async reply(
    @Param("id") id: string,
    @Body() body: { reply: string },
    @Req() req: Request & { user: UserPayload },
  ) {
    const studioId = req.user.studioId;
    if (!studioId) throw new Error("Not a studio user");
    return this.reviewService.reply(id, studioId, body.reply);
  }

  /**
   * PATCH /reviews/:id/toggle-visibility
   * Toggle review visibility
   */
  @Patch(":id/toggle-visibility")
  async toggleVisibility(
    @Param("id") id: string,
    @Req() req: Request & { user: UserPayload },
  ) {
    const studioId = req.user.studioId;
    if (!studioId) throw new Error("Not a studio user");
    return this.reviewService.toggleVisibility(id, studioId);
  }

  /**
   * DELETE /reviews/:id
   * Delete a review
   */
  @Delete(":id")
  async remove(
    @Param("id") id: string,
    @Req() req: Request & { user: UserPayload },
  ) {
    const studioId = req.user.studioId;
    if (!studioId) throw new Error("Not a studio user");
    return this.reviewService.remove(id, studioId);
  }
}
