import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../prisma/prisma.service";

export interface JwtPayload {
  sub: string;
  email: string;
  type: "admin" | "user";
  studioId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
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

  async validate(payload: JwtPayload) {
    if (payload.type === "admin") {
      const admin = await this.prisma.admin.findUnique({
        where: { id: payload.sub },
      });

      if (!admin) {
        throw new UnauthorizedException("Admin not found");
      }

      return {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        type: "admin",
      };
    } else if (payload.type === "user") {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { studio: true },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException("User not found or inactive");
      }

      if (user.studio.status !== "ACTIVE") {
        throw new UnauthorizedException("Studio is not active");
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        studioId: user.studioId,
        studio: user.studio,
        type: "user",
      };
    }

    throw new UnauthorizedException("Invalid token type");
  }
}
