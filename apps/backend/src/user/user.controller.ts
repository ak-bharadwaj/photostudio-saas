import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from "@nestjs/swagger";
import { UserService } from "./user.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Throttle } from "@nestjs/throttler";

@ApiTags("User Management")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("users")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: "Create a new user (Owner only)" })
  @ApiResponse({ status: 201, description: "User created successfully" })
  @ApiResponse({ status: 403, description: "Only owners can create users" })
  @ApiResponse({ status: 409, description: "Email already exists" })
  create(@Body() createUserDto: CreateUserDto, @Request() req: any) {
    const { studioId, role } = req.user;
    return this.userService.create(createUserDto, studioId, role);
  }

  @Get()
  @ApiOperation({ summary: "Get all users in the studio" })
  @ApiResponse({
    status: 200,
    description: "List of users retrieved successfully",
  })
  findAll(@Request() req: any) {
    const { studioId } = req.user;
    return this.userService.findAll(studioId);
  }

  @Get("statistics")
  @ApiOperation({ summary: "Get user statistics for the studio" })
  @ApiResponse({
    status: 200,
    description: "User statistics retrieved successfully",
  })
  getStatistics(@Request() req: any) {
    const { studioId } = req.user;
    return this.userService.getStatistics(studioId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a specific user by ID" })
  @ApiResponse({ status: 200, description: "User retrieved successfully" })
  @ApiResponse({ status: 404, description: "User not found" })
  findOne(@Param("id") id: string, @Request() req: any) {
    const { studioId } = req.user;
    return this.userService.findOne(id, studioId);
  }

  @Patch(":id")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: "Update user details" })
  @ApiResponse({ status: 200, description: "User updated successfully" })
  @ApiResponse({ status: 403, description: "Insufficient permissions" })
  @ApiResponse({ status: 404, description: "User not found" })
  update(
    @Param("id") id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: any,
  ) {
    const { studioId, role, userId } = req.user;
    return this.userService.update(id, updateUserDto, studioId, role, userId);
  }

  @Patch(":id/toggle-active")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: "Activate or deactivate a user (Owner only)" })
  @ApiResponse({ status: 200, description: "User status toggled successfully" })
  @ApiResponse({
    status: 403,
    description: "Only owners can toggle user status",
  })
  @ApiResponse({ status: 404, description: "User not found" })
  toggleActive(@Param("id") id: string, @Request() req: any) {
    const { studioId, role, userId } = req.user;
    return this.userService.toggleActive(id, studioId, role, userId);
  }

  @Patch(":id/password")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: "Change user password" })
  @ApiResponse({ status: 200, description: "Password changed successfully" })
  @ApiResponse({ status: 400, description: "Invalid current password" })
  @ApiResponse({ status: 403, description: "Can only change own password" })
  changePassword(
    @Param("id") id: string,
    @Body() changePasswordDto: ChangePasswordDto,
    @Request() req: any,
  ) {
    const { studioId, userId } = req.user;
    return this.userService.changePassword(
      id,
      changePasswordDto,
      studioId,
      userId,
    );
  }

  @Delete(":id")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: "Delete a user permanently (Owner only)" })
  @ApiResponse({ status: 200, description: "User deleted successfully" })
  @ApiResponse({ status: 403, description: "Only owners can delete users" })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiResponse({
    status: 400,
    description: "Cannot delete user with assigned bookings",
  })
  remove(@Param("id") id: string, @Request() req: any) {
    const { studioId, role, userId } = req.user;
    return this.userService.remove(id, studioId, role, userId);
  }
}
