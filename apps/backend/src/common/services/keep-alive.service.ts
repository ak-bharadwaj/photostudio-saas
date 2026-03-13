import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class KeepAliveService implements OnModuleInit {
  private readonly logger = new Logger(KeepAliveService.name);
  private readonly PING_INTERVAL = 10000; // 10 seconds

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.logger.log("Keep-Alive Service initialized. (Schedule: 05:00 - 23:30)");
    this.startPinging();
  }

  private startPinging() {
    setInterval(async () => {
      if (this.shouldBeActive()) {
        await this.ping();
      }
    }, this.PING_INTERVAL);
  }

  private shouldBeActive(): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();

    // Start at 5:00 AM
    if (currentHour < 5) return false;

    // Stop at 11:30 PM (Hour 23, Minute 30)
    if (currentHour === 23 && currentMinutes > 30) return false;
    if (currentHour > 23) return false;

    return true;
  }

  private async ping() {
    // We ping the /ping endpoint which is ultra-lightweight
    const backendUrl = this.configService.get<string>("BACKEND_URL") || `http://localhost:${this.configService.get("PORT") || 3001}`;
    const pingUrl = `${backendUrl}/ping`;

    try {
      const response = await fetch(pingUrl);
      if (response.ok) {
        this.logger.log(`Keep-alive ping successful: ${pingUrl}`);
      } else {
        this.logger.warn(`Keep-alive ping returned status: ${response.status}`);
      }
    } catch (error: any) {
      // We use debug or log here instead of error to avoid cluttering logs if the server is starting up
      this.logger.log(`Keep-alive ping attempt: ${error.message}`);
    }
  }
}
