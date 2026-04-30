/**
 * Cloudflare Pages Functions Entry Point - PLAIN TEST
 */
export interface Env {
  DB: D1Database;
  APP_SECRET: string;
}

export const onRequest = async (context: { request: Request; env: Env }) => {
  const url = new URL(context.request.url);
  if (url.pathname === "/api/test") {
    return new Response(JSON.stringify({ status: "ok", env: Object.keys(context.env) }), {
      headers: { "Content-Type": "application/json" }
    });
  }
  return new Response("Not found", { status: 404 });
};
