/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  AUTONOMOUS ACCOUNTING / AUTO-BOOKS                             ║
 * ║  Every financial transaction is automatically logged            ║
 * ║  Every agent action is tracked and costed                       ║
 * ║  Complete audit trail for daily 9PM report                     ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { z } from "zod";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { genId } from "./lib/id";
import {
  accountingEntries,
  saleTransactions,
  sellerPayouts,
  orders,
  listings,
  listingFees,
  appraisals,
  agentLogs,
  agentCycles,
} from "@db/schema";

// ─── LOG A FINANCIAL ENTRY ───
export async function logFinancialEntry(
  db: ReturnType<typeof getDb>,
  entry: Omit<typeof accountingEntries.$inferInsert, "id" | "entryId" | "createdAt">
): Promise<void> {
  try {
    await db.insert(accountingEntries).values({
      ...entry,
      entryId: genId("acct"),
    });
  } catch {
    // Silent fail — accounting must never block main flow
  }
}

// ─── RECONCILE SALES ───
async function reconcileSales(db: ReturnType<typeof getDb>): Promise<number> {
  const sales = await db.select().from(saleTransactions);
  let logged = 0;

  for (const sale of sales) {
    // Check if already logged
    const existing = await db.select().from(accountingEntries)
      .where(sql`${accountingEntries.sourceId} = ${String(sale.id)} AND ${accountingEntries.entryType} = 'sale'`)
      .limit(1);

    if (existing.length === 0) {
      await logFinancialEntry(db, {
        entryType: "sale",
        source: "system",
        sourceId: String(sale.id),
        description: `Sale of ${sale.itemName || "item"}`,
        amountCents: Math.round((sale.salePrice || 0) * 100),
        currency: "USD",
        metadata: JSON.stringify({ buyer: sale.buyerEmail, seller: sale.sellerEmail, platform: sale.platform }),
        itemName: sale.itemName || undefined,
        performedBy: "system",
      });
      logged++;
    }
  }

  return logged;
}

// ─── RECONCILE AGENT COSTS ───
async function logAgentCosts(db: ReturnType<typeof getDb>): Promise<number> {
  const recentLogs = await db.select().from(agentLogs)
    .orderBy(desc(agentLogs.timestamp))
    .limit(100);

  let logged = 0;
  for (const log of recentLogs) {
    const existing = await db.select().from(accountingEntries)
      .where(sql`${accountingEntries.sourceId} = ${String(log.id)} AND ${accountingEntries.entryType} = 'agent_cost'`)
      .limit(1);

    if (existing.length === 0) {
      // Estimate cost: ~$0.01 per log entry for API calls
      await logFinancialEntry(db, {
        entryType: "agent_cost",
        source: "agent",
        sourceId: String(log.id),
        description: `Agent activity: ${log.event}`,
        amountCents: -1, // Cost
        currency: "USD",
        metadata: JSON.stringify({ event: log.event, projectId: log.projectId }),
        agentName: log.projectId || undefined,
        performedBy: log.projectId || "system",
      });
      logged++;
    }
  }

  return logged;
}

// ─── TRPC ROUTER ───
export const accountingRouter = createRouter({
  // ── GET FULL LEDGER ──
  getLedger: adminQuery
    .input(z.object({
      entryType: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().default(100),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const limit = input?.limit ?? 100;

      if (input?.entryType) {
        return db.select().from(accountingEntries)
          .where(eq(accountingEntries.entryType, input.entryType as any))
          .orderBy(desc(accountingEntries.createdAt))
          .limit(limit);
      }
      return db.select().from(accountingEntries)
        .orderBy(desc(accountingEntries.createdAt))
        .limit(limit);
    }),

  // ── GET DASHBOARD SUMMARY ──
  summary: adminQuery.query(async () => {
    const db = getDb();
    const entries = await db.select().from(accountingEntries);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayEntries = entries.filter((e) => e.createdAt && new Date(e.createdAt) >= today);

    const totalRevenue = entries
      .filter((e) => (e.amountCents || 0) > 0)
      .reduce((s, e) => s + (e.amountCents || 0), 0);

    const totalCosts = entries
      .filter((e) => (e.amountCents || 0) < 0)
      .reduce((s, e) => s + Math.abs(e.amountCents || 0), 0);

    const todayRevenue = todayEntries
      .filter((e) => (e.amountCents || 0) > 0)
      .reduce((s, e) => s + (e.amountCents || 0), 0);

    return {
      totalTransactions: entries.length,
      totalRevenue: totalRevenue / 100,
      totalCosts: totalCosts / 100,
      netIncome: (totalRevenue - totalCosts) / 100,
      todayTransactions: todayEntries.length,
      todayRevenue: todayRevenue / 100,
      byType: {
        sales: entries.filter((e) => e.entryType === "sale").length,
        commissions: entries.filter((e) => e.entryType === "commission").length,
        payouts: entries.filter((e) => e.entryType === "payout").length,
        listingFees: entries.filter((e) => e.entryType === "listing_fee").length,
        agentCosts: entries.filter((e) => e.entryType === "agent_cost").length,
        refunds: entries.filter((e) => e.entryType === "refund").length,
      },
      recentActivity: entries.slice(0, 10).map((e) => ({
        type: e.entryType,
        description: e.description,
        amount: (e.amountCents || 0) / 100,
        date: e.createdAt,
      })),
    };
  }),

  // ── RECONCILE (auto-match transactions) ──
  reconcile: adminQuery.mutation(async () => {
    const db = getDb();
    const salesLogged = await reconcileSales(db);
    const agentCostsLogged = await logAgentCosts(db);

    return {
      success: true,
      salesLogged,
      agentCostsLogged,
      totalNew: salesLogged + agentCostsLogged,
    };
  }),

  // ── ADD MANUAL ENTRY ──
  addEntry: adminQuery
    .input(z.object({
      entryType: z.enum(["sale", "commission", "payout", "listing_fee", "refund", "other"]),
      description: z.string().min(1).max(500),
      amountCents: z.number(),
      itemName: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await logFinancialEntry(db, {
        entryType: input.entryType,
        source: "manual",
        description: input.description,
        amountCents: input.amountCents,
        itemName: input.itemName,
        performedBy: "admin",
        notes: input.notes,
      });
      return { success: true };
    }),
});
