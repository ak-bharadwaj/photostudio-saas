import { Controller, Get, Logger } from "@nestjs/common";
import { AppService } from "./app.service";
import { Public } from "./auth/decorators/public.decorator";

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get("health")
  health(): { status: string; timestamp: string } {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  @Public()
  @Get("ping")
  ping(): string {
    this.logger.log("Bot ping received.");
    return "pong";
  }
}
