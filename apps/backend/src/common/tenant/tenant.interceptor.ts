import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tenantContext, TenantContextData } from "./tenant-context";

/**
 * Global interceptor that extracts the studioId from the JWT-authenticated
 * user and stores it in AsyncLocalStorage so the Prisma Extension can
 * automatically scope queries.
 *
 * For admin users (isAdmin = true), studioId is null, meaning queries
 * will NOT be filtered — admins see all data.
 *
 * For unauthenticated (public) routes, no tenant context is set,
 * so the Prisma Extension will not filter either (public endpoints
 * must scope queries explicitly).
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If no user (public route), run without tenant context
    if (!user) {
      return next.handle();
    }

    const tenantData: TenantContextData = {
      studioId: user.isAdmin ? null : user.studioId || null,
      isAdmin: user.isAdmin || false,
    };

    // Run the rest of the request within the tenant context
    return new Observable((subscriber) => {
      tenantContext.run(tenantData, () => {
        next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
