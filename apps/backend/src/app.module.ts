import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { BullModule } from "@nestjs/bull";
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
import configuration from "./config/configuration";

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
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get("redis.host") || "localhost",
          port: configService.get("redis.port") || 6379,
        },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
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
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
