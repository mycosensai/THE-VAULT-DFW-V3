// Enhanced security middleware
<<<<<<< Updated upstream
import type { Context, Next } from 'hono';

export async function securityMiddleware(c: Context, next: Next) {
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

=======
import { Context, Next } from 'hono';

export async function securityMiddleware(c: Context, next: Next) {
  // Rate limiting, CSP, headers etc.
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
>>>>>>> Stashed changes
  await next();
}

export function sanitizeInput(input: any) {
<<<<<<< Updated upstream
  return input;
}
=======
  // Implement sanitization
  return input;
}
>>>>>>> Stashed changes
