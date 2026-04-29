import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { newsletterSubscribers } from "@db/schema";
import { eq } from "drizzle-orm";

export const newsletterRouter = createRouter({
  subscribe: publicQuery
    .input(z.object({ email: z.string().email().max(320) }))
    .mutation(async ({ input }) => {
      const db = getDb();

      // Check if already subscribed
      const [existing] = await db
        .select()
        .from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.email, input.email))
        .limit(1);

      if (existing) {
        if (existing.isSubscribed) {
          return { success: true, message: "You're already subscribed." };
        }
        // Resubscribe
        await db
          .update(newsletterSubscribers)
          .set({ isSubscribed: true })
          .where(eq(newsletterSubscribers.id, existing.id));
        return { success: true, message: "Welcome back! You're resubscribed." };
      }

      await db.insert(newsletterSubscribers).values({
        email: input.email,
        isSubscribed: true,
      });

      return {
        success: true,
        message: "Successfully subscribed to The Vault newsletter.",
      };
    }),

  unsubscribe: publicQuery
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [existing] = await db
        .select()
        .from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.email, input.email))
        .limit(1);

      if (!existing) {
        return { success: false, message: "Email not found in our records." };
      }

      await db
        .update(newsletterSubscribers)
        .set({ isSubscribed: false })
        .where(eq(newsletterSubscribers.id, existing.id));

      return { success: true, message: "You've been unsubscribed." };
    }),
});
