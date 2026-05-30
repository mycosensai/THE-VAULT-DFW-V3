// Enhanced security middleware
import type { Context, Next } from 'hono';

export async function securityMiddleware(c: Context, next: Next) {
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  await next();
}

export function sanitizeInput(input: any) {
  return input;
}