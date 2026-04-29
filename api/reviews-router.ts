import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { reviews } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { sanitizeInput } from "./security";

export const reviewsRouter = createRouter({
  listByListing: publicQuery
    .input(z.object({ listingId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(reviews)
        .where(eq(reviews.listingId, input.listingId))
        .orderBy(desc(reviews.createdAt))
        .limit(50);
    }),

  statsByListing: publicQuery
    .input(z.object({ listingId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const allReviews = await db
        .select()
        .from(reviews)
        .where(eq(reviews.listingId, input.listingId));

      if (allReviews.length === 0) {
        return { avgRating: 0, totalReviews: 0, distribution: [0, 0, 0, 0, 0] };
      }

      const totalReviews = allReviews.length;
      const avgRating =
        allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;
      const distribution = [1, 2, 3, 4, 5].map(
        (star) => allReviews.filter((r) => r.rating === star).length
      );

      return {
        avgRating: Math.round(avgRating * 10) / 10,
        totalReviews,
        distribution,
      };
    }),

  create: publicQuery
    .input(
      z.object({
        listingId: z.number(),
        userName: z.string().min(1).max(255),
        userAvatar: z.string().optional(),
        rating: z.number().min(1).max(5),
        title: z.string().max(255).optional(),
        comment: z.string().max(5000).optional(),
        isVerifiedPurchase: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const result = await db.insert(reviews).values({
        listingId: input.listingId,
        userId: ctx.user?.id || null,
        userName: sanitizeInput(input.userName),
        userAvatar: input.userAvatar || null,
        rating: input.rating,
        title: input.title ? sanitizeInput(input.title) : null,
        comment: input.comment ? sanitizeInput(input.comment) : null,
        isVerifiedPurchase: input.isVerifiedPurchase || false,
      });
      return { id: Number(result.meta.last_row_id), success: true };
    }),

  helpful: publicQuery
    .input(z.object({ reviewId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [review] = await db
        .select()
        .from(reviews)
        .where(eq(reviews.id, input.reviewId))
        .limit(1);
      if (!review) throw new Error("Review not found");

      await db
        .update(reviews)
        .set({ helpfulCount: (review.helpfulCount || 0) + 1 })
        .where(eq(reviews.id, input.reviewId));

      return { success: true };
    }),
});
