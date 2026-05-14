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

app.use(async (c, next) => {
  setCloudflareEnv(c.env);

  if (c.env.DB) {
    setDb(c.env.DB);
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

app.get("/api/health", (c) =>
  c.json({
    ok: true,
    status: "ok",
    version: "v3.0.0",
    timestamp: new Date().toISOString(),
  }),
);

app.all("/api/trpc/*", async (c) => {
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
});

app.all("/api/*", (c) => c.json({ error: "API route not found", path: c.req.path }, 404));

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
};
