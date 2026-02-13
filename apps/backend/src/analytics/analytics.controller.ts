import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AnalyticsService } from "./analytics.service";
import { subDays, startOfDay, endOfDay } from "date-fns";
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBearerAuth,
} from "@nestjs/swagger";

@ApiTags("analytics")
@ApiBearerAuth()
@Controller("analytics")
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Get overview statistics
   */
  @Get("overview")
  @ApiOperation({ summary: "Get overview statistics" })
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  async getOverview(
    @Req() req: any,
    @Query("startDate") startDateStr?: string,
    @Query("endDate") endDateStr?: string,
  ) {
    const studioId = req.user.studioId;

    // Default to last 30 days if no dates provided
    const endDate = endDateStr
      ? endOfDay(new Date(endDateStr))
      : endOfDay(new Date());
    const startDate = startDateStr
      ? startOfDay(new Date(startDateStr))
      : startOfDay(subDays(endDate, 30));

    if (startDate > endDate) {
      throw new BadRequestException("startDate must be before endDate");
    }

    return this.analyticsService.getOverviewStats(studioId, startDate, endDate);
  }

  /**
   * Get revenue over time
   */
  @Get("revenue")
  @ApiOperation({ summary: "Get revenue over time" })
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  async getRevenue(
    @Req() req: any,
    @Query("startDate") startDateStr?: string,
    @Query("endDate") endDateStr?: string,
  ) {
    const studioId = req.user.studioId;

    // Default to last 30 days
    const endDate = endDateStr
      ? endOfDay(new Date(endDateStr))
      : endOfDay(new Date());
    const startDate = startDateStr
      ? startOfDay(new Date(startDateStr))
      : startOfDay(subDays(endDate, 30));

    if (startDate > endDate) {
      throw new BadRequestException("startDate must be before endDate");
    }

    return this.analyticsService.getRevenueOverTime(
      studioId,
      startDate,
      endDate,
    );
  }

  /**
   * Get bookings by status
   */
  @Get("bookings-by-status")
  @ApiOperation({ summary: "Get bookings grouped by status" })
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  async getBookingsByStatus(
    @Req() req: any,
    @Query("startDate") startDateStr?: string,
    @Query("endDate") endDateStr?: string,
  ) {
    const studioId = req.user.studioId;

    // Default to last 30 days
    const endDate = endDateStr
      ? endOfDay(new Date(endDateStr))
      : endOfDay(new Date());
    const startDate = startDateStr
      ? startOfDay(new Date(startDateStr))
      : startOfDay(subDays(endDate, 30));

    if (startDate > endDate) {
      throw new BadRequestException("startDate must be before endDate");
    }

    return this.analyticsService.getBookingsByStatus(
      studioId,
      startDate,
      endDate,
    );
  }

  /**
   * Get service performance
   */
  @Get("service-performance")
  @ApiOperation({ summary: "Get service performance metrics" })
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  async getServicePerformance(
    @Req() req: any,
    @Query("startDate") startDateStr?: string,
    @Query("endDate") endDateStr?: string,
  ) {
    const studioId = req.user.studioId;

    // Default to last 30 days
    const endDate = endDateStr
      ? endOfDay(new Date(endDateStr))
      : endOfDay(new Date());
    const startDate = startDateStr
      ? startOfDay(new Date(startDateStr))
      : startOfDay(subDays(endDate, 30));

    if (startDate > endDate) {
      throw new BadRequestException("startDate must be before endDate");
    }

    return this.analyticsService.getServicePerformance(
      studioId,
      startDate,
      endDate,
    );
  }

  /**
   * Get customer insights
   */
  @Get("customer-insights")
  @ApiOperation({ summary: "Get customer insights" })
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  async getCustomerInsights(
    @Req() req: any,
    @Query("startDate") startDateStr?: string,
    @Query("endDate") endDateStr?: string,
  ) {
    const studioId = req.user.studioId;

    // Default to last 30 days
    const endDate = endDateStr
      ? endOfDay(new Date(endDateStr))
      : endOfDay(new Date());
    const startDate = startDateStr
      ? startOfDay(new Date(startDateStr))
      : startOfDay(subDays(endDate, 30));

    if (startDate > endDate) {
      throw new BadRequestException("startDate must be before endDate");
    }

    return this.analyticsService.getCustomerInsights(
      studioId,
      startDate,
      endDate,
    );
  }
}
