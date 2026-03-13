import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class KeepAliveService implements OnModuleInit {
  private readonly logger = new Logger(KeepAliveService.name);
  private readonly PING_INTERVAL = 10000; // 10 seconds

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.logger.log("Keep-Alive Service initialized.");
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
    // Use local server hour (Render servers often use UTC by default)
    const currentHour = now.getHours();

    // Active: 5 AM (5) to 11 PM (23)
    // Sleep: 12 AM (0) to 4 AM (4)
    // Note: 11 PM is hour 23.
    const isActiveRange = currentHour >= 5 && currentHour <= 23;
    
    return isActiveRange;
  }

  private async ping() {
    // We try to ping the configured backend URL to simulate inbound traffic
    const backendUrl = this.configService.get<string>("BACKEND_URL") || `http://localhost:${this.configService.get("PORT") || 3001}`;
    const healthUrl = `${backendUrl}/health`;

    try {
      const response = await fetch(healthUrl);
      if (response.ok) {
        this.logger.debug(`Keep-alive ping successful: ${healthUrl}`);
      } else {
        this.logger.warn(`Keep-alive ping returned status: ${response.status}`);
      }
    } catch (error: any) {
      this.logger.error(`Keep-alive ping failed: ${error.message}`);
    }
  }
}
