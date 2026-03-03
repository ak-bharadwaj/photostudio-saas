import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyCallback } from "passport-google-oauth20";

interface GoogleProfile {
  id: string;
  name?: { givenName?: string; familyName?: string };
  emails?: Array<{ value: string }>;
  photos?: Array<{ value: string }>;
}

@Injectable()
export class GoogleStrategy
  extends PassportStrategy(Strategy, "google")
  implements OnModuleInit
{
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(private configService: ConfigService) {
    const clientID = configService.get<string>("GOOGLE_CLIENT_ID");
    const clientSecret = configService.get<string>("GOOGLE_CLIENT_SECRET");
    const callbackURL = configService.get<string>("GOOGLE_CALLBACK_URL");

    super({
      clientID: clientID || "google-oauth-not-configured",
      clientSecret: clientSecret || "google-oauth-not-configured",
      callbackURL:
        callbackURL ||
        "http://localhost:3000/auth/google/callback",
      scope: ["email", "profile"],
      passReqToCallback: false,
    });
  }

  onModuleInit() {
    const clientID = this.configService.get<string>("GOOGLE_CLIENT_ID");
    if (!clientID || clientID === "google-oauth-not-configured") {
      this.logger.warn(
        "Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL in .env to enable it.",
      );
    }
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: GoogleProfile,
    done: VerifyCallback,
  ): Promise<void> {
    const { name, emails, photos, id } = profile;

    if (!emails || emails.length === 0) {
      return done(new Error("No email returned from Google profile"), false);
    }

    const user = {
      provider: "google",
      providerId: id,
      email: emails[0].value,
      name: `${name?.givenName ?? ""} ${name?.familyName ?? ""}`.trim(),
      picture: photos?.[0]?.value ?? null,
    };

    done(null, user);
  }
}
