/**
 * Cloudflare Pages Functions Entry Point - MINIMAL TEST VERSION
 */
import { Hono } from "hono";

export interface Env {
  DB: D1Database;
  APP_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

// Test basic response
app.get("/api/test", (c) => {
  return c.json({ status: "ok", message: "Minimal Function works!" });
});

export const onRequest = app.fetch;
