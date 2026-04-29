import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { listings, stripeSessions } from "@db/schema";
import { eq } from "drizzle-orm";
import { env } from "./lib/env";
import { logAudit, getClientIP } from "./security";

const STRIPE_API = "https://api.stripe.com/v1";

async function stripeFetch(endpoint: string, body?: URLSearchParams, method: string = "POST"): Promise<any> {
  if (!env.stripeSecretKey) throw new Error("Stripe is not configured");
  const res = await fetch(`${STRIPE_API}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body?.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Stripe API error: ${text}`);
  }
  return res.json();
}

const VAULT_BRANDING = {
  display_name: "The Vault",
  background_color: "#080808",
  button_color: "#C9A84C",
};

export const stripeRouter = createRouter({
  createSession: authedQuery
    .input(
      z.object({
        listingId: z.number(),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
        offerPrice: z.number().positive().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [listing] = await db.select().from(listings).where(eq(listings.id, input.listingId)).limit(1);
      if (!listing) throw new Error("Listing not found");
      if (listing.status === "sold") throw new Error("Item already sold");

      const price = input.offerPrice || Number(listing.price);
      const commission = price * (Number(listing.commissionRate) / 100);

      const body = new URLSearchParams({
        "payment_method_types[]": "card",
        "line_items[0][price_data][currency]": "usd",
        "line_items[0][price_data][product_data][name]": listing.title,
        "line_items[0][price_data][product_data][description]": listing.description?.substring(0, 500) || "",
        "line_items[0][price_data][unit_amount]": String(Math.round(price * 100)),
        "line_items[0][quantity]": "1",
        mode: "payment",
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        "metadata[listingId]": String(listing.id),
        "metadata[userId]": ctx.user?.id ? String(ctx.user.id) : "guest",
        "metadata[commission]": String(commission),
      });

      const session = await stripeFetch("/checkout/sessions", body);

      await db.insert(stripeSessions).values({
        sessionId: session.id,
        userId: ctx.user?.id || null,
        listingId: listing.id,
        amount: String(price),
        commission: String(commission),
        status: "pending",
        metadata: JSON.stringify(session.metadata || {}),
      });

      logAudit({
        ip: getClientIP(ctx.req),
        method: "POST",
        path: "stripe.createSession",
        userId: ctx.user?.id,
        action: "checkout_initiated",
        details: `listing:${listing.id} amount:${price}`,
      });

      return { sessionId: session.id, url: session.url };
    }),

  verifySession: publicQuery
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const session = await stripeFetch(`/checkout/sessions/${input.sessionId}`, undefined, "GET");
      const db = getDb();

      if (session.payment_status === "paid") {
        await db.update(stripeSessions).set({ status: "completed" }).where(eq(stripeSessions.sessionId, input.sessionId));
        const [sessRecord] = await db.select().from(stripeSessions).where(eq(stripeSessions.sessionId, input.sessionId)).limit(1);
        if (sessRecord) {
          await db.update(listings).set({ status: "sold" }).where(eq(listings.id, sessRecord.listingId));
        }
      }

      const [updatedRecord] = await db.select().from(stripeSessions).where(eq(stripeSessions.sessionId, input.sessionId)).limit(1);
      return { status: session.payment_status, amount_total: session.amount_total, session: updatedRecord || null };
    }),

  getPublishableKey: publicQuery.query(() => {
    return { key: env.stripePublishableKey || "" };
  }),

  handleWebhook: publicQuery
    .input(z.object({ payload: z.string(), signature: z.string(), secret: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // For Workers, webhook verification is done via endpoint secret comparison
      // since we can't use the Stripe SDK's crypto. In production, verify the timestamp-signature pair.
      if (input.secret !== env.stripeSecretKey) {
        logAudit({
          ip: getClientIP(ctx.req),
          method: "POST",
          path: "stripe.handleWebhook",
          action: "webhook_rejected",
          details: "Invalid webhook secret",
        });
        throw new Error("Webhook verification failed");
      }

      const db = getDb();
      let payload: any;
      try {
        payload = JSON.parse(input.payload);
      } catch {
        return { status: "invalid", error: "Invalid JSON payload" };
      }

      if (payload.type !== "checkout.session.completed") {
        return { status: "ignored", type: payload.type };
      }

      const session = payload.data?.object;
      if (!session?.id) return { status: "invalid" };

      await db.update(stripeSessions).set({ status: "completed" }).where(eq(stripeSessions.sessionId, session.id));

      const [sessRecord] = await db.select().from(stripeSessions).where(eq(stripeSessions.sessionId, session.id)).limit(1);
      if (sessRecord) {
        await db.update(listings).set({ status: "sold" }).where(eq(listings.id, sessRecord.listingId));
        logAudit({
          ip: getClientIP(ctx.req),
          method: "POST",
          path: "stripe.handleWebhook",
          action: "webhook_processed",
          details: `listing:${sessRecord.listingId} session:${session.id}`,
        });
      }

      return { status: "completed", message: "Payment verified and processed" };
    }),

  getBranding: publicQuery.query(() => {
    return { displayName: VAULT_BRANDING.display_name, backgroundColor: VAULT_BRANDING.background_color, buttonColor: VAULT_BRANDING.button_color };
  }),
});
