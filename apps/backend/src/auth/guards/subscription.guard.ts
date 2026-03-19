import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { SKIP_SUBSCRIPTION_KEY } from "../decorators/skip-subscription-check.decorator";
import { UserPayload } from "../../common/interfaces/user-payload.interface";

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skipCheck = this.reflector.getAllAndOverride<boolean>(
      SKIP_SUBSCRIPTION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: UserPayload = request.user;

    // Admins and customers (not belonging to a studio) skip the check
    if (!user || user.isAdmin || !user.studioId || !user.studio) {
      return true;
    }

    // Block access if studio is EXPIRED or SUSPENDED
    if (
      user.studio.status === "EXPIRED" ||
      user.studio.status === "SUSPENDED"
    ) {
      throw new ForbiddenException(
        `Studio access is ${user.studio.status.toLowerCase()}`,
      );
    }

    // Check expiry date
    if (user.studio.subscriptionExpiresAt) {
      const expiry = new Date(user.studio.subscriptionExpiresAt);
      if (expiry < new Date()) {
        throw new ForbiddenException("Studio subscription has expired");
      }
    }

    return true;
  }
}
