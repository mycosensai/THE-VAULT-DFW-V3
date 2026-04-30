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
import { setCloudflareEnv, env } from "../api/lib/env";
import { checkRateLimit, getSecurityHeaders, getCorsConfig } from "../api/security";

export interface Env {
  DB: D1Database;
  APP_SECRET: string;
  STRIPE_SECRET_KEY: string;
  VAULT_DOMAIN: string;
  KIMI_AUTH_URL: string;
  KIMI_CLIENT_ID: string;
  KIMI_OPEN_URL: string;
  STRIPE_PUBLISHABLE_KEY: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  X_CLIENT_ID: string;
  X_CLIENT_SECRET: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  WEBHOOK_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

// ─── Env init ───
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

// ─── Health check ───
app.get("/api/health", (c) =>
  c.json({
    status: "ok",
    version: "v3.0.0",
    timestamp: new Date().toISOString(),
  })
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
    return c.json({ error: "Internal server error", detail: err?.message || "Unknown error" }, 500);
  }
});

export const onRequest = app.fetch;
