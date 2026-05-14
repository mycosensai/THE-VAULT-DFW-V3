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

type Env = Record<string, unknown> & {
  DB?: D1Database;
  thevault?: D1Database;
};

function getD1(env: Env): D1Database | undefined {
  return env.DB || env.thevault;
}

const app = new Hono<{ Bindings: Env }>();

// ─── Env + D1 init ───
app.use(async (c, next) => {
  setCloudflareEnv(c.env as unknown as Record<string, unknown>);

  const db = getD1(c.env);
  if (db) {
    setDb(db);
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
    ok: true,
    status: "ok",
    version: "v3.0.0",
    database: getD1(c.env) ? "bound" : "missing",
    timestamp: new Date().toISOString(),
  }),
);

app.get("/api/db/health", async (c) => {
  const db = getD1(c.env);

  if (!db) {
    return c.json({ ok: false, error: "D1 binding missing" }, 500);
  }

  try {
    const result = await db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name LIMIT 100")
      .all();

    return c.json({ ok: true, tables: result.results ?? [] });
  } catch (err) {
    return c.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "D1 query failed",
      },
      500,
    );
  }
});

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

app.all("/api/*", (c) => c.json({ error: "API route not found", path: c.req.path }, 404));

export const onRequest = async (context: any) => {
  return app.fetch(context.request, context.env, context);
};
