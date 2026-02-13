import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../cache/cache.service";
import {
  CreatePortfolioItemDto,
  UpdatePortfolioItemDto,
} from "./dto/portfolio.dto";

@Injectable()
export class PortfolioService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  async create(dto: CreatePortfolioItemDto, studioId: string) {
    const item = await this.prisma.portfolioItem.create({
      data: {
        ...dto,
        studioId,
      },
    });

    // Invalidate studio cache
    await this.invalidateStudioCache(studioId);

    return item;
  }

  async findAll(studioId: string, includeHidden: boolean = false) {
    const where: any = { studioId };
    if (!includeHidden) {
      where.isVisible = true;
    }

    return this.prisma.portfolioItem.findMany({
      where,
      orderBy: { sortOrder: "asc" },
    });
  }

  async findOne(id: string, studioId: string) {
    const item = await this.prisma.portfolioItem.findFirst({
      where: {
        id,
        studioId,
      },
    });

    if (!item) {
      throw new NotFoundException("Portfolio item not found");
    }

    return item;
  }

  async update(id: string, dto: UpdatePortfolioItemDto, studioId: string) {
    const item = await this.prisma.portfolioItem.findFirst({
      where: {
        id,
        studioId,
      },
    });

    if (!item) {
      throw new NotFoundException("Portfolio item not found");
    }

    const updated = await this.prisma.portfolioItem.update({
      where: { id },
      data: dto,
    });

    // Invalidate studio cache
    await this.invalidateStudioCache(studioId);

    return updated;
  }

  async remove(id: string, studioId: string) {
    const item = await this.prisma.portfolioItem.findFirst({
      where: {
        id,
        studioId,
      },
    });

    if (!item) {
      throw new NotFoundException("Portfolio item not found");
    }

    await this.prisma.portfolioItem.delete({
      where: { id },
    });

    // Invalidate studio cache
    await this.invalidateStudioCache(studioId);

    return { message: "Portfolio item deleted successfully" };
  }

  async reorder(studioId: string, itemIds: string[]) {
    // Verify all items belong to this studio
    const items = await this.prisma.portfolioItem.findMany({
      where: {
        id: { in: itemIds },
        studioId,
      },
    });

    if (items.length !== itemIds.length) {
      throw new NotFoundException(
        "Some portfolio items do not belong to this studio",
      );
    }

    // Update sort order for each item
    const updates = itemIds.map((id, index) =>
      this.prisma.portfolioItem.update({
        where: { id },
        data: { sortOrder: index },
      }),
    );

    await this.prisma.$transaction(updates);

    // Invalidate studio cache
    await this.invalidateStudioCache(studioId);

    return { message: "Portfolio items reordered successfully" };
  }

  async toggleVisibility(id: string, studioId: string) {
    const item = await this.prisma.portfolioItem.findFirst({
      where: {
        id,
        studioId,
      },
    });

    if (!item) {
      throw new NotFoundException("Portfolio item not found");
    }

    const updated = await this.prisma.portfolioItem.update({
      where: { id },
      data: { isVisible: !item.isVisible },
    });

    // Invalidate studio cache
    await this.invalidateStudioCache(studioId);

    return updated;
  }

  async getCategories(studioId: string) {
    const items = await this.prisma.portfolioItem.findMany({
      where: { studioId },
      select: { category: true },
      distinct: ["category"],
    });

    return items
      .map((item) => item.category)
      .filter((category) => category !== null);
  }

  private async invalidateStudioCache(studioId: string) {
    const studio = await this.prisma.studio.findUnique({
      where: { id: studioId },
      select: { slug: true },
    });

    if (studio) {
      await this.cacheService.del(`studio:slug:${studio.slug}`);
    }
  }
}
