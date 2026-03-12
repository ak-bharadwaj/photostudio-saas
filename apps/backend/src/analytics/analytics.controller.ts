import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UserPayload } from "../common/interfaces/user-payload.interface";
import { AnalyticsService } from "./analytics.service";
import { subDays, startOfDay, endOfDay } from "date-fns";

/** Maximum allowed date range for any analytics query (366 days = 1 leap year). */
const MAX_RANGE_DAYS = 366;

/**
 * Parse and validate an optional ISO date string query param.
 * Returns a Date on success or throws BadRequestException.
 */
function parseDateParam(
  value: string | undefined,
  paramName: string,
): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    throw new BadRequestException(
      `Invalid ${paramName} format — expected ISO date (e.g. 2024-01-31)`,
    );
  }
  return d;
}

/**
 * Validate that a date range does not exceed MAX_RANGE_DAYS.
 * Throws BadRequestException if the range is too large or start > end.
 */
function validateDateRange(startDate: Date, endDate: Date): void {
  if (startDate > endDate) {
    throw new BadRequestException("startDate must be before endDate");
  }
  const diffDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays > MAX_RANGE_DAYS) {
    throw new BadRequestException(
      `Date range cannot exceed ${MAX_RANGE_DAYS} days`,
    );
  }
}

/** Resolve start/end dates from optional query params, defaulting to last 30 days. */
function resolveDateRange(
  startDateStr: string | undefined,
  endDateStr: string | undefined,
): { startDate: Date; endDate: Date } {
  const endDate = endOfDay(parseDateParam(endDateStr, "endDate") ?? new Date());
  const startDate = startOfDay(
    parseDateParam(startDateStr, "startDate") ?? subDays(endDate, 30),
  );
  validateDateRange(startDate, endDate);
  return { startDate, endDate };
}

@Controller("analytics")
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /** GET /analytics/overview */
  @Get("overview")
  async getOverview(
    @CurrentUser() user: UserPayload,
    @Query("startDate") startDateStr?: string,
    @Query("endDate") endDateStr?: string,
  ) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    const { startDate, endDate } = resolveDateRange(startDateStr, endDateStr);
    return this.analyticsService.getOverviewStats(
      user.studioId,
      startDate,
      endDate,
    );
  }

  /** GET /analytics/revenue */
  @Get("revenue")
  async getRevenue(
    @CurrentUser() user: UserPayload,
    @Query("startDate") startDateStr?: string,
    @Query("endDate") endDateStr?: string,
  ) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    const { startDate, endDate } = resolveDateRange(startDateStr, endDateStr);
    return this.analyticsService.getRevenueOverTime(
      user.studioId,
      startDate,
      endDate,
    );
  }

  /** GET /analytics/bookings-by-status */
  @Get("bookings-by-status")
  async getBookingsByStatus(
    @CurrentUser() user: UserPayload,
    @Query("startDate") startDateStr?: string,
    @Query("endDate") endDateStr?: string,
  ) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    const { startDate, endDate } = resolveDateRange(startDateStr, endDateStr);
    return this.analyticsService.getBookingsByStatus(
      user.studioId,
      startDate,
      endDate,
    );
  }

  /** GET /analytics/service-performance */
  @Get("service-performance")
  async getServicePerformance(
    @CurrentUser() user: UserPayload,
    @Query("startDate") startDateStr?: string,
    @Query("endDate") endDateStr?: string,
  ) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    const { startDate, endDate } = resolveDateRange(startDateStr, endDateStr);
    return this.analyticsService.getServicePerformance(
      user.studioId,
      startDate,
      endDate,
    );
  }

  /** GET /analytics/customer-insights */
  @Get("customer-insights")
  async getCustomerInsights(
    @CurrentUser() user: UserPayload,
    @Query("startDate") startDateStr?: string,
    @Query("endDate") endDateStr?: string,
  ) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    const { startDate, endDate } = resolveDateRange(startDateStr, endDateStr);
    return this.analyticsService.getCustomerInsights(
      user.studioId,
      startDate,
      endDate,
    );
  }
}
