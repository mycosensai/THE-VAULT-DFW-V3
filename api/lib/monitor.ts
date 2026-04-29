/**
 * Datadog API Filler / Monitoring Stub
 * Replaces external Datadog monitoring with console-based telemetry.
 * Safe for Cloudflare Workers (no Node.js APIs).
 */

export interface MonitorTags {
  [key: string]: string | number | boolean;
}

export interface SpanContext {
  name: string;
  startTime: number;
  tags?: MonitorTags;
}

// ─── Console-based telemetry ───
function log(level: "info" | "warn" | "error", message: string, tags?: MonitorTags) {
  const ts = new Date().toISOString();
  const tagStr = tags ? Object.entries(tags).map(([k, v]) => `${k}=${v}`).join(",") : "";
  console[level](`[MONITOR:${level.toUpperCase()}] ${ts} | ${message}${tagStr ? " | " + tagStr : ""}`);
}

// ─── Metric recording ───
export function recordMetric(name: string, value: number, tags?: MonitorTags): void {
  log("info", `metric.${name}=${value}`, tags);
}

export function incrementCounter(name: string, tags?: MonitorTags): void {
  log("info", `counter.${name}+=1`, tags);
}

// ─── Event tracking ───
export function trackEvent(title: string, text: string, tags?: MonitorTags): void {
  log("info", `event.${title}: ${text}`, tags);
}

// ─── Error tracking ───
export function trackError(error: Error, tags?: MonitorTags): void {
  log("error", `error: ${error.message}`, { ...tags, stack: error.stack?.slice(0, 500) ?? "no-stack" });
}

// ─── Distributed tracing stub ───
export function startSpan(name: string, tags?: MonitorTags): SpanContext {
  log("info", `span.start ${name}`, tags);
  return { name, startTime: performance.now(), tags };
}

export function finishSpan(span: SpanContext): void {
  const duration = performance.now() - span.startTime;
  log("info", `span.finish ${span.name} | ${duration.toFixed(2)}ms`, span.tags);
}

// ─── Request monitoring helper ───
export function monitorRequest(
  req: Request,
  handler: () => Promise<Response> | Response
): Promise<Response> | Response {
  const span = startSpan("http.request", {
    method: req.method,
    path: new URL(req.url).pathname,
  });

  try {
    const result = handler();
    if (result instanceof Promise) {
      return result.finally(() => finishSpan(span));
    }
    finishSpan(span);
    return result;
  } catch (err) {
    finishSpan(span);
    trackError(err instanceof Error ? err : new Error(String(err)), {
      method: req.method,
      path: new URL(req.url).pathname,
    });
    throw err;
  }
}

// ─── Health check ───
export function getMonitorStatus(): { status: string; timestamp: string } {
  return { status: "ok", timestamp: new Date().toISOString() };
}
