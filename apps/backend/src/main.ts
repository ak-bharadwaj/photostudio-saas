import { NestFactory } from "@nestjs/core";
// Config check reload
import { ValidationPipe, Logger } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { ConfigService } from "@nestjs/config";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import type { Request, Response, NextFunction } from "express";

async function bootstrap() {
  const logger = new Logger("Bootstrap");

  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log", "debug", "verbose"],
  });

  // Enable trust proxy for Render/Vercel
  (app.getHttpAdapter().getInstance() as any).set("trust proxy", 1);

  const configService = app.get(ConfigService);
  const port = configService.get("PORT") || 3001;
  const frontendUrl =
    configService.get("FRONTEND_URL") || "http://localhost:3000";

  // Security headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Cookie parser — must be registered before CSRF middleware which reads req.cookies
  app.use(cookieParser());

  // ── OAuth returnTo cookie ────────────────────────────────────────────────
  // Intercept GET /auth/google *before* Passport's AuthGuard runs so we can
  // stash the returnTo query param in a short-lived HttpOnly cookie.
  // Passport's redirect to Google consumes the response immediately, so we
  // cannot set cookies from inside the route handler.
  app.use('/auth/google', (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' && !req.path.includes('/callback')) {
      const returnTo = (req.query?.returnTo as string) || '/portal';
      const safeReturnTo = returnTo.startsWith('/') ? returnTo : '/portal';
      res.cookie('oauth_return_to', safeReturnTo, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 5 * 60 * 1000, // 5 minutes
        secure: process.env.NODE_ENV === 'production',
      });
    }
    next();
  });


  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS configuration
  // ALLOWED_ORIGINS env var accepts a comma-separated list for multi-origin support
  // e.g. "https://reviewsfeedback.vercel.app,https://www.yourdomain.com"
  const extraOrigins = (configService.get<string>("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const allowedOrigins = Array.from(
    new Set([
      frontendUrl,
      ...extraOrigins,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ]),
  );
  // Allow any Vercel preview deployment for this project
  const vercelPreviewPattern =
    /^https:\/\/reviewsfeedback-saas-frontend-[a-z0-9]+-s-projects-2f2710cf\.vercel\.app$/;

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (vercelPreviewPattern.test(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-xsrf-token", "x-csrf-token"],
  });

  // Request logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on("finish", () => {
      const duration = Date.now() - start;
      const { method, originalUrl } = req;
      const { statusCode } = res;

      const message = `${method} ${originalUrl} ${statusCode} - ${duration}ms`;

      if (statusCode >= 500) {
        logger.error(message);
      } else if (statusCode >= 400) {
        logger.warn(message);
      } else {
        logger.log(message);
      }
    });

    next();
  });

  // Swagger API Documentation
  if (process.env.NODE_ENV !== "production") {
    const config = new DocumentBuilder()
      .setTitle("ReviewsFeedback SaaS API")
      .setDescription("API documentation for ReviewsFeedback Management Platform")
      .setVersion("1.0")
      .addBearerAuth(
        {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          name: "JWT",
          description: "Enter JWT token",
          in: "header",
        },
        "JWT-auth",
      )
      .addTag("auth", "Authentication endpoints")
      .addTag("studios", "Studio management")
      .addTag("bookings", "Booking management")
      .addTag("customers", "Customer management")
      .addTag("services", "Service catalog")
      .addTag("invoices", "Invoice management")
      .addTag("payments", "Payment tracking")
      .addTag("portfolio", "Portfolio management")
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api", app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    logger.log(`📚 Swagger API Documentation: http://localhost:${port}/api`);
  }

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    logger.log("SIGTERM signal received: closing HTTP server");
    await app.close();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    logger.log("SIGINT signal received: closing HTTP server");
    await app.close();
    process.exit(0);
  });

  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
}

bootstrap().catch((error: unknown) => {
  const logger = new Logger("Bootstrap");
  logger.error(
    "Application failed to start",
    error instanceof Error ? error.stack : String(error),
  );
  process.exit(1);
});
