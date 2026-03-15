import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class KeepAliveService implements OnModuleInit {
  private readonly logger = new Logger(KeepAliveService.name);
  private readonly PING_INTERVAL = 9 * 60 * 1000; // 9 minutes

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.logger.log("Keep-Alive Service initialized. Running 24/7.");
    this.startPinging();
  }

  private startPinging() {
    // Initial ping
    this.ping();
    
    // Scheduled pings
    setInterval(async () => {
      await this.ping();
    }, this.PING_INTERVAL);
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
