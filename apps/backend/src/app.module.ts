import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { CacheModule } from "./cache/cache.module";
import { AuthModule } from "./auth/auth.module";
import { UserModule } from "./user/user.module";
import { StudioModule } from "./studio/studio.module";
import { BookingModule } from "./booking/booking.module";
import { CustomerModule } from "./customer/customer.module";
import { ServiceModule } from "./service/service.module";
import { InvoiceModule } from "./invoice/invoice.module";
import { PaymentModule } from "./payment/payment.module";
import { PortfolioModule } from "./portfolio/portfolio.module";
import { NotificationModule } from "./notification/notification.module";
import { UploadModule } from "./upload/upload.module";
import { PdfModule } from "./pdf/pdf.module";
import { AdminModule } from "./admin/admin.module";
import { PublicModule } from "./public/public.module";
import { CustomerPortalModule } from "./customer-portal/customer-portal.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { QueueModule } from "./queue/queue.module";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { TenantInterceptor } from "./common/tenant";
import { CsrfMiddleware } from "./common/middleware/csrf.middleware";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";
import configuration from "./config/configuration";
import { ServeStaticModule } from "@nestjs/serve-static";
import * as path from "path";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests per ttl
      },
    ]),
    PrismaModule,
    ServeStaticModule.forRoot({
      rootPath: path.join(process.cwd(), "public", "uploads"),
      serveRoot: "/uploads",
      serveStaticOptions: { index: false },
    }),
    CacheModule,
    AuthModule,
    UserModule,
    StudioModule,
    BookingModule,
    CustomerModule,
    ServiceModule,
    InvoiceModule,
    PaymentModule,
    PortfolioModule,
    NotificationModule,
    UploadModule,
    PdfModule,
    AdminModule,
    PublicModule,
    CustomerPortalModule,
    AnalyticsModule,
    QueueModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      // ThrottlerGuard MUST be registered before JwtAuthGuard so that
      // unauthenticated brute-force requests are rate-limited before auth runs.
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CsrfMiddleware).exclude("public/(.*)").forRoutes("*");
  }
}
