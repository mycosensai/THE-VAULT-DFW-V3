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
import {
  getSecurityHeaders,
  checkRateLimit,
  getCorsConfig,
  getClientIP,
  STRICT_RATE_LIMIT,
  logAudit,
} from "../api/security";

export interface Env {
  DB: D1Database;
  APP_SECRET: string;
  STRIPE_SECRET_KEY?: string;
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
  const isAuth =
    c.req.path.includes("localAuth.login") ||
    c.req.path.includes("localAuth.register") ||
    c.req.path.includes("stripe");
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
