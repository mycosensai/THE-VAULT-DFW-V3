import { drizzle } from "drizzle-orm/d1";
import * as schema from "@db/schema";

let dbInstance: any = null;
let stubDb: any = null;

function createStubDb() {
<<<<<<< Updated upstream
  if (stubDb) return stubDb;

  const noOp = () => Promise.resolve([]);

=======
  // Return a stub DB that has all the methods but returns empty results
  // This prevents crashes when D1 is not configured
  if (stubDb) return stubDb;

  const noOp = () => Promise.resolve([]);
>>>>>>> Stashed changes
  const chain = {
    from: () => chain,
    where: () => chain,
    limit: () => chain,
<<<<<<< Updated upstream
    offset: () => chain,
=======
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
    query: {
      run: noOp,
      all: noOp,
      get: () => Promise.resolve(null),
    },
=======
    query: { run: noOp, all: noOp, get: () => Promise.resolve(null) },
>>>>>>> Stashed changes
    run: noOp,
    all: noOp,
    get: () => Promise.resolve(null),
    then: (cb: any) => Promise.resolve([]).then(cb),
  };
<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
  stubDb = chain;
  return stubDb;
}

export function setDb(d1: any) {
  dbInstance = drizzle(d1, { schema });
}

export function getDb() {
  if (!dbInstance) {
<<<<<<< Updated upstream
    const isProduction =
      typeof globalThis !== "undefined" &&
      (globalThis as any)?.process?.env?.NODE_ENV === "production";

    if (isProduction) {
      throw new Error("D1 database not initialized in production");
    }

    console.warn(
      "WARNING: D1 database not initialized. Using stub DB for development only.",
    );

=======
    console.warn("WARNING: D1 database not initialized. Using stub DB. Some features will return empty results.");
>>>>>>> Stashed changes
    return createStubDb();
  }

  return dbInstance;
}
