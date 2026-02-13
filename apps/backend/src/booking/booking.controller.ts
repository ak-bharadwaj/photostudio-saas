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
} from "./dto/booking.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { BookingStatus } from "@prisma/client";

interface UserPayload {
  id: string;
  email: string;
  role?: "OWNER" | "PHOTOGRAPHER" | "ASSISTANT";
  studioId?: string;
  isAdmin?: boolean;
}

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

  // Studio users: List all bookings for their studio
  @Get()
  @Roles("OWNER", "PHOTOGRAPHER", "ASSISTANT")
  findAll(
    @CurrentUser() user: UserPayload,
    @Query("page", new ParseIntPipe({ optional: true })) page?: number,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number,
    @Query("status") status?: BookingStatus,
  ) {
    if (!user.studioId && !user.isAdmin) {
      throw new ForbiddenException("User must belong to a studio");
    }

    const pageNum = page || 1;
    const limitNum = limit || 10;

    return this.bookingService.findAll(
      user.studioId!,
      pageNum,
      limitNum,
      status,
    );
  }

  // Studio users: Get upcoming bookings
  @Get("upcoming")
  @Roles("OWNER", "PHOTOGRAPHER", "ASSISTANT")
  getUpcoming(
    @CurrentUser() user: UserPayload,
    @Query("limit") limit?: string,
  ) {
    if (!user.studioId && !user.isAdmin) {
      throw new ForbiddenException("User must belong to a studio");
    }

    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.bookingService.getUpcoming(user.studioId!, limitNum);
  }

  // Studio users: Get booking by ID
  @Get(":id")
  @Roles("OWNER", "PHOTOGRAPHER", "ASSISTANT")
  findOne(@Param("id") id: string, @CurrentUser() user: UserPayload) {
    if (!user.studioId && !user.isAdmin) {
      throw new ForbiddenException("User must belong to a studio");
    }

    return this.bookingService.findOne(id, user.studioId);
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

    return this.bookingService.update(id, updateBookingDto, user.studioId);
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

    return this.bookingService.updateStatus(id, updateStatusDto, user.studioId);
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

    return this.bookingService.cancel(id, body.notes, user.studioId);
  }
}
