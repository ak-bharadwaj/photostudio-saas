import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";
import { Public } from "./auth/decorators/public.decorator";

@Controller()
export class AppController {
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
    return "pong";
  }
}
