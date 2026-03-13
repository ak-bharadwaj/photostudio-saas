import { UserRole } from '../../generated/prisma-client';

/**
 * Represents the authenticated user attached to the request by the JWT strategy.
 * Used across all controllers via @CurrentUser() decorator.
 *
 * Declared as an abstract class (not an interface) so that it can be used in
 * decorated method signatures when `isolatedModules` and
 * `emitDecoratorMetadata` are both enabled (TS1272).
 */
export abstract class UserPayload {
  id!: string;
  email!: string;
  phone?: string;
  name!: string;
  type!: "admin" | "user";
  isAdmin!: boolean;

  // Only present for studio users (type === "user")
  role?: UserRole;
  studioId?: string;
  studio?: {
    id: string;
    name: string;
    slug: string;
    status: string;
    subscriptionExpiresAt?: Date | null;
  };
}
