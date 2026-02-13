import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
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
  ) {}

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
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
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

  async userLogin(dto: UserLoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { studio: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (user.studio.status !== "ACTIVE") {
      throw new UnauthorizedException("Studio is not active");
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      type: "user",
      studioId: user.studioId,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        studioId: user.studioId,
        studio: {
          id: user.studio.id,
          name: user.studio.name,
          slug: user.studio.slug,
        },
      },
      ...tokens,
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
  // TOKEN MANAGEMENT
  // ============================================

  async generateTokens(payload: JwtPayload) {
    const secret = this.configService.get<string>("jwt.secret");
    const expiresIn = (this.configService.get<string>("jwt.expiresIn") ||
      "15m") as any;
    const refreshExpiresIn = (this.configService.get<string>(
      "jwt.refreshExpiresIn",
    ) || "7d") as any;

    const accessToken = this.jwtService.sign(payload as any, {
      secret,
      expiresIn,
    });

    const refreshToken = this.jwtService.sign(payload as any, {
      secret,
      expiresIn: refreshExpiresIn,
    });

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

      // Generate new tokens
      return this.generateTokens({
        sub: payload.sub,
        email: payload.email,
        type: payload.type,
        studioId: payload.studioId,
      });
    } catch (error) {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async logout(userId: string) {
    // Remove refresh token from Redis
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
