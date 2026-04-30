import { Hono } from "hono";

const app = new Hono();

app.get("/api/hono", (c) => {
  return c.json({ hono: true, version: "4.8.3" });
});

// Cloudflare Pages onRequest receives a context object
// Hono app.fetch expects (request, env, executionCtx)
export const onRequest = async (context: any) => {
  return app.fetch(context.request, context.env, context);
};
