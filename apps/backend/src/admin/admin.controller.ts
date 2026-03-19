import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ConfigService } from "@nestjs/config";
import { AdminService } from "./admin.service";
import {
  CreateAdminDto,
  AdminLoginDto,
  UpdateStudioDto,
  CreateStudioWithOwnerDto,
} from "./dto/admin.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Public } from "../auth/decorators/public.decorator";

@Controller("admin")
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly configService: ConfigService,
  ) {}

  // Admin Authentication
  @Public()
  @Post("auth/register")
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 registrations per minute
  async register(
    @Body() createAdminDto: CreateAdminDto,
    @Headers("x-bootstrap-secret") bootstrapSecret?: string,
  ) {
    const requiredSecret = this.configService.get<string>("BOOTSTRAP_SECRET");
    if (!requiredSecret) {
      throw new UnauthorizedException(
        "Admin registration is disabled. Set BOOTSTRAP_SECRET in environment to enable it.",
      );
    }
    if (bootstrapSecret !== requiredSecret) {
      throw new UnauthorizedException("Invalid bootstrap secret");
    }
    return this.adminService.createAdmin(createAdminDto);
  }

  @Public()
  @Post("auth/login")
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 login attempts per minute
  async login(@Body() adminLoginDto: AdminLoginDto) {
    return this.adminService.login(adminLoginDto);
  }

  // Studio Management
  @UseGuards(JwtAuthGuard)
  @Post("studios")
  async createStudio(@Body() createStudioDto: CreateStudioWithOwnerDto) {
    return this.adminService.createStudioWithOwner(createStudioDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("studios")
  async getAllStudios(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("status") status?: string,
    @Query("tier") tier?: string,
    @Query("search") search?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 1000;
    return this.adminService.getAllStudios(
      isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage,
      isNaN(parsedLimit) || parsedLimit < 1 ? 1000 : parsedLimit,
      status,
      tier,
      search,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get("studios/:id")
  async getStudioById(@Param("id") id: string) {
    return this.adminService.getStudioById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch("studios/:id")
  async updateStudio(
    @Param("id") id: string,
    @Body() updateStudioDto: UpdateStudioDto,
  ) {
    return this.adminService.updateStudio(id, updateStudioDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post("studios/:id/suspend")
  @HttpCode(HttpStatus.OK)
  async suspendStudio(
    @Param("id") id: string,
    @Body("reason") reason?: string,
  ) {
    return this.adminService.suspendStudio(id, reason);
  }

  @UseGuards(JwtAuthGuard)
  @Post("studios/:id/activate")
  @HttpCode(HttpStatus.OK)
  async activateStudio(@Param("id") id: string) {
    return this.adminService.activateStudio(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete("studios/:id")
  async deleteStudio(@Param("id") id: string) {
    return this.adminService.deleteStudio(id);
  }

  // Analytics
  @UseGuards(JwtAuthGuard)
  @Get("analytics")
  async getPlatformAnalytics() {
    return this.adminService.getPlatformAnalytics();
  }

  @UseGuards(JwtAuthGuard)
  @Get("activities")
  async getRecentActivities(@Query("limit") limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.adminService.getRecentActivities(
      isNaN(parsedLimit) || parsedLimit < 1 ? 20 : Math.min(parsedLimit, 100),
    );
  }

  // User Management
  @UseGuards(JwtAuthGuard)
  @Get("users")
  async getAllUsers(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("role") role?: string,
    @Query("search") search?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 100;
    return this.adminService.getAllUsers(
      isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage,
      isNaN(parsedLimit) || parsedLimit < 1 ? 100 : parsedLimit,
      role,
      search,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post("users/:id/reset-password")
  @HttpCode(HttpStatus.OK)
  async resetUserPassword(@Param("id") id: string) {
    return this.adminService.resetUserPassword(id);
  }
}
