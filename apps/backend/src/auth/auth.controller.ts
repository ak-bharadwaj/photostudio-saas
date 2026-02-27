import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { AdminLoginDto, AdminCreateDto } from "./dto/admin-auth.dto";
import { UserLoginDto } from "./dto/user-auth.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { Public } from "./decorators/public.decorator";
import { CurrentUser } from "./decorators/current-user.decorator";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { AuthGuard } from "@nestjs/passport";
import type { Request, Response } from "express";
import { Req, Res } from "@nestjs/common";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  // ============================================
  // OAUTH AUTHENTICATION
  // ============================================

  @Public()
  @Get("google")
  @UseGuards(AuthGuard("google"))
  async googleAuth(@Req() req: Request) {
    // Guards redirects to Google
  }

  @Public()
  @Get("google/callback")
  @UseGuards(AuthGuard("google"))
  async googleAuthRedirect(@Req() req: any, @Res() res: Response) {
    const authData = await this.authService.validateOAuthUser(req.user);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    // Extract state for returnUrl (Passport passes query state back)
    const returnUrl = req.query.state
      ? decodeURIComponent(req.query.state as string)
      : "/portal";

    // Ensure the returnUrl starts with / to prevent external redirects
    const safeReturnUrl = returnUrl.startsWith("/") ? returnUrl : "/portal";

    return res.redirect(
      `${frontendUrl}${safeReturnUrl}${safeReturnUrl.includes("?") ? "&" : "?"}token=${authData.accessToken}&refreshToken=${authData.refreshToken}`,
    );
  }

  // ============================================
  // ADMIN AUTHENTICATION
  // ============================================

  @Public()
  @Post("admin/login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  async adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto);
  }

  @Public()
  @Post("admin/register")
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 registrations per hour
  async adminCreate(@Body() dto: AdminCreateDto) {
    return this.authService.adminCreate(dto);
  }

  // ============================================
  // USER AUTHENTICATION
  // ============================================

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  async userLogin(@Body() dto: UserLoginDto) {
    return this.authService.userLogin(dto);
  }

  // ============================================
  // TOKEN MANAGEMENT
  // ============================================

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 refresh attempts per minute
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentUser() user: any) {
    await this.authService.logout(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async getMe(@CurrentUser() user: any) {
    return { user };
  }
}
