import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateStudioRequestDto } from "./dto/studio-request.dto";
import { StudioRequestStatus } from "@prismaclient";

@Injectable()
export class StudioRequestService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateStudioRequestDto) {
    return this.prisma.studioRequest.create({
      data: {
        studioName: dto.studioName,
        ownerName: dto.ownerName,
        email: dto.email,
        phone: dto.phone,
        city: dto.city,
        notes: dto.notes,
      },
    });
  }

  async findAll() {
    return this.prisma.studioRequest.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async updateStatus(id: string, status: StudioRequestStatus) {
    return this.prisma.studioRequest.update({
      where: { id },
      data: { status },
    });
  }
}
