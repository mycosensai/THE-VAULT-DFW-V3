import { drizzle } from "drizzle-orm/d1";
import * as schema from "@db/schema";

let dbInstance: any = null;

export function setDb(d1: any) {
  dbInstance = drizzle(d1, { schema });
}

export function getDb() {
  if (!dbInstance) {
    throw new Error("Database not initialized. Call setDb() first.");
  }
  return dbInstance;
}