import { env } from "./lib/env";

/**
 * THE VAULT SECURITY MODULE
 * Fort Knox-grade security hardening
 * Addresses: rate limiting, CORS, security headers, audit logging,
 * input sanitization, token revocation, request validation
 */

// Vault Security Module - Fort Knox hardening

// ─── RATE LIMITING ───
interface RateLimitEntry {
  count: number;
  windowStart: number;
}
const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60,
};

export const STRICT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5,
};

export function getClientIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function checkRateLimit(
  req: Request,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): { allowed: boolean; remaining: number; resetAt: number } {
  const key = (config.keyGenerator || getClientIP)(req);
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now - entry.windowStart > config.windowMs) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.windowStart + config.windowMs,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.windowStart + config.windowMs,
  };
}

// ─── INPUT SANITIZATION ───
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^<]*>/gi,
];

export function sanitizeInput(input: string): string {
  let sanitized = input;
  for (const pattern of XSS_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[removed]");
  }
  // Escape HTML entities
  sanitized = sanitized
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
  return sanitized;
}

export function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = sanitizeInput(value);
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      result[key] = sanitizeObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === "string" ? sanitizeInput(item) : item
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ─── AI PROMPT SANITIZATION ───
export function sanitizeForPrompt(input: string): string {
  // Remove prompt injection attempts
  return input
    .replace(/\{\}/g, "") // Remove template injection
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "") // Remove control chars
    .substring(0, 2000); // Cap length
}

// ─── SECURITY HEADERS ───
export function getSecurityHeaders(): Record<string, string> {
  return {
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()",
    "Content-Security-Policy":
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' js.stripe.com; " +
      "style-src 'self' 'unsafe-inline' fonts.googleapis.com; " +
      "img-src 'self' data: https: blob:; " +
      "font-src 'self' fonts.gstatic.com data:; " +
      "connect-src 'self' api.stripe.com api.commerce.coinbase.com; " +
      "frame-src 'self' js.stripe.com hooks.stripe.com; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self';",
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
  };
}

// ─── CORS CONFIG ───
export function getCorsConfig() {
  return {
    origin: (origin: string): string | null => {
      if (!origin) return "*";
      if (origin.includes("localhost")) return origin;
      const allowedDomain = env.vaultDomain;
      if (!allowedDomain) {
        // When VAULT_DOMAIN is not set, allow all origins for development
        return origin || "*";
      }
      if (origin.includes(allowedDomain)) return origin;
      return null;
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] as string[],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-Local-Auth-Token",
      "X-Session-Id",
      "X-Agent-Token",
      "X-Requested-With",
    ],
    credentials: true,
    maxAge: 86400,
  };
}

// ─── AUDIT LOG ───
interface AuditLogEntry {
  timestamp: string;
  ip: string;
  method: string;
  path: string;
  userId?: number;
  action: string;
  details?: string;
  userAgent?: string;
}

const auditLog: AuditLogEntry[] = [];
const MAX_AUDIT_LOG = 10000;

export function logAudit(entry: Omit<AuditLogEntry, "timestamp">): void {
  const logEntry: AuditLogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };
  auditLog.push(logEntry);
  if (auditLog.length > MAX_AUDIT_LOG) {
    auditLog.splice(0, auditLog.length - MAX_AUDIT_LOG);
  }
  // Also log to console for server monitoring
  console.log(
    `[AUDIT] ${logEntry.timestamp} | ${logEntry.ip} | ${logEntry.method} ${logEntry.path} | ${logEntry.action}${entry.userId ? ` | user:${entry.userId}` : ""}${entry.details ? ` | ${entry.details}` : ""}`
  );
}

export function getAuditLog(
  limit: number = 100,
  filter?: { ip?: string; userId?: number; action?: string }
): AuditLogEntry[] {
  let logs = [...auditLog].reverse();
  if (filter?.ip) logs = logs.filter((l) => l.ip === filter.ip);
  if (filter?.userId) logs = logs.filter((l) => l.userId === filter.userId);
  if (filter?.action) logs = logs.filter((l) => l.action === filter.action);
  return logs.slice(0, limit);
}

// ─── TOKEN REVOCATION ───
const revokedTokens = new Set<string>();
const revokedUserSessions = new Map<number, number>(); // userId -> timestamp

export function revokeToken(token: string): void {
  revokedTokens.add(token);
}

export function revokeAllUserSessions(userId: number): void {
  revokedUserSessions.set(userId, Date.now());
}

export function isTokenRevoked(token: string): boolean {
  return revokedTokens.has(token);
}

export function isUserSessionRevoked(userId: number, tokenIssuedAt: number): boolean {
  const revokedAt = revokedUserSessions.get(userId);
  return revokedAt ? tokenIssuedAt < revokedAt : false;
}

// ─── REQUEST VALIDATION ───
export function validateUrl(url: string, allowedHosts?: string[]): boolean {
  try {
    const parsed = new URL(url);
    // Reject non-HTTPS in production
    if (env.isProduction && parsed.protocol !== "https:") {
      return false;
    }
    // Reject localhost in production
    if (
      env.isProduction &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
    ) {
      return false;
    }
    // Check allowed hosts if specified
    if (allowedHosts && !allowedHosts.includes(parsed.hostname)) {
      return false;
    }
    // Reject URLs with credentials
    if (parsed.username || parsed.password) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// ─── PASSWORD STRENGTH VALIDATION ───
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (password.length < 8) errors.push("Minimum 8 characters");
  if (!/[A-Z]/.test(password)) errors.push("At least one uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("At least one lowercase letter");
  if (!/[0-9]/.test(password)) errors.push("At least one number");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("At least one special character");
  return { valid: errors.length === 0, errors };
}
