import { drizzle } from "drizzle-orm/d1";
import * as schema from "@db/schema";

let dbInstance: any = null;

export function setDb(d1: any) {
  dbInstance = drizzle(d1, { schema });
}

export function getDb() {
  if (!dbInstance) {
    // Return a mock DB for graceful degradation when D1 is not configured
    console.warn("WARNING: D1 database not initialized. Some features may not work.");
    return null;
  }
  return dbInstance;
}
