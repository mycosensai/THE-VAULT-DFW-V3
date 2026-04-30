import { Hono } from "hono";
export interface Env { DB: D1Database; APP_SECRET: string; }
const app = new Hono<{ Bindings: Env }>();
app.get("/api/hono", (c) => c.json({ hono: true }));
export const onRequest = app.fetch;
