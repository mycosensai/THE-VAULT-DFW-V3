import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { listings, stripeSessions, listingFees, saleTransactions } from "@db/schema";
import { eq } from "drizzle-orm";
import { env } from "./lib/env";
import { logAudit, getClientIP } from "./security";
import { TRPCError } from "@trpc/server";

const STRIPE_API = "https://api.stripe.com/v1";
const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 300;

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

function parseStripeSignature(signature: string) {
  return signature.split(",").reduce<Record<string, string[]>>((acc, part) => {
    const [key, value] = part.split("=");
    if (!key || !value) return acc;
    acc[key] = [...(acc[key] || []), value];
    return acc;
  }, {});
}

function bytesToHex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function verifyStripeWebhookSignature(payload: string, signature: string, secret = env.stripeWebhookSecret) {
  if (!secret) throw new Error("Stripe webhook secret is not configured");

  const parts = parseStripeSignature(signature);
  const timestamp = Number(parts.t?.[0]);
  const signatures = parts.v1 || [];

  if (!timestamp || signatures.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > STRIPE_SIGNATURE_TOLERANCE_SECONDS) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const expected = bytesToHex(digest);

  return signatures.some((candidate) => timingSafeEqual(candidate, expected));
}

export async function processStripeCheckoutSession(session: any) {
  if (!session?.id) return { status: "invalid" };
  if (session.payment_status && session.payment_status !== "paid") {
    return { status: "ignored", paymentStatus: session.payment_status };
  }

  const db = getDb();
  const metadata = session.metadata || {};

  if (metadata.feeType === "listing_fee") {
    await db
      .update(listingFees)
      .set({ status: "paid", paidAt: new Date() })
      .where(eq(listingFees.stripeSessionId, session.id));

    if (metadata.listingId) {
      await db.update(listings).set({ status: "active" }).where(eq(listings.id, Number(metadata.listingId)));
    }

    return { status: "completed", type: "listing_fee", listingId: Number(metadata.listingId || 0) };
  }

  if (metadata.saleId) {
    await db
      .update(saleTransactions)
      .set({
        status: "payment_received",
        stripePaymentIntentId: session.payment_intent || session.id,
      })
      .where(eq(saleTransactions.id, Number(metadata.saleId)));

    return { status: "completed", type: "sale", saleId: Number(metadata.saleId) };
  }

  await db.update(stripeSessions).set({ status: "completed" }).where(eq(stripeSessions.sessionId, session.id));

  const [sessRecord] = await db.select().from(stripeSessions).where(eq(stripeSessions.sessionId, session.id)).limit(1);
  if (!sessRecord) return { status: "missing_session" };

  await db.update(listings).set({ status: "sold" }).where(eq(listings.id, sessRecord.listingId));
  return { status: "completed", type: "checkout", listingId: sessRecord.listingId };
}

function validateRedirectUrls(successUrl: string, cancelUrl: string, req: Request) {
  const success = new URL(successUrl);
  const cancel = new URL(cancelUrl);
  const origin = req.headers.get("origin") || new URL(req.url).origin;
  const configuredDomain = env.vaultDomain ? `https://${env.vaultDomain.replace(/^https?:\/\//, "")}` : "";
  const allowedOrigins = new Set([origin, configuredDomain].filter(Boolean));

  if (success.origin !== cancel.origin || !allowedOrigins.has(success.origin)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Checkout redirect URL is not allowed" });
  }
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
      validateRedirectUrls(input.successUrl, input.cancelUrl, ctx.req);

      const db = getDb();
      const [listing] = await db.select().from(listings).where(eq(listings.id, input.listingId)).limit(1);
      if (!listing) throw new Error("Listing not found");
      if (listing.status === "sold") throw new Error("Item already sold");

      const price = input.offerPrice || Number(listing.price);
      if (!Number.isFinite(price) || price <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid checkout amount" });
      }

      const unitAmount = Math.round(price * 100);
      if (unitAmount < 50) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Checkout amount is below Stripe minimum" });
      }

      const commission = price * (Number(listing.commissionRate) / 100);

      const body = new URLSearchParams({
        "payment_method_types[]": "card",
        "line_items[0][price_data][currency]": "usd",
        "line_items[0][price_data][product_data][name]": listing.title.substring(0, 250) || "Vault Listing",
        "line_items[0][price_data][product_data][description]": listing.description?.substring(0, 500) || "",
        "line_items[0][price_data][unit_amount]": String(unitAmount),
        "line_items[0][quantity]": "1",
        mode: "payment",
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        client_reference_id: String(listing.id),
        "metadata[listingId]": String(listing.id),
        "metadata[userId]": ctx.user?.id ? String(ctx.user.id) : "guest",
        "metadata[commission]": String(commission),
        "payment_intent_data[metadata][listingId]": String(listing.id),
        "payment_intent_data[metadata][userId]": ctx.user?.id ? String(ctx.user.id) : "guest",
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
        await processStripeCheckoutSession(session);
      }

      const [updatedRecord] = await db.select().from(stripeSessions).where(eq(stripeSessions.sessionId, input.sessionId)).limit(1);
      return { status: session.payment_status, amount_total: session.amount_total, session: updatedRecord || null };
    }),

  getPublishableKey: publicQuery.query(() => {
    return { key: env.stripePublishableKey || "" };
  }),

  handleWebhook: publicQuery
    .input(z.object({ payload: z.string(), signature: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const valid = await verifyStripeWebhookSignature(input.payload, input.signature);
      if (!valid) {
        logAudit({
          ip: getClientIP(ctx.req),
          method: "POST",
          path: "stripe.handleWebhook",
          action: "webhook_rejected",
          details: "Invalid webhook secret",
        });
        throw new Error("Webhook verification failed");
      }

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

      const result = await processStripeCheckoutSession(session);
      if (result.status === "completed") {
        logAudit({
          ip: getClientIP(ctx.req),
          method: "POST",
          path: "stripe.handleWebhook",
          action: "webhook_processed",
          details: `session:${session.id} result:${JSON.stringify(result)}`,
        });
      }

      return { status: "completed", message: "Payment verified and processed" };
    }),

  getBranding: publicQuery.query(() => {
    return { displayName: VAULT_BRANDING.display_name, backgroundColor: VAULT_BRANDING.background_color, buttonColor: VAULT_BRANDING.button_color };
  }),
});
