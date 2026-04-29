/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  DAILY 9PM REPORT                                               ║
 * ║  Complete digest of everything done during the day              ║
 * ║  • Sales, commissions, payouts                                  ║
 * ║  • Agent activity and tasks performed                           ║
 * ║  • Outreach campaigns and responses                             ║
 * ║  • Audit findings and auto-fixes                                ║
 * ║  • Security checks and hardening                                ║
 * ║  • User actions (sell, appraise, verify, tokenize)              ║
 * ║  • Alerts requiring admin attention                             ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { z } from "zod";
import { eq, desc, gte, sql } from "drizzle-orm";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  dailyReports,
  accountingEntries,
  agentLogs,
  agentCycles,
  outreachCampaigns,
  outreachLogs,
  auditLogs,
  securityHardening,
  listings,
  appraisals,
  orders,
  saleTransactions,
  agentFeedback,
  interAgentChecks,
  partnershipOutreach,
  internetResearch,
} from "@db/schema";
import { openaiChat } from "./lib/openai";
import { genId } from "./lib/id";


// ─── GENERATE DAILY REPORT ───
async function generateDailyReport(db: ReturnType<typeof getDb>, date: Date): Promise<{
  reportId: string;
  fullReport: string;
  summary: Record<string, any>;
}> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const dateStr = date.toISOString().split("T")[0];

  // Gather all daily data
  const [
    accountingEntriesToday,
    agentLogsToday,
    cyclesToday,
    campaignsToday,
    outreachToday,
    auditToday,
    securityToday,
    listingsToday,
    appraisalsToday,
    salesToday,
    feedbackToday,
    policeChecks,
    partnershipsToday,
    researchToday,
  ] = await Promise.all([
    db.select().from(accountingEntries).where(gte(accountingEntries.createdAt, startOfDay)),
    db.select().from(agentLogs).where(gte(agentLogs.timestamp, startOfDay)),
    db.select().from(agentCycles).where(gte(agentCycles.createdAt, startOfDay)),
    db.select().from(outreachCampaigns).where(gte(outreachCampaigns.createdAt, startOfDay)),
    db.select().from(outreachLogs).where(gte(outreachLogs.createdAt, startOfDay)),
    db.select().from(auditLogs).where(gte(auditLogs.checkedAt, startOfDay)),
    db.select().from(securityHardening).where(gte(securityHardening.checkedAt, startOfDay)),
    db.select().from(listings).where(gte(listings.createdAt, startOfDay)),
    db.select().from(appraisals).where(gte(appraisals.createdAt, startOfDay)),
    db.select().from(saleTransactions).where(gte(saleTransactions.createdAt, startOfDay)),
    db.select().from(agentFeedback).where(gte(agentFeedback.createdAt, startOfDay)),
    db.select().from(interAgentChecks).where(gte(interAgentChecks.reviewedAt, startOfDay)),
    db.select().from(partnershipOutreach).where(gte(partnershipOutreach.createdAt, startOfDay)),
    db.select().from(internetResearch).where(gte(internetResearch.foundAt, startOfDay)),
  ]);

  // Calculate totals
  const revenue = accountingEntriesToday
    .filter((e) => (e.amountCents || 0) > 0)
    .reduce((s, e) => s + (e.amountCents || 0), 0) / 100;

  const costs = accountingEntriesToday
    .filter((e) => (e.amountCents || 0) < 0)
    .reduce((s, e) => s + Math.abs(e.amountCents || 0), 0) / 100;

  const summary = {
    date: dateStr,
    financial: {
      revenue,
      costs,
      net: revenue - costs,
      transactions: accountingEntriesToday.length,
    },
    sales: {
      newListings: listingsToday.length,
      newAppraisals: appraisalsToday.length,
      completedSales: salesToday.length,
      totalSaleValue: salesToday.reduce((s, t) => s + (t.salePrice || 0), 0),
    },
    agents: {
      tasksCompleted: cyclesToday.filter((c) => c.status === "complete").length,
      tasksFailed: cyclesToday.filter((c) => c.status === "failed").length,
      logEntries: agentLogsToday.length,
      feedbackEntries: feedbackToday.length,
    },
    outreach: {
      campaignsLaunched: campaignsToday.length,
      messagesSent: outreachToday.length,
      avgConfidence: outreachToday.length > 0
        ? Math.round(outreachToday.reduce((s, o) => s + (o.confidence || 0), 0) / outreachToday.length)
        : 0,
      partnerships: partnershipsToday.length,
    },
    audit: {
      checksRun: auditToday.length,
      autoFixed: auditToday.filter((a) => a.autoFixed).length,
      criticalIssues: auditToday.filter((a) => a.severity === "critical" && !a.autoFixed).length,
      hardeningDiscovered: securityToday.length,
    },
    police: {
      checksRun: policeChecks.length,
      violationsFound: policeChecks.filter((c) => c.verdict === "fail").length,
    },
    research: {
      findings: researchToday.length,
      buyingSignals: researchToday.filter((r) => r.isBuyingSignal).length,
    },
    alerts: [
      ...(auditToday.filter((a) => a.severity === "critical" && !a.autoFixed).map((a) => `CRITICAL: ${a.finding}`)),
      ...(policeChecks.filter((c) => c.verdict === "fail").map((c) => `POLICE: ${c.targetAgent} failed ${c.checkType} check`)),
    ],
  };

  // Generate human-readable report via AI
  const prompt = `Generate a concise executive daily report for "The Vault" luxury marketplace for ${dateStr}.

DATA:
${JSON.stringify(summary, null, 2)}

FORMAT: Professional markdown with clear sections. Include:
1. Executive Summary (3-4 sentences)
2. Financial Snapshot
3. Sales & Appraisals
4. Agent Activity
5. Outreach & Partnerships
6. Audit & Security
7. Items Requiring Attention (alerts)
8. Tomorrow's Outlook

Tone: Professional, direct, data-driven. Use bullet points. Keep under 500 words.`;

  let fullReport = "";
  try {
    const response = await openaiChat({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a concise business analyst writing daily executive reports." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    });
    fullReport = response.choices[0]?.message?.content ?? "Report generation failed.";
  } catch {
    // Fallback to data-only report
    fullReport = `# Daily Report — ${dateStr}\n\n## Financial\n- Revenue: $${revenue.toFixed(2)}\n- Costs: $${costs.toFixed(2)}\n- Net: $${(revenue - costs).toFixed(2)}\n\n## Activity\n- Listings: ${listingsToday.length}\n- Appraisals: ${appraisalsToday.length}\n- Sales: ${salesToday.length}\n- Agent tasks: ${cyclesToday.length}\n- Outreach: ${outreachToday.length}`;
  }

  const reportId = genId("dr");

  // Store report
  await db.insert(dailyReports).values({
    reportId,
    reportDate: dateStr,
    status: "generated",
    salesSummary: JSON.stringify(summary.sales),
    agentActivity: JSON.stringify(summary.agents),
    outreachSummary: JSON.stringify(summary.outreach),
    auditFindings: JSON.stringify(summary.audit),
    accountingSummary: JSON.stringify(summary.financial),
    securityChecks: JSON.stringify(summary.audit.hardeningDiscovered),
    userActions: JSON.stringify({ listings: listingsToday.length, appraisals: appraisalsToday.length }),
    alerts: JSON.stringify(summary.alerts),
    fullReport,
  });

  return { reportId, fullReport, summary };
}

// ─── TRPC ROUTER ───
export const dailyReportRouter = createRouter({
  // ── GENERATE TODAY'S REPORT ──
  generate: adminQuery.mutation(async () => {
    const db = getDb();
    const result = await generateDailyReport(db, new Date());
    return { success: true, reportId: result.reportId, summary: result.summary };
  }),

  // ── GET LATEST REPORT ──
  latest: adminQuery.query(async () => {
    const db = getDb();
    const [report] = await db.select().from(dailyReports)
      .orderBy(desc(dailyReports.createdAt))
      .limit(1);
    return report ?? null;
  }),

  // ── GET REPORT BY DATE ──
  byDate: adminQuery
    .input(z.object({ date: z.string() })) // YYYY-MM-DD
    .query(async ({ input }) => {
      const db = getDb();
      const [report] = await db.select().from(dailyReports)
        .where(eq(dailyReports.reportDate, input.date))
        .orderBy(desc(dailyReports.createdAt))
        .limit(1);
      return report ?? null;
    }),

  // ── LIST REPORTS ──
  list: adminQuery
    .input(z.object({ limit: z.number().default(30) }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      return db.select().from(dailyReports)
        .orderBy(desc(dailyReports.createdAt))
        .limit(input?.limit ?? 30);
    }),

  // ── MARK AS READ ──
  markRead: adminQuery
    .input(z.object({ reportId: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(dailyReports)
        .set({ status: "read", readAt: new Date() })
        .where(eq(dailyReports.reportId, input.reportId));
      return { success: true };
    }),

  // ── GET REPORT STATS ──
  stats: adminQuery.query(async () => {
    const db = getDb();
    const reports = await db.select().from(dailyReports);
    const totalRevenue = reports.reduce((s, r) => {
      try { const a = JSON.parse(r.accountingSummary || "{}"); return s + (a.revenue || 0); } catch { return s; }
    }, 0);

    return {
      totalReports: reports.length,
      totalRevenue,
      avgDailyRevenue: reports.length > 0 ? totalRevenue / reports.length : 0,
      lastReportDate: reports[0]?.reportDate ?? null,
      unreadReports: reports.filter((r) => r.status === "generated").length,
    };
  }),
});
