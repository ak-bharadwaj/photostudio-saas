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
import {
  UserLoginDto,
  UserRegisterDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from "./dto/user-auth.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { Public } from "./decorators/public.decorator";
import { CurrentUser } from "./decorators/current-user.decorator";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { AuthGuard } from "@nestjs/passport";
import { UserPayload } from "../common/interfaces/user-payload.interface";
import type { Request, Response } from "express";

import { SkipSubscriptionCheck } from "./decorators/skip-subscription-check.decorator";

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
    // The oauth_return_to cookie is set by the Express middleware in main.ts
    // before this handler runs. Passport's AuthGuard redirects to Google here.
  }

  @Public()
  @Get("google/callback")
  @UseGuards(AuthGuard("google"))
  async googleAuthRedirect(
    @Req()
    req: Request & {
      user?: {
        email: string;
        name: string;
        provider: string;
        providerId: string;
      };
      session?: Record<string, any>;
      cookies?: Record<string, string>;
    },
    @Res() res: Response,
  ) {
    const frontendUrl =
      this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";

    if (!req.user) {
      return res.redirect(`${frontendUrl}/portal/login?error=oauth_failed`);
    }

    const authData = await this.authService.validateOAuthUser(req.user);

    // Read returnTo from the cookie set in googleAuth, then clear it.
    const cookieReturnTo = req.cookies?.["oauth_return_to"] || "";
    res.clearCookie("oauth_return_to");

    // Fall back chain: cookie → OAuth state param → /portal
    const rawReturn =
      (cookieReturnTo && cookieReturnTo.startsWith("/")
        ? cookieReturnTo
        : "") ||
      (req.query?.state ? decodeURIComponent(req.query.state as string) : "") ||
      "/";

    // Guard against open-redirect: only allow relative paths
    const safeReturnUrl = rawReturn.startsWith("/") ? rawReturn : "/";

    // Tokens go in the URL *fragment* (#) — never logged by servers or proxy
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

  @Public()
  @Post("register/customer")
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  async customerRegister(@Body() dto: UserRegisterDto) {
    return this.authService.customerRegister(dto);
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
  @SkipSubscriptionCheck()
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

  @Public()
  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { message: "If an account exists, a reset link has been sent." };
  }

  @Public()
  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: "Password has been reset successfully." };
  }
}
