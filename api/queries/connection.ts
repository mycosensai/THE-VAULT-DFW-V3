import { drizzle } from "drizzle-orm/d1";
import * as schema from "@db/schema";

let dbInstance: any = null;
let stubDb: any = null;

function createStubDb() {
  // Return a stub DB that has all the methods but returns empty results
  // This prevents crashes when D1 is not configured
  if (stubDb) return stubDb;

  const noOp = () => Promise.resolve([]);
  const chain = {
    from: () => chain,
    where: () => chain,
    limit: () => chain,
    orderBy: () => chain,
    groupBy: () => chain,
    having: () => chain,
    innerJoin: () => chain,
    leftJoin: () => chain,
    rightJoin: () => chain,
    fullJoin: () => chain,
    on: () => chain,
    values: () => chain,
    returning: () => chain,
    set: () => chain,
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    delete: () => chain,
    query: { run: noOp, all: noOp, get: () => Promise.resolve(null) },
    run: noOp,
    all: noOp,
    get: () => Promise.resolve(null),
    then: (cb: any) => Promise.resolve([]).then(cb),
  };
  stubDb = chain;
  return stubDb;
}

export function setDb(d1: any) {
  dbInstance = drizzle(d1, { schema });
}

export function getDb() {
  if (!dbInstance) {
    console.warn("WARNING: D1 database not initialized. Using stub DB. Some features will return empty results.");
    return createStubDb();
  }
  return dbInstance;
}
