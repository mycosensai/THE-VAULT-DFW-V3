import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { categories } from "@db/schema";
import { desc } from "drizzle-orm";

export const categoriesRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(categories).orderBy(desc(categories.listingCount));
  }),
});
