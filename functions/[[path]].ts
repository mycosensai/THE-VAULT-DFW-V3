import { Hono } from "hono";

const app = new Hono();

app.get("/api/diag", async (c) => {
  const results: any = { tests: [] };

  // Test 1: lib/env
  try {
    const envMod = await import("../api/lib/env");
    results.tests.push({ name: "lib/env", ok: true });
  } catch (e: any) {
    results.tests.push({ name: "lib/env", ok: false, error: e.message });
  }

  // Test 2: queries/connection  
  try {
    const connMod = await import("../api/queries/connection");
    results.tests.push({ name: "queries/connection", ok: true });
  } catch (e: any) {
    results.tests.push({ name: "queries/connection", ok: false, error: e.message });
  }

  // Test 3: security
  try {
    const secMod = await import("../api/security");
    results.tests.push({ name: "security", ok: true });
  } catch (e: any) {
    results.tests.push({ name: "security", ok: false, error: e.message });
  }

  // Test 4: context
  try {
    const ctxMod = await import("../api/context");
    results.tests.push({ name: "context", ok: true });
  } catch (e: any) {
    results.tests.push({ name: "context", ok: false, error: e.message });
  }

  // Test 5: router
  try {
    const routerMod = await import("../api/router");
    results.tests.push({ name: "router", ok: true });
  } catch (e: any) {
    results.tests.push({ name: "router", ok: false, error: e.message });
  }

  return c.json(results);
});

export const onRequest = app.fetch;
