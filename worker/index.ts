import { Hono } from "hono";
import { cors } from "hono/cors";
import { trimTrailingSlash } from "hono/trailing-slash";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { appRouter } from "../api/router";
import { createContext } from "../api/context";
import { setCloudflareEnv } from "../api/lib/env";
import { setDb } from "../api/queries/connection";
import { checkRateLimit, getCorsConfig, getSecurityHeaders } from "../api/security";

type Env = Record<string, unknown> & {
  DB?: D1Database;
  ASSETS?: Fetcher;
};

const app = new Hono<{ Bindings: Env }>();

function getD1(env: Env): D1Database | undefined {
  return env.DB;
}

app.use(async (c, next) => {
  setCloudflareEnv(c.env);

  const d1 = getD1(c.env);

  if (d1) {
    setDb(d1);
  }

  await next();

  for (const [key, value] of Object.entries(getSecurityHeaders())) {
    c.header(key, value);
  }
});

app.use(trimTrailingSlash());
app.use("/api/*", cors(getCorsConfig()));

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
  const d1 = getD1(c.env);

  if (!d1) {
    return c.json({ ok: false, error: "D1 binding missing" }, 500);
  }

  try {
    const result = await d1
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
  } catch (err) {
    console.error("[tRPC Handler Error]", err);

    return c.json({ error: "Internal server error" }, 500);
  }
}

app.all("/api/trpc", handleTRPC);
app.all("/api/trpc/*", handleTRPC);

app.all("/api/*", (c) =>
  c.json(
    {
      error: "API route not found",
      path: c.req.path,
    },
    404,
  ),
);

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return app.fetch(request, env, ctx);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Static assets unavailable", {
      status: 503,
    });
  },
};
