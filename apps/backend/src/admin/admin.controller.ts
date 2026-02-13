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
} from "@nestjs/common";
import { AdminService } from "./admin.service";
import {
  CreateAdminDto,
  AdminLoginDto,
  UpdateStudioDto,
} from "./dto/admin.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Public } from "../auth/decorators/public.decorator";

@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Admin Authentication
  @Public()
  @Post("auth/register")
  async register(@Body() createAdminDto: CreateAdminDto) {
    return this.adminService.createAdmin(createAdminDto);
  }

  @Public()
  @Post("auth/login")
  async login(@Body() adminLoginDto: AdminLoginDto) {
    return this.adminService.login(adminLoginDto);
  }

  // Studio Management
  @UseGuards(JwtAuthGuard)
  @Get("studios")
  async getAllStudios(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("status") status?: string,
    @Query("tier") tier?: string,
  ) {
    return this.adminService.getAllStudios(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      status,
      tier,
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
  async suspendStudio(
    @Param("id") id: string,
    @Body("reason") reason?: string,
  ) {
    return this.adminService.suspendStudio(id, reason);
  }

  @UseGuards(JwtAuthGuard)
  @Post("studios/:id/activate")
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
    return this.adminService.getRecentActivities(limit ? parseInt(limit) : 20);
  }
}
