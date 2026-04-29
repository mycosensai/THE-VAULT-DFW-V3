import { z } from "zod";
import { createRouter, publicQuery, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { coinbaseCharges, listings } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { env } from "./lib/env";
import { logAudit, getClientIP } from "./security";
import { TRPCError } from "@trpc/server";

const COINBASE_API = "https://api.commerce.coinbase.com/charges";

/** Make authenticated request to Coinbase Commerce API */
async function cbRequest(endpoint: string, method: "GET" | "POST", body?: any): Promise<any> {
  if (!env.coinbaseApiKey) throw new Error("Coinbase API key not configured");

  const res = await fetch(`${COINBASE_API}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-CC-Api-Key": env.coinbaseApiKey,
      "X-CC-Version": "2018-03-22",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Coinbase API error (${res.status}): ${err}`);
  }
  return res.json();
}

export const coinbaseRouter = createRouter({
  createCharge: authedQuery
    .input(
      z.object({
        listingId: z.number(),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [listing] = await db.select().from(listings).where(eq(listings.id, input.listingId)).limit(1);
      if (!listing) throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found" });
      if (listing.status === "sold") throw new TRPCError({ code: "BAD_REQUEST", message: "Item already sold" });

      const price = Number(listing.price);

      const chargeData = await cbRequest("", "POST", {
        name: listing.title,
        description: listing.description?.substring(0, 200) || `Purchase from The Vault`,
        pricing_type: "fixed_price",
        local_price: { amount: String(price), currency: "USD" },
        metadata: {
          listing_id: String(listing.id),
          user_id: ctx.user?.id ? String(ctx.user.id) : "guest",
        },
        redirect_url: input.successUrl,
        cancel_url: input.cancelUrl,
      });

      const charge = chargeData.data;

      const result = await db.insert(coinbaseCharges).values({
        listingId: listing.id,
        userId: ctx.user?.id || null,
        coinbaseChargeId: charge.id,
        coinbaseCode: charge.code || null,
        coinbaseHostedUrl: charge.hosted_url || null,
        amount: String(price),
        currency: "USD",
        status: "pending",
        metadata: JSON.stringify({
          chargeId: charge.id,
          code: charge.code,
          pricing: charge.pricing,
        }),
      });

      logAudit({
        ip: getClientIP(ctx.req),
        method: "POST",
        path: "coinbase.createCharge",
        userId: ctx.user?.id,
        action: "crypto_checkout_initiated",
        details: `listing:${listing.id} amount:${price}`,
      });

      return {
        success: true,
        chargeId: charge.id,
        hostedUrl: charge.hosted_url,
        code: charge.code,
        localDbId: Number(result.meta.last_row_id),
      };
    }),

  getChargeStatus: publicQuery
    .input(z.object({ chargeId: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [localCharge] = await db.select().from(coinbaseCharges).where(eq(coinbaseCharges.coinbaseChargeId, input.chargeId)).limit(1);

      let cbStatus: any = null;
      try {
        cbStatus = await cbRequest(`/${input.chargeId}`, "GET");
      } catch {
        // Coinbase fetch failed, return local status
      }

      if (cbStatus?.data?.timeline) {
        const timeline = cbStatus.data.timeline;
        const latest = timeline[timeline.length - 1];

        if (latest.status === "COMPLETED") {
          await db.update(coinbaseCharges).set({ status: "completed" }).where(eq(coinbaseCharges.coinbaseChargeId, input.chargeId));
          if (localCharge) {
            await db.update(listings).set({ status: "sold" }).where(eq(listings.id, localCharge.listingId));
          }
        } else if (latest.status === "EXPIRED") {
          await db.update(coinbaseCharges).set({ status: "expired" }).where(eq(coinbaseCharges.coinbaseChargeId, input.chargeId));
        } else if (latest.status === "CANCELED") {
          await db.update(coinbaseCharges).set({ status: "cancelled" }).where(eq(coinbaseCharges.coinbaseChargeId, input.chargeId));
        }
      }

      return {
        localCharge: localCharge || null,
        coinbaseStatus: cbStatus?.data || null,
      };
    }),

  listCharges: publicQuery.query(async ({ ctx }) => {
    const db = getDb();
    if (!ctx.user?.id) return [];
    return db.select().from(coinbaseCharges).where(eq(coinbaseCharges.userId, ctx.user.id)).orderBy(desc(coinbaseCharges.createdAt));
  }),

  /**
   * ADMIN ONLY: Resolve a charge manually
   * Requires admin role — prevents unauthorized payment completion
   */
  resolveCharge: adminQuery
    .input(z.object({ chargeId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [localCharge] = await db.select().from(coinbaseCharges).where(eq(coinbaseCharges.coinbaseChargeId, input.chargeId)).limit(1);
      if (!localCharge) throw new TRPCError({ code: "NOT_FOUND", message: "Charge not found" });

      await db.update(coinbaseCharges).set({ status: "completed" }).where(eq(coinbaseCharges.coinbaseChargeId, input.chargeId));
      await db.update(listings).set({ status: "sold" }).where(eq(listings.id, localCharge.listingId));

      logAudit({
        ip: getClientIP(ctx.req),
        method: "POST",
        path: "coinbase.resolveCharge",
        userId: ctx.user?.id,
        action: "admin_charge_resolved",
        details: `charge:${input.chargeId} listing:${localCharge.listingId} admin:${ctx.user?.id}`,
      });

      return { success: true, message: "Charge resolved by admin" };
    }),
});
