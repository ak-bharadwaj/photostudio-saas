import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService, JwtSignOptions } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../cache/cache.service";
import { AdminLoginDto, AdminCreateDto } from "./dto/admin-auth.dto";
import { UserLoginDto, UserRegisterDto } from "./dto/user-auth.dto";
import { JwtPayload } from "./strategies/jwt.strategy";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private cacheService: CacheService,
  ) { }

  // ============================================
  // ADMIN AUTHENTICATION
  // ============================================

  async adminLogin(dto: AdminLoginDto) {
    const admin = await this.prisma.admin.findUnique({
      where: { email: dto.email },
    });

    if (!admin) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      admin.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const tokens = await this.generateTokens({
      sub: admin.id,
      email: admin.email,
      type: "admin",
    });

    return {
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: "ADMIN",
      },
      ...tokens,
    };
  }

  async adminCreate(dto: AdminCreateDto) {
    const existingAdmin = await this.prisma.admin.findUnique({
      where: { email: dto.email },
    });

    if (existingAdmin) {
      throw new ConflictException("Admin with this email already exists");
    }

    const passwordHash = await this.hashPassword(dto.password);

    const admin = await this.prisma.admin.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
      },
    });

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
    };
  }

  // ============================================
  // USER AUTHENTICATION
  // ============================================

  async login(dto: UserLoginDto) {
    // Run both DB lookups in parallel to eliminate timing oracle that would
    // reveal whether an email belongs to an admin vs. a regular user.
    const [admin, user] = await Promise.all([
      this.prisma.admin.findUnique({ where: { email: dto.email } }),
      this.prisma.user.findUnique({
        where: { email: dto.email },
        include: { studio: true },
      }),
    ]);

    // 1. Try Admin
    if (admin) {
      const isPasswordValid = await bcrypt.compare(
        dto.password,
        admin.passwordHash,
      );

      if (isPasswordValid) {
        const tokens = await this.generateTokens({
          sub: admin.id,
          email: admin.email,
          type: "admin",
        });

        return {
          user: {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: "ADMIN",
          },
          ...tokens,
          userType: "admin",
        };
      }
    }

    // 2. Try User
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // If the user registered via OAuth they have no passwordHash — treat as
    // invalid credentials rather than letting bcrypt throw on a null value.
    if (!user.passwordHash) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Check studio status for non-admins (allow ACTIVE and TRIAL)
    if (user.studio && user.studio.status !== "ACTIVE" && user.studio.status !== "TRIAL") {
      throw new UnauthorizedException("Studio is not active");
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      type: "user",
      studioId: user.studioId ?? undefined,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        studioId: user.studioId,
        studio: user.studio
          ? {
            id: user.studio.id,
            name: user.studio.name,
            slug: user.studio.slug,
          }
          : null,
      },
      ...tokens,
      userType: "user",
    };
  }

  async userRegister(dto: UserRegisterDto, studioId: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException("User with this email already exists");
    }

    const passwordHash = await this.hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        studioId,
        role: "OWNER",
      },
      include: { studio: true },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      studioId: user.studioId,
    };
  }

  // ============================================
  // OAUTH AUTHENTICATION
  // ============================================

  async validateOAuthUser(profile: {
    email: string;
    name: string;
    provider: string;
    providerId: string;
  }) {
    // 1. Find or create the global User
    let user = await this.prisma.user.findUnique({
      where: { email: profile.email },
      include: { studio: true },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          role: "CUSTOMER",
          provider: profile.provider,
          providerId: profile.providerId,
          isActive: true,
        },
        include: { studio: true },
      });

      // 2. Synchronize existing studio-specific Customer records to this new global User
      // This links all their previous bookings across different studios to this one account
      await this.prisma.customer.updateMany({
        where: { email: profile.email, globalUserId: null },
        data: { globalUserId: user.id },
      });
    } else {
      // CRIT-04: If the user registered via email/password (provider === "local"),
      // an OAuth sign-in with the same email MUST be rejected — allowing it would
      // let an attacker take over any account by simply knowing its email address.
      if (user.provider === "local") {
        throw new UnauthorizedException(
          "An account with this email already exists. Please sign in with your email and password.",
        );
      }

      // Only set provider info when the user has never had an OAuth provider
      // linked (e.g. legacy rows with null providerId).
      if (!user.providerId) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            provider: profile.provider,
            providerId: profile.providerId,
          },
          include: { studio: true },
        });
      }
    }

    // 3. Generate tokens for the global customer
    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      type: "user",
      studioId: user.studioId || undefined,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        studioId: user.studioId,
        studio: user.studio
          ? {
            id: user.studio.id,
            name: user.studio.name,
            slug: user.studio.slug,
          }
          : null,
      },
      ...tokens,
    };
  }

  // ============================================
  // TOKEN MANAGEMENT
  // ============================================

  async generateTokens(payload: JwtPayload) {
    const secret = this.configService.get<string>("jwt.secret");
    const expiresIn =
      this.configService.get<string>("jwt.expiresIn") || "15m";
    const refreshExpiresIn =
      this.configService.get<string>("jwt.refreshExpiresIn") || "7d";

    const baseOpts: JwtSignOptions = { secret };

    const accessToken = this.jwtService.sign(
      { ...payload },
      { ...baseOpts, expiresIn: expiresIn as JwtSignOptions["expiresIn"] },
    );

    const refreshToken = this.jwtService.sign(
      { ...payload },
      { ...baseOpts, expiresIn: refreshExpiresIn as JwtSignOptions["expiresIn"] },
    );

    // Store refresh token in Redis
    await this.cacheService.set(
      `refresh_token:${payload.sub}`,
      refreshToken,
      7 * 24 * 60 * 60, // 7 days
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>("jwt.secret"),
      });

      // Check if refresh token is stored in Redis
      const storedToken = await this.cacheService.get<string>(
        `refresh_token:${payload.sub}`,
      );

      if (!storedToken || storedToken !== refreshToken) {
        throw new UnauthorizedException("Invalid refresh token");
      }

      // Invalidate the old refresh token before issuing new ones (token rotation)
      await this.cacheService.del(`refresh_token:${payload.sub}`);

      // Generate new tokens
      return this.generateTokens({
        sub: payload.sub,
        email: payload.email,
        type: payload.type,
        studioId: payload.studioId,
      });
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) throw error;
      // JsonWebTokenError, TokenExpiredError, NotBeforeError from jsonwebtoken
      if (
        error instanceof Error &&
        ["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(
          error.constructor.name,
        )
      ) {
        throw new UnauthorizedException("Invalid refresh token");
      }
      throw error; // Re-throw unexpected errors (Redis failures, programming errors)
    }
  }

  async logout(userId: string) {
    // Remove refresh token from Redis
    await this.cacheService.del(`refresh_token:${userId}`);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    // OAuth-only accounts have no password
    if (!user.passwordHash) {
      throw new BadRequestException(
        "This account uses social login and does not have a password.",
      );
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException("Current password is incorrect");
    }

    const newHash = await this.hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Invalidate all existing refresh tokens so re-login is required on other devices
    await this.cacheService.del(`refresh_token:${userId}`);
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  async validatePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}
