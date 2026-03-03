import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  Headers,
  UnauthorizedException,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { AdminLoginDto, AdminCreateDto } from "./dto/admin-auth.dto";
import { UserLoginDto, ChangePasswordDto } from "./dto/user-auth.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { Public } from "./decorators/public.decorator";
import { CurrentUser } from "./decorators/current-user.decorator";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { AuthGuard } from "@nestjs/passport";
import { UserPayload } from "../common/interfaces/user-payload.interface";
import type { Request, Response } from "express";

@Controller("auth")
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  // ============================================
  // OAUTH AUTHENTICATION
  // ============================================

  @Public()
  @Get("google")
  @UseGuards(AuthGuard("google"))
  async googleAuth(@Req() _req: Request) {
    // Passport redirects to Google automatically
  }

  @Public()
  @Get("google/callback")
  @UseGuards(AuthGuard("google"))
  async googleAuthRedirect(@Req() req: Request & { user?: { email: string; name: string; provider: string; providerId: string } }, @Res() res: Response) {
    if (!req.user) {
      // Passport failed to populate user (e.g. OAuth error or denied consent)
      const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
      return res.redirect(`${frontendUrl}/portal?error=oauth_failed`);
    }
    const authData = await this.authService.validateOAuthUser(req.user);
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";

    // Determine safe return path from OAuth state param
    let returnUrl = "/portal";
    if (req.query.state) {
      try {
        returnUrl = decodeURIComponent(req.query.state as string);
      } catch {
        // Malformed URI component — fall back to default
        returnUrl = "/portal";
      }
    }

    // Guard against open-redirect: only allow relative paths
    const safeReturnUrl = returnUrl.startsWith("/") ? returnUrl : "/portal";

    // Tokens go in the URL *fragment* (#) — fragments are never sent to servers
    // in request logs, Referer headers, or browser history on modern browsers.
    // The /auth/callback page reads window.location.hash and immediately clears it.
    const fragment = [
      `token=${encodeURIComponent(authData.accessToken)}`,
      `refreshToken=${encodeURIComponent(authData.refreshToken)}`,
    ].join("&");

    return res.redirect(
      `${frontendUrl}/auth/callback?returnTo=${encodeURIComponent(safeReturnUrl)}#${fragment}`,
    );
  }

  // ============================================
  // ADMIN AUTHENTICATION
  // ============================================

  @Public()
  @Post("admin/login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto);
  }

  @Public()
  @Post("admin/register")
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  async adminCreate(
    @Body() dto: AdminCreateDto,
    @Headers("x-admin-bootstrap-secret") secret: string,
  ) {
    // Guard: require the bootstrap secret set at deployment time.
    // This prevents anyone on the internet from creating a super-admin account.
    const expected = this.configService.get<string>("ADMIN_BOOTSTRAP_SECRET");
    if (!expected || secret !== expected) {
      throw new UnauthorizedException("Invalid bootstrap secret");
    }
    return this.authService.adminCreate(dto);
  }

  // ============================================
  // USER AUTHENTICATION
  // ============================================

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async userLogin(@Body() dto: UserLoginDto) {
    return this.authService.login(dto);
  }

  // ============================================
  // TOKEN MANAGEMENT
  // ============================================

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentUser() user: UserPayload) {
    await this.authService.logout(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async getMe(@CurrentUser() user: UserPayload) {
    return { user };
  }

  @UseGuards(JwtAuthGuard)
  @Patch("change-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() user: UserPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }
}
