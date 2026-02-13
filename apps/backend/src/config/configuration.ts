export default () => ({
  app: {
    env: process.env.NODE_ENV || "development",
    port: parseInt(process.env.PORT || "3000", 10),
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret:
      process.env.JWT_SECRET || "your-jwt-secret-key-change-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
  },
  cloudinary: {
    url: process.env.CLOUDINARY_URL,
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.RESEND_FROM_EMAIL || "noreply@yourdomain.com",
  },
  twilio: {
    sid: process.env.TWILIO_SID,
    token: process.env.TWILIO_TOKEN,
    whatsappFrom: process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886",
  },
  sentry: {
    dsn: process.env.SENTRY_DSN,
  },
  posthog: {
    apiKey: process.env.POSTHOG_API_KEY,
  },
});
