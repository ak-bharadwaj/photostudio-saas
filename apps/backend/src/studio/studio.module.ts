import { Module } from "@nestjs/common";
import { StudioService } from "./studio.service";
import { StudioController } from "./studio.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { CacheModule } from "../cache/cache.module";
import { NotificationModule } from "../notification/notification.module";

@Module({
  imports: [PrismaModule, CacheModule, NotificationModule],
  controllers: [StudioController],
  providers: [StudioService],
  exports: [StudioService],
})
export class StudioModule {}
