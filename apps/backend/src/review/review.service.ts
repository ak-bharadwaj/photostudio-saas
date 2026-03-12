import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all reviews for a studio (scoped to the logged-in user's studio)
   */
  async findAll(studioId: string, params?: { rating?: number; isVisible?: boolean }) {
    const where: Record<string, unknown> = { studioId };
    if (params?.rating !== undefined) where.rating = params.rating;
    if (params?.isVisible !== undefined) where.isVisible = params.isVisible;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, email: true, phone: true } },
          booking: {
            select: {
              id: true,
              scheduledAt: true,
              service: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.review.count({ where }),
    ]);

    // Compute aggregate stats
    const allReviews = await this.prisma.review.findMany({
      where: { studioId },
      select: { rating: true },
    });
    const avgRating =
      allReviews.length > 0
        ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
        : 0;

    const dist = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: allReviews.filter((r) => r.rating === star).length,
    }));

    return {
      reviews,
      total,
      stats: {
        avgRating: parseFloat(avgRating.toFixed(1)),
        totalReviews: allReviews.length,
        distribution: dist,
        visibleCount: await this.prisma.review.count({ where: { studioId, isVisible: true } }),
        pendingReplyCount: await this.prisma.review.count({ where: { studioId, reply: null } }),
      },
    };
  }

  /**
   * Get single review (studio-scoped)
   */
  async findOne(id: string, studioId: string) {
    const review = await this.prisma.review.findFirst({
      where: { id, studioId },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        booking: {
          select: {
            id: true,
            scheduledAt: true,
            service: { select: { name: true } },
          },
        },
      },
    });

    if (!review) throw new NotFoundException("Review not found");
    return review;
  }

  /**
   * Reply to a review
   */
  async reply(id: string, studioId: string, reply: string) {
    const review = await this.prisma.review.findFirst({ where: { id, studioId } });
    if (!review) throw new NotFoundException("Review not found");

    return this.prisma.review.update({
      where: { id },
      data: { reply },
      include: {
        customer: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Toggle visibility of a review
   */
  async toggleVisibility(id: string, studioId: string) {
    const review = await this.prisma.review.findFirst({ where: { id, studioId } });
    if (!review) throw new NotFoundException("Review not found");

    return this.prisma.review.update({
      where: { id },
      data: { isVisible: !review.isVisible },
    });
  }

  /**
   * Delete a review (studio owner can delete)
   */
  async remove(id: string, studioId: string) {
    const review = await this.prisma.review.findFirst({ where: { id, studioId } });
    if (!review) throw new NotFoundException("Review not found");

    await this.prisma.review.delete({ where: { id } });
    return { success: true };
  }
}
