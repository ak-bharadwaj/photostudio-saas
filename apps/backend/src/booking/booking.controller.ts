import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  ParseIntPipe,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { BookingService } from "./booking.service";
import {
  CreateBookingDto,
  UpdateBookingDto,
  UpdateBookingStatusDto,
  CreateInternalBookingDto,
  SendQuoteDto,
} from "./dto/booking.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { BookingStatus } from "@prisma/client";
import { UserPayload } from "../common/interfaces/user-payload.interface";

@Controller("bookings")
@UseGuards(RolesGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  // Public: Create a new booking inquiry
  @Post()
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute for public endpoint
  create(@Body() createBookingDto: CreateBookingDto) {
    return this.bookingService.create(createBookingDto);
  }
  @Post("internal")
  @Roles("OWNER", "PHOTOGRAPHER", "ASSISTANT")
  createInternal(
    @Body() dto: CreateInternalBookingDto,
    @CurrentUser() user: UserPayload,
  ) {
    if (!user.studioId && !user.isAdmin) {
      throw new ForbiddenException("User must belong to a studio");
    }
    if (!user.studioId) {
      throw new ForbiddenException("Admin must specify a studio context for this operation");
    }
    return this.bookingService.createInternal(dto, user.studioId);
  }

  // Studio users: List all bookings for their studio
  @Get()
  @Roles("OWNER", "PHOTOGRAPHER", "ASSISTANT")
  findAll(
    @CurrentUser() user: UserPayload,
    @Query("page", new ParseIntPipe({ optional: true })) page?: number,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number,
    @Query("status") status?: BookingStatus,
    @Query("search") search?: string,
  ) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }

    const pageNum = page || 1;
    const limitNum = Math.min(limit || 10, 100); // cap at 100 per page

    return this.bookingService.findAll(
      user.studioId,
      pageNum,
      limitNum,
      status,
      search,
    );
  }

  // Studio users: Get upcoming bookings
  @Get("upcoming")
  @Roles("OWNER", "PHOTOGRAPHER", "ASSISTANT")
  getUpcoming(
    @CurrentUser() user: UserPayload,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }

    const limitNum = Math.min(limit ?? 10, 100);
    return this.bookingService.getUpcoming(user.studioId, limitNum);
  }

  // Studio users: Get booking by ID
  @Get(":id")
  @Roles("OWNER", "PHOTOGRAPHER", "ASSISTANT")
  findOne(@Param("id") id: string, @CurrentUser() user: UserPayload) {
    if (!user.studioId && !user.isAdmin) {
      throw new ForbiddenException("User must belong to a studio");
    }

    return this.bookingService.findOne(id, user.studioId ?? undefined);
  }

  // Studio users: Update booking
  @Patch(":id")
  @Roles("OWNER", "PHOTOGRAPHER", "ASSISTANT")
  update(
    @Param("id") id: string,
    @Body() updateBookingDto: UpdateBookingDto,
    @CurrentUser() user: UserPayload,
  ) {
    if (!user.studioId && !user.isAdmin) {
      throw new ForbiddenException("User must belong to a studio");
    }

    return this.bookingService.update(id, updateBookingDto, user.studioId ?? undefined);
  }

  // Studio users: Update booking status
  @Patch(":id/status")
  @Roles("OWNER", "PHOTOGRAPHER", "ASSISTANT")
  updateStatus(
    @Param("id") id: string,
    @Body() updateStatusDto: UpdateBookingStatusDto,
    @CurrentUser() user: UserPayload,
  ) {
    if (!user.studioId && !user.isAdmin) {
      throw new ForbiddenException("User must belong to a studio");
    }

    return this.bookingService.updateStatus(id, updateStatusDto, user.studioId ?? undefined);
  }

  // Studio users: Cancel booking
  @Patch(":id/cancel")
  @Roles("OWNER", "PHOTOGRAPHER", "ASSISTANT")
  cancel(
    @Param("id") id: string,
    @Body() body: { notes?: string },
    @CurrentUser() user: UserPayload,
  ) {
    if (!user.studioId && !user.isAdmin) {
      throw new ForbiddenException("User must belong to a studio");
    }

    return this.bookingService.cancel(id, body.notes, user.studioId ?? undefined);
  }

  @Post(":id/quote")
  @Roles("OWNER", "PHOTOGRAPHER", "ASSISTANT")
  sendQuote(
    @Param("id") id: string,
    @Body() dto: SendQuoteDto,
    @CurrentUser() user: UserPayload,
  ) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }

    return this.bookingService.sendQuote(id, user.studioId, dto);
  }
}
