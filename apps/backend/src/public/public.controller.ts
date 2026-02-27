import { Controller, Get, Post, Body, Param, Query, Req } from "@nestjs/common";
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
    console.log(`[DEBUG] Incoming public request for studio slug: "${slug}"`);
    try {
      const studio = await this.publicService.getStudioBySlug(slug);
      console.log(
        `[DEBUG] Studio found for slug "${slug}": ${studio.name} (${studio.id})`,
      );
      return studio;
    } catch (error: any) {
      console.error(
        `[DEBUG] Error fetching studio for slug "${slug}": ${error.message}`,
      );
      throw error;
    }
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
    @Req() req: any,
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
    return this.publicService.getAvailableTimeSlots(slug, serviceId, date);
  }
}
