import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../prisma/prisma.service";
import { CacheService } from "../../cache/cache.service";
import { UserPayload } from "../../common/interfaces/user-payload.interface";

export interface JwtPayload {
  sub: string;
  email: string;
  type: "admin" | "user";
  studioId?: string;
}

/** Cache TTL for validated JWT payloads — shorter than JWT expiry (15 m) */
const USER_CACHE_TTL = 60; // seconds

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {
    const secret = configService.get<string>("jwt.secret");
    if (!secret) {
      throw new Error("JWT_SECRET is not defined");
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<UserPayload> {
    const cacheKey = `jwt:user:${payload.sub}`;

    if (payload.type === "admin") {
      const cached = await this.cacheService.get<UserPayload>(cacheKey);
      if (cached) return cached;

      const admin = await this.prisma.admin.findUnique({
        where: { id: payload.sub },
      });

      if (!admin) {
        throw new UnauthorizedException("Admin not found");
      }

      const result: UserPayload = {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        type: "admin",
        isAdmin: true,
      };
      await this.cacheService.set(cacheKey, result, USER_CACHE_TTL);
      return result;
    } else if (payload.type === "user") {
      const cached = await this.cacheService.get<UserPayload>(cacheKey);
      if (cached) return cached;

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { studio: true },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException("User not found or inactive");
      }

      // CUSTOMER-role users (OAuth) may not belong to a studio
      if (user.studio) {
        if (
          user.studio.status !== "ACTIVE" &&
          user.studio.status !== "TRIAL"
        ) {
          throw new UnauthorizedException(
            `Studio is ${user.studio.status.toLowerCase()}`,
          );
        }

        if (
          user.studio.subscriptionExpiresAt &&
          new Date(user.studio.subscriptionExpiresAt) < new Date()
        ) {
          throw new UnauthorizedException("Studio subscription has expired");
        }
      }

      const result: UserPayload = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        studioId: user.studioId ?? undefined,
        studio: user.studio
          ? {
              id: user.studio.id,
              name: user.studio.name,
              slug: user.studio.slug,
              status: user.studio.status,
            }
          : undefined,
        type: "user",
        isAdmin: false,
      };
      await this.cacheService.set(cacheKey, result, USER_CACHE_TTL);
      return result;
    }

    throw new UnauthorizedException("Invalid token type");
  }
}
