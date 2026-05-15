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

type AuthInput = {
  name?: string;
  email?: string;
  password?: string;
};

function getD1(env: Env): D1Database | undefined {
  return env.DB || env.thevault;
}

function getRequestContext(c: any) {
  return {
    req: c.req.raw,
    resHeaders: new Headers(),
  };
}

function getPublicAuthError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Authentication failed";
}

const app = new Hono<{ Bindings: Env }>();

app.use(async (c, next) => {
  setCloudflareEnv(c.env as unknown as Record<string, unknown>);

  const db = getD1(c.env);
  if (db) {
    setDb(db);
  }

  await next();
});

app.use(async (c, next) => {
  await next();
  const headers = getSecurityHeaders();
  for (const [key, value] of Object.entries(headers)) {
    c.header(key, value);
  }
});

app.use("/api/*", cors(getCorsConfig()));
app.use(trimTrailingSlash());

app.use("/api/*", async (c, next) => {
  const isAuth =
    c.req.path.includes("/api/auth/") ||
    c.req.path.includes("localAuth.login") ||
    c.req.path.includes("localAuth.register") ||
    c.req.path.includes("oauth.initiate") ||
    c.req.path.includes("oauth.callback");

  const config = isAuth ? { maxRequests: 5, windowMs: 60_000 } : undefined;
  const result = checkRateLimit(c.req.raw, config);

  if (!result.allowed) {
    return c.json(
      {
        ok: false,
        error: "Too many requests",
        retryAfter: Math.max(0, Math.ceil((result.resetAt - Date.now()) / 1000)),
      },
      429,
    );
  }

  await next();
});

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

app.post("/api/auth/register", async (c) => {
  let input: AuthInput;
  try {
    input = await c.req.json<AuthInput>();
  } catch {
    return c.json({ ok: false, error: "Invalid request body" }, 400);
  }

  try {
    const caller = appRouter.createCaller(await createContext(getRequestContext(c) as any));
    const result = await caller.localAuth.register({
      name: String(input.name || ""),
      email: String(input.email || ""),
      password: String(input.password || ""),
    });
    return c.json({ ok: true, ...result });
  } catch (error) {
    return c.json({ ok: false, error: getPublicAuthError(error) }, 400);
  }
});

app.post("/api/auth/login", async (c) => {
  let input: AuthInput;
  try {
    input = await c.req.json<AuthInput>();
  } catch {
    return c.json({ ok: false, error: "Invalid request body" }, 400);
  }

  try {
    const caller = appRouter.createCaller(await createContext(getRequestContext(c) as any));
    const result = await caller.localAuth.login({
      email: String(input.email || ""),
      password: String(input.password || ""),
    });
    return c.json({ ok: true, ...result });
  } catch (error) {
    return c.json({ ok: false, error: getPublicAuthError(error) }, 400);
  }
});

async function handleTRPC(c: any) {
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
}

app.all("/api/trpc", handleTRPC);
app.all("/api/trpc/*", handleTRPC);

app.all("/api/*", (c) => c.json({ error: "API route not found", path: c.req.path }, 404));

export const onRequest = async (context: any) => {
  return app.fetch(context.request, context.env, context);
};
