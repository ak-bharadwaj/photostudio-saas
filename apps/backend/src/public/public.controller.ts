import { Controller, Get, Post, Body, Param, Query } from "@nestjs/common";
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
  async createPublicBooking(
    @Param("slug") slug: string,
    @Body() dto: CreatePublicBookingDto,
  ) {
    return this.publicService.createPublicBooking(slug, dto);
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
    return this.publicService.getAvailableTimeSlots(slug, serviceId, date);
  }
}
