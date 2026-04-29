// @ts-nocheck
import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { cartItems, listings } from "@db/schema";
import { eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const cartRouter = createRouter({
  get: publicQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user?.id;
    const sessionId = ctx.req.headers.get("x-session-id");

    // Build query
    let items;
    if (userId) {
      items = await db.select().from(cartItems).where(eq(cartItems.userId, userId));
    } else if (sessionId) {
      items = await db.select().from(cartItems).where(eq(cartItems.sessionId, sessionId));
    } else {
      return [];
    }

    // Enrich with listing data
    const enriched = [];
    for (const item of items) {
      const [listing] = await db
        .select()
        .from(listings)
        .where(sql`${listings.id} = ${item.listingId}`)
        .limit(1);
      if (listing) {
        enriched.push({ ...item, listing });
      }
    }

    return enriched;
  }),

  add: publicQuery
    .input(
      z.object({
        listingId: z.number(),
        offerPrice: z.number().positive().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const userId = ctx.user?.id;
      const sessionId = ctx.req.headers.get("x-session-id");

      await db.insert(cartItems).values({
        userId: userId || null,
        sessionId: sessionId || null,
        listingId: input.listingId,
        offerPrice: input.offerPrice ? String(input.offerPrice) : null,
      });

      return { success: true };
    }),

  /**
   * SECURE: Only remove cart items the user owns
   */
  remove: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const userId = ctx.user?.id;
      const sessionId = ctx.req.headers.get("x-session-id");

      // First verify the item belongs to this user/session
      const [item] = await db
        .select()
        .from(cartItems)
        .where(eq(cartItems.id, input.id))
        .limit(1);

      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cart item not found" });
      }

      // Ownership check: userId must match OR sessionId must match
      const isOwner =
        (userId && item.userId === userId) ||
        (sessionId && item.sessionId === sessionId);

      if (!isOwner) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not own this cart item",
        });
      }

      await db.delete(cartItems).where(eq(cartItems.id, input.id));
      return { success: true };
    }),

  /**
   * SECURE: Only clear cart items the user owns
   */
  clear: publicQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user?.id;
    const sessionId = ctx.req.headers.get("x-session-id");

    if (userId) {
      await db.delete(cartItems).where(eq(cartItems.userId, userId));
    } else if (sessionId) {
      await db.delete(cartItems).where(eq(cartItems.sessionId, sessionId));
    }

    return { success: true };
  }),
});
