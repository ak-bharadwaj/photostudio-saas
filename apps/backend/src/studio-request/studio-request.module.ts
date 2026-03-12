import { Module } from "@nestjs/common";
import { StudioRequestService } from "./studio-request.service";
import { StudioRequestController } from "./studio-request.controller";

@Module({
  controllers: [StudioRequestController],
  providers: [StudioRequestService],
  exports: [StudioRequestService],
})
export class StudioRequestModule {}
