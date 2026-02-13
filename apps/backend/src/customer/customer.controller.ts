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
  ParseIntPipe,
} from "@nestjs/common";
import { CustomerService } from "./customer.service";
import { CreateCustomerDto, UpdateCustomerDto } from "./dto/customer.dto";
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

@Controller("customers")
@UseGuards(RolesGuard)
@Roles("OWNER", "PHOTOGRAPHER", "ASSISTANT")
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  create(
    @Body() createCustomerDto: CreateCustomerDto,
    @CurrentUser() user: UserPayload,
  ) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    return this.customerService.create(createCustomerDto, user.studioId);
  }

  @Get()
  findAll(
    @CurrentUser() user: UserPayload,
    @Query("page", new ParseIntPipe({ optional: true })) page?: number,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number,
    @Query("search") search?: string,
  ) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }

    const pageNum = page || 1;
    const limitNum = limit || 10;

    return this.customerService.findAll(
      user.studioId,
      pageNum,
      limitNum,
      search,
    );
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: UserPayload) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    return this.customerService.findOne(id, user.studioId);
  }

  @Get(":id/stats")
  getStats(@Param("id") id: string, @CurrentUser() user: UserPayload) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    return this.customerService.getStats(id, user.studioId);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @CurrentUser() user: UserPayload,
  ) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    return this.customerService.update(id, updateCustomerDto, user.studioId);
  }

  @Delete(":id")
  @Roles("OWNER") // Only owners can delete customers
  remove(@Param("id") id: string, @CurrentUser() user: UserPayload) {
    if (!user.studioId) {
      throw new ForbiddenException("User must belong to a studio");
    }
    return this.customerService.remove(id, user.studioId);
  }
}
