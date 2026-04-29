import { z } from "zod";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users, listings, appraisals, stripeSessions, aiAgentLogs } from "@db/schema";
import { desc, sql, eq } from "drizzle-orm";
import { logAudit, getClientIP } from "./security";

export const adminRouter = createRouter({
  stats: adminQuery.query(async () => {
    const db = getDb();

    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [listingCount] = await db.select({ count: sql<number>`count(*)` }).from(listings);
    const [appraisalCount] = await db.select({ count: sql<number>`count(*)` }).from(appraisals);
    const [transactionCount] = await db.select({ count: sql<number>`count(*)` }).from(stripeSessions);
    const [agentCount] = await db.select({ count: sql<number>`count(*)` }).from(aiAgentLogs);

    const recentListings = await db
      .select()
      .from(listings)
      .orderBy(desc(listings.createdAt))
      .limit(10);

    const recentAppraisals = await db
      .select()
      .from(appraisals)
      .orderBy(desc(appraisals.createdAt))
      .limit(10);

    const revenue = await db
      .select({ total: sql<number>`sum(${stripeSessions.amount})` })
      .from(stripeSessions)
      .where(eq(stripeSessions.status, "completed"));

    return {
      counts: {
        users: userCount.count,
        listings: listingCount.count,
        appraisals: appraisalCount.count,
        transactions: transactionCount.count,
        agentRuns: agentCount.count,
      },
      revenue: revenue[0]?.total || 0,
      recentListings,
      recentAppraisals,
    };
  }),

  listUsers: adminQuery
    .input(z.object({ limit: z.number().min(1).max(500).default(100), offset: z.number().min(0).default(0) }).optional())
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const limit = input?.limit || 100;
      const offset = input?.offset || 0;
      logAudit({
        ip: getClientIP(ctx.req),
        method: "GET",
        path: "admin.listUsers",
        userId: ctx.user?.id,
        action: "admin_data_access",
        details: `limit:${limit} offset:${offset}`,
      });
      return db.select().from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset);
    }),

  listListings: adminQuery
    .input(z.object({ limit: z.number().min(1).max(500).default(100), offset: z.number().min(0).default(0) }).optional())
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const limit = input?.limit || 100;
      const offset = input?.offset || 0;
      logAudit({
        ip: getClientIP(ctx.req),
        method: "GET",
        path: "admin.listListings",
        userId: ctx.user?.id,
        action: "admin_data_access",
      });
      return db.select().from(listings).orderBy(desc(listings.createdAt)).limit(limit).offset(offset);
    }),

  listTransactions: adminQuery
    .input(z.object({ limit: z.number().min(1).max(500).default(100), offset: z.number().min(0).default(0) }).optional())
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const limit = input?.limit || 100;
      const offset = input?.offset || 0;
      logAudit({
        ip: getClientIP(ctx.req),
        method: "GET",
        path: "admin.listTransactions",
        userId: ctx.user?.id,
        action: "admin_data_access",
      });
      return db.select().from(stripeSessions).orderBy(desc(stripeSessions.createdAt)).limit(limit).offset(offset);
    }),

  updateListingStatus: adminQuery
    .input(z.object({ id: z.number(), status: z.enum(["active", "sold", "pending", "withdrawn"]) }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.update(listings).set({ status: input.status }).where(eq(listings.id, input.id));
      logAudit({
        ip: getClientIP(ctx.req),
        method: "POST",
        path: "admin.updateListingStatus",
        userId: ctx.user?.id,
        action: "admin_listing_updated",
        details: `listing:${input.id} status:${input.status}`,
      });
      return { success: true };
    }),
});
