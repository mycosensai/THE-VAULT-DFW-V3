// @ts-nocheck
import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { wishlistItems, listings } from "@db/schema";
import { eq, desc, sql } from "drizzle-orm";
// @ts-ignore unused import preserved for future use
const _and = null;

export const wishlistRouter = createRouter({
  list: publicQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user?.id;
    const sessionId = ctx.req.headers.get("x-session-id");

    let items: any[] = [];
    if (userId) {
      items = await db
        .select()
        .from(wishlistItems)
        .where(eq(wishlistItems.userId, userId))
        .orderBy(desc(wishlistItems.createdAt));
    } else if (sessionId) {
      items = await db
        .select()
        .from(wishlistItems)
        .where(eq(wishlistItems.sessionId, sessionId))
        .orderBy(desc(wishlistItems.createdAt));
    }

    // Enrich with listing data
    const enriched = [];
    for (const item of items) {
      const [listing] = await db
        .select()
        .from(listings)
        .where(sql`${listings.id} = ${item.listingId}`)
        .limit(1);
      if (listing) enriched.push({ ...item, listing });
    }
    return enriched;
  }),

  toggle: publicQuery
    .input(z.object({ listingId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const userId = ctx.user?.id;
      const sessionId = ctx.req.headers.get("x-session-id");

      let existing: any[] = [];
      if (userId) {
        existing = await db
          .select()
          .from(wishlistItems)
          .where(sql`${wishlistItems.userId} = ${userId} AND ${wishlistItems.listingId} = ${input.listingId}`)
          .limit(1);
      } else if (sessionId) {
        existing = await db
          .select()
          .from(wishlistItems)
          .where(sql`${wishlistItems.sessionId} = ${sessionId} AND ${wishlistItems.listingId} = ${input.listingId}`)
          .limit(1);
      }

      if (existing.length > 0) {
        // Remove from wishlist
        await db.delete(wishlistItems).where(eq(wishlistItems.id, existing[0].id));
        return { added: false };
      } else {
        // Add to wishlist
        await db.insert(wishlistItems).values({
          userId: userId || null,
          listingId: input.listingId,
          sessionId: sessionId || null,
        });
        return { added: true };
      }
    }),

  check: publicQuery
    .input(z.object({ listingId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const userId = ctx.user?.id;
      const sessionId = ctx.req.headers.get("x-session-id");

      let existing: any[] = [];
      if (userId) {
        existing = await db
          .select()
          .from(wishlistItems)
          .where(sql`${wishlistItems.userId} = ${userId} AND ${wishlistItems.listingId} = ${input.listingId}`)
          .limit(1);
      } else if (sessionId) {
        existing = await db
          .select()
          .from(wishlistItems)
          .where(sql`${wishlistItems.sessionId} = ${sessionId} AND ${wishlistItems.listingId} = ${input.listingId}`)
          .limit(1);
      }

      return { isSaved: existing.length > 0 };
    }),
});
