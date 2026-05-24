/**
 * Cloudflare Pages Functions Entry Point
 * Replaces Node.js boot.ts — runs as a Cloudflare Worker with D1
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { trimTrailingSlash } from "hono/trailing-slash";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../api/router";
import { createContext } from "../api/context";
import { setDb } from "../api/queries/connection";
import { setCloudflareEnv } from "../api/lib/env";
import { verifyStripeWebhookSignature, processStripeCheckoutSession } from "../api/stripe-router";
import {
  getSecurityHeaders,
  checkRateLimit,
  getCorsConfig,
  STRICT_RATE_LIMIT,
  logAudit,
} from "../api/security";

export interface Env {
  DB: D1Database;
  APP_SECRET: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  VITE_STRIPE_PUBLISHABLE_KEY?: string;
  COINBASE_API_KEY?: string;
  OPENAI_API_KEY?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  X_CLIENT_ID?: string;
  X_CLIENT_SECRET?: string;
  NODE_ENV?: string;
  VAULT_DOMAIN?: string;
}

const app = new Hono<{ Bindings: Env }>();

// ─── Initialize environment & DB ───
app.use(async (c, next) => {
  setCloudflareEnv(c.env as unknown as Record<string, unknown>);
  if (c.env.DB) {
    setDb(c.env.DB);
  }
  await next();
});

// ─── Security headers ───
app.use(async (c, next) => {
  await next();
  const headers = getSecurityHeaders();
  for (const [key, value] of Object.entries(headers)) {
    c.header(key, value);
  }
});

// ─── CORS ───
app.use("/api/*", cors(getCorsConfig()));
app.use(trimTrailingSlash());

// ─── Rate limiting ───
app.use("/api/*", async (c, next) => {
  const isStripeWebhook = c.req.path === "/api/stripe/webhook";
  const isAuth =
    !isStripeWebhook &&
    (c.req.path.includes("localAuth.login") ||
      c.req.path.includes("localAuth.register") ||
      c.req.path.includes("stripe"));
  const config = isAuth ? STRICT_RATE_LIMIT : undefined;
  const result = checkRateLimit(c.req.raw, config);
  if (!result.allowed) {
    return c.json(
      { error: "Too many requests", retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000) },
      429
    );
  }
  await next();
});

// ─── Health check ───
app.get("/api/health", (c) =>
  c.json({ status: "ok", timestamp: Date.now(), environment: "production" })
);

// ─── tRPC handler ───
app.post("/api/stripe/webhook", async (c) => {
  const signature = c.req.header("stripe-signature") || "";
  const payload = await c.req.text();
  const valid = await verifyStripeWebhookSignature(payload, signature, c.env.STRIPE_WEBHOOK_SECRET);

  if (!valid) {
    logAudit({
      ip: c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for") || "unknown",
      method: "POST",
      path: "/api/stripe/webhook",
      action: "webhook_rejected",
      details: "Invalid Stripe signature",
    });
    return c.json({ error: "Invalid signature" }, 400);
  }

  let event: any;
  try {
    event = JSON.parse(payload);
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  if (event.type === "checkout.session.completed") {
    const result = await processStripeCheckoutSession(event.data?.object);
    logAudit({
      ip: c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for") || "unknown",
      method: "POST",
      path: "/api/stripe/webhook",
      action: "checkout_session_completed",
      details: JSON.stringify(result),
    });
  }

  return c.json({ received: true });
});

app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
    onError: (opts) => {
      console.error(`[tRPC] ${opts.error.code} | ${opts.path} | ${opts.error.message}`);
    },
  });
});

// ─── 404 for unmatched API routes ───
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export const onRequest = app.fetch;
