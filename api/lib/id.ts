/**
 * Shared ID generator for all API routers
 * Replaces duplicate genId functions across 15+ files
 */
export function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}
