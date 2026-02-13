import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  ForbiddenException,
  ParseIntPipe,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { PaymentService } from "./payment.service";
import { CreatePaymentDto } from "./dto/payment.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

interface UserPayload {
  id: string;
  email: string;
  role?: "OWNER" | "PHOTOGRAPHER" | "ASSISTANT";
  studioId?: string;
  isAdmin?: boolean;
}

@Controller("payments")
@UseGuards(RolesGuard)
@Roles("OWNER", "PHOTOGRAPHER", "ASSISTANT")
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @Roles("OWNER") // Only owners can record payments
  create(
    @Body() createPaymentDto: CreatePaymentDto,
    @CurrentUser() user: UserPayload,
  ) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    return this.paymentService.create(createPaymentDto, user.studioId);
  }

  @Get()
  findAll(
    @CurrentUser() user: UserPayload,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number,
    @Query("paymentMethod") paymentMethod?: string,
  ) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    const params = {
      limit,
      paymentMethod,
    };
    return this.paymentService.findAll(user.studioId, params);
  }

  @Get("stats")
  getStats(@CurrentUser() user: UserPayload) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    return this.paymentService.getStats(user.studioId);
  }

  @Get("invoice/:invoiceId")
  findAllByInvoice(
    @Param("invoiceId") invoiceId: string,
    @CurrentUser() user: UserPayload,
  ) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    return this.paymentService.findAllByInvoice(invoiceId, user.studioId);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: UserPayload) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    return this.paymentService.findOne(id, user.studioId);
  }

  @Delete(":id")
  @Roles("OWNER") // Only owners can delete payments
  remove(@Param("id") id: string, @CurrentUser() user: UserPayload) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    return this.paymentService.remove(id, user.studioId);
  }
}
