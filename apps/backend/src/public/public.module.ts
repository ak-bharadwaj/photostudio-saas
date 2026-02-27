import { Module } from "@nestjs/common";
import { PublicController } from "./public.controller";
import { PublicService } from "./public.service";
import { PrismaModule } from "../prisma/prisma.module";
import { CacheModule } from "../cache/cache.module";

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [PublicController],
  providers: [PublicService],
  exports: [PublicService],
})
export class PublicModule { }
