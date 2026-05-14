/**
 * Cloudflare Pages Functions Entry Point
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { trimTrailingSlash } from "hono/trailing-slash";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { appRouter } from "../api/router";
import { createContext } from "../api/context";
import { setDb } from "../api/queries/connection";
import { setCloudflareEnv } from "../api/lib/env";
import { checkRateLimit, getSecurityHeaders, getCorsConfig } from "../api/security";

export interface Env {
  DB: D1Database;
  APP_SECRET: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  VITE_STRIPE_PUBLISHABLE_KEY?: string;
  VAULT_DOMAIN?: string;
  NODE_ENV?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  X_CLIENT_ID?: string;
  X_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  RESEND_API_KEY?: string;
}

const app = new Hono<{ Bindings: Env }>();

// ─── Env + D1 init ───
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

// ─── Trailing slash ───
app.use(trimTrailingSlash());

// ─── Rate limiting ───
app.use("/api/*", async (c, next) => {
  const isAuth =
    c.req.path.includes("localAuth.login") ||
    c.req.path.includes("localAuth.register") ||
    c.req.path.includes("oauth.initiate") ||
    c.req.path.includes("oauth.callback");

  const config = isAuth ? { maxRequests: 5, windowMs: 60_000 } : undefined;
  const result = checkRateLimit(c.req.raw, config);

  if (!result.allowed) {
    return c.json(
      {
        error: "Too many requests",
        retryAfter: Math.max(0, Math.ceil((result.resetAt - Date.now()) / 1000)),
      },
      429,
    );
  }

  await next();
});

// ─── Health check ───
app.get("/api/health", (c) =>
  c.json({
    status: "ok",
    version: "v3.0.0",
    timestamp: new Date().toISOString(),
  }),
);

// ─── tRPC handler ───
app.use("/api/trpc/*", async (c) => {
  try {
    return await fetchRequestHandler({
      endpoint: "/api/trpc",
      req: c.req.raw,
      router: appRouter,
      createContext,
      onError: (opts) => {
        console.error(`[tRPC] ${opts.error.code} | ${opts.path} | ${opts.error.message}`);
      },
    });
  } catch (err: any) {
    console.error("[tRPC Handler Error]", err?.message || err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export const onRequest = async (context: any) => {
  return app.fetch(context.request, context.env, context);
};
