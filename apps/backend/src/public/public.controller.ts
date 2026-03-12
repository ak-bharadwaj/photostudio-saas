import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  BadRequestException,
} from "@nestjs/common";
import { Request } from "express";
import { Throttle } from "@nestjs/throttler";
import { PublicService } from "./public.service";
import { CreatePublicBookingDto } from "./dto/public-booking.dto";
import { Public } from "../auth/decorators/public.decorator";

@Controller("public")
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  /**
   * GET /public/studios/:slug
   * Get studio information for public booking page
   */
  @Public()
  @Get("studios/:slug")
  async getStudioBySlug(@Param("slug") slug: string) {
    return this.publicService.getStudioBySlug(slug);
  }

  /**
   * POST /public/studios/:slug/bookings
   * Create a public booking (no authentication required)
   */
  @Public()
  @Post("studios/:slug/bookings")
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 bookings per minute per IP
  async createPublicBooking(
    @Param("slug") slug: string,
    @Body() dto: CreatePublicBookingDto,
    @Req() req: Request & { user?: { id: string } },
  ) {
    // We manually extract the user if the token is present to link the booking
    // even though the route is @Public()
    return this.publicService.createPublicBooking(slug, dto, req.user?.id);
  }

  /**
   * GET /public/studios/:slug/services/:serviceId/available-slots
   * Get available time slots for a service on a specific date
   */
  @Public()
  @Get("studios/:slug/services/:serviceId/available-slots")
  async getAvailableTimeSlots(
    @Param("slug") slug: string,
    @Param("serviceId") serviceId: string,
    @Query("date") date: string,
  ) {
    // Validate date format (YYYY-MM-DD) before passing to service
    if (!date) {
      throw new BadRequestException("date query parameter is required");
    }
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      throw new BadRequestException(
        "Invalid date format — expected YYYY-MM-DD (e.g. 2024-01-31)",
      );
    }
    // Guard against exotic inputs that new Date() accepts but aren't YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException(
        "date must be in YYYY-MM-DD format (e.g. 2024-01-31)",
      );
    }
    return this.publicService.getAvailableTimeSlots(slug, serviceId, date);
  }

  /**
   * GET /public/marketplace/search
   * Global service search
   */
  @Public()
  @Get("marketplace/search")
  async searchServices(
    @Query("q") q?: string,
    @Query("categoryId") categoryId?: string,
    @Query("location") location?: string,
    @Query("isRecommended") isRecommended?: string,
    @Query("uniquePerStudio") uniquePerStudio?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.publicService.searchServices(
      q,
      categoryId,
      location,
      isRecommended === "true",
      uniquePerStudio === "true",
      limit ? parseInt(limit) : 12,
      offset ? parseInt(offset) : 0,
    );
  }

  /**
   * GET /public/marketplace/studios
   * Discover studios
   */
  @Public()
  @Get("marketplace/studios")
  async discoverStudios(
    @Query("location") location?: string,
    @Query("isRecommended") isRecommended?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.publicService.discoverStudios(
      location,
      isRecommended === "true",
      limit ? parseInt(limit) : 12,
      offset ? parseInt(offset) : 0,
    );
  }

  /**
   * GET /public/marketplace/categories
   * Get all categories
   */
  @Public()
  @Get("marketplace/categories")
  async getCategories() {
    return this.publicService.getCategories();
  }

  /**
   * GET /public/marketplace/locations
   * Get all distinct studio cities
   */
  @Public()
  @Get("marketplace/locations")
  async getLocations() {
    return this.publicService.getLocations();
  }

  /**
   * GET /public/marketplace/reviews
   * Get global recent reviews
   */
  @Public()
  @Get("marketplace/reviews")
  async getRecentReviews(@Query("limit") limit?: string) {
    return this.publicService.getRecentReviews(limit ? parseInt(limit) : 10);
  }

  /**
   * GET /public/services/:id
   * Get single service details
   */
  @Public()
  @Get("services/:id")
  async getServiceById(@Param("id") id: string) {
    return this.publicService.getServiceById(id);
  }
}
