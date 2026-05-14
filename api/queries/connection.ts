import { drizzle } from "drizzle-orm/d1";
import * as schema from "@db/schema";

let dbInstance: any = null;
let stubDb: any = null;

function createStubDb() {
  if (stubDb) return stubDb;

  const noOp = () => Promise.resolve([]);

  const chain = {
    from: () => chain,
    where: () => chain,
    limit: () => chain,
    offset: () => chain,
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
    query: {
      run: noOp,
      all: noOp,
      get: () => Promise.resolve(null),
    },
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
    const isProduction =
      typeof globalThis !== "undefined" &&
      (globalThis as any)?.process?.env?.NODE_ENV === "production";

    if (isProduction) {
      throw new Error("D1 database not initialized in production");
    }

    console.warn(
      "WARNING: D1 database not initialized. Using stub DB for development only.",
    );

    return createStubDb();
  }

  return dbInstance;
}
