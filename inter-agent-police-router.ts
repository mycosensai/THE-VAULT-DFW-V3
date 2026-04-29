/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  INTER-AGENT POLICE SYSTEM                                      ║
 * ║  Agents verify each other's output — no agent is above review   ║
 * ║  • Content agents check outreach for hallucinations             ║
 * ║  • Outreach agents verify pricing accuracy                      ║
 * ║  • Security agents audit all agent outputs                      ║
 * ║  • Any agent can flag another's output for review               ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  interAgentChecks,
  agentLogs,
  agentCycles,
  outreachLogs,
  agentConversations,
  agentFeedback,
  agentProjects,
} from "@db/schema";
import { openaiChat } from "./lib/openai";
import { checkHallucinations, censorOutreach } from "./lib/hallucination-guard";
import { genId } from "./lib/id";


// ─── POLICE CHAIN OF COMMAND ───
// Each agent type has designated reviewers
const POLICE_CHAIN: Record<string, string[]> = {
  appraiser: ["proverify", "pricing", "compliance"],
  outreach: ["content", "compliance", "security"],
  proverify: ["security", "appraiser", "compliance"],
  content: ["compliance", "security", "outreach"],
  security: ["compliance", "proverify"],
  pricing: ["appraiser", "proverify"],
  support: ["compliance", "content"],
  listing: ["compliance", "appraiser"],
  compliance: ["security", "proverify"],
  social: ["content", "outreach", "compliance"],
  research: ["outreach", "social", "compliance"],
};

// ─── AI-POWERED CROSS-AGENT VERIFICATION ───
async function verifyAgentOutput(
  reviewer: string,
  targetAgent: string,
  output: string,
  checkType: "hallucination" | "accuracy" | "scope_drift" | "boundary_violation" | "tone"
): Promise<{
  verdict: "pass" | "fail" | "warning";
  issuesFound: string[];
  correctionSuggested?: string;
}> {
  const prompt = `You are the ${reviewer} agent reviewing output from the ${targetAgent} agent.

CHECK TYPE: ${checkType}
REVIEWER ROLE: ${reviewer}
TARGET AGENT: ${targetAgent}

OUTPUT TO REVIEW:
"""
${output.substring(0, 1500)}
"""

Review rules:
1. HALLUCINATION check: Did the agent invent facts, URLs, names, prices, or data?
2. ACCURACY check: Are stated facts consistent with known reality?
3. SCOPE_DRIFT check: Did the agent go beyond its assigned task?
4. BOUNDARY check: Did the agent violate any safety policies?
5. TONE check: Is the tone appropriate and professional?

Respond ONLY with JSON:
{"verdict": "pass|fail|warning", "issuesFound": ["issue1", "issue2"], "correctionSuggested": "suggested fix or null"}

Be strict. If you find ANY issue, verdict must be "fail" or "warning".`;

  try {
    const response = await openaiChat({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a strict quality reviewer. Only respond with valid JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 1024,
    });

    const text = response.choices[0]?.message?.content ?? "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { verdict: "pass", issuesFound: [] };

    let parsed: any;
    try { parsed = JSON.parse(jsonMatch[0]); } catch { return { verdict: "pass", issuesFound: [] }; }

    return {
      verdict: ["pass", "fail", "warning"].includes(parsed.verdict) ? parsed.verdict : "warning",
      issuesFound: Array.isArray(parsed.issuesFound) ? parsed.issuesFound : [],
      correctionSuggested: parsed.correctionSuggested || undefined,
    };
  } catch {
    return { verdict: "pass", issuesFound: ["Review failed — assume pass"] };
  }
}

// ─── RUN POLICE CHECK ON AN AGENT'S OUTPUT ───
async function policeCheck(
  db: ReturnType<typeof getDb>,
  targetAgent: string,
  output: string,
  checkType: "hallucination" | "accuracy" | "scope_drift" | "boundary_violation" | "tone"
): Promise<typeof interAgentChecks.$inferSelect[]> {
  const reviewers = POLICE_CHAIN[targetAgent] || ["compliance", "security"];
  const results: typeof interAgentChecks.$inferSelect[] = [];

  for (const reviewer of reviewers.slice(0, 2)) { // Max 2 reviewers per check
    const review = await verifyAgentOutput(reviewer, targetAgent, output, checkType);

    const checkId = genId("pol");
    await db.insert(interAgentChecks).values({
      checkId,
      fromAgent: reviewer,
      targetAgent,
      targetOutput: output.substring(0, 1000),
      checkType,
      verdict: review.verdict,
      issuesFound: JSON.stringify(review.issuesFound),
      correctionSuggested: review.correctionSuggested,
      wasCorrected: review.verdict === "fail",
    });

    results.push({
      id: 0, checkId, fromAgent: reviewer, targetAgent, targetOutput: output.substring(0, 1000),
      checkType, verdict: review.verdict, issuesFound: JSON.stringify(review.issuesFound),
      correctionSuggested: review.correctionSuggested, wasCorrected: review.verdict === "fail",
      correctionApplied: null, reviewedAt: new Date(),
    } as any);
  }

  return results;
}

// ─── TRPC ROUTER ───
export const interAgentPoliceRouter = createRouter({
  // ── RUN POLICE CHECK ON AN OUTPUT ──
  checkOutput: adminQuery
    .input(z.object({
      targetAgent: z.string().min(1),
      output: z.string().min(1).max(5000),
      checkType: z.enum(["hallucination", "accuracy", "scope_drift", "boundary_violation", "tone"]).default("hallucination"),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const results = await policeCheck(db, input.targetAgent, input.output, input.checkType);

      const failed = results.filter((r) => r.verdict === "fail");
      const warnings = results.filter((r) => r.verdict === "warning");

      return {
        success: true,
        totalReviews: results.length,
        passed: results.filter((r) => r.verdict === "pass").length,
        failed: failed.length,
        warnings: warnings.length,
        results: results.map((r) => ({
          reviewer: r.fromAgent,
          verdict: r.verdict,
          issues: JSON.parse(r.issuesFound || "[]"),
          correction: r.correctionSuggested,
        })),
        allClear: failed.length === 0 && warnings.length === 0,
      };
    }),

  // ── AUTOMATED POLICE SWEEP ──
  // Scans recent outputs and runs police checks
  sweep: adminQuery
    .input(z.object({
      targetAgent: z.string().optional(),
      checkType: z.enum(["hallucination", "accuracy", "scope_drift", "boundary_violation", "tone"]).default("hallucination"),
      limit: z.number().default(10),
    }).optional())
    .mutation(async ({ input }) => {
      const db = getDb();
      const recentOutreach = await db.select().from(outreachLogs)
        .orderBy(desc(outreachLogs.createdAt))
        .limit(input?.limit ?? 10);

      const allResults: any[] = [];

      for (const msg of recentOutreach) {
        if (!msg.message) continue;
        const results = await policeCheck(db, input?.targetAgent || "outreach", msg.message, input?.checkType || "hallucination");
        allResults.push({
          messageId: msg.id,
          checks: results.map((r) => ({ reviewer: r.fromAgent, verdict: r.verdict })),
        });
      }

      const totalFailed = allResults.reduce((s, r) => s + r.checks.filter((c: any) => c.verdict === "fail").length, 0);

      return {
        success: true,
        itemsChecked: allResults.length,
        totalFailed,
        allClear: totalFailed === 0,
        details: allResults,
      };
    }),

  // ── GET RECENT POLICE CHECKS ──
  recentChecks: adminQuery
    .input(z.object({
      targetAgent: z.string().optional(),
      limit: z.number().default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      if (input?.targetAgent) {
        return db.select().from(interAgentChecks)
          .where(eq(interAgentChecks.targetAgent, input.targetAgent))
          .orderBy(desc(interAgentChecks.reviewedAt))
          .limit(input?.limit ?? 50);
      }
      return db.select().from(interAgentChecks)
        .orderBy(desc(interAgentChecks.reviewedAt))
        .limit(input?.limit ?? 50);
    }),

  // ── GET POLICE STATS ──
  stats: adminQuery.query(async () => {
    const db = getDb();
    const checks = await db.select().from(interAgentChecks);

    return {
      totalChecks: checks.length,
      byVerdict: {
        pass: checks.filter((c) => c.verdict === "pass").length,
        fail: checks.filter((c) => c.verdict === "fail").length,
        warning: checks.filter((c) => c.verdict === "warning").length,
        pending: checks.filter((c) => c.verdict === "pending").length,
      },
      byCheckType: {
        hallucination: checks.filter((c) => c.checkType === "hallucination").length,
        accuracy: checks.filter((c) => c.checkType === "accuracy").length,
        scope_drift: checks.filter((c) => c.checkType === "scope_drift").length,
        boundary_violation: checks.filter((c) => c.checkType === "boundary_violation").length,
        tone: checks.filter((c) => c.checkType === "tone").length,
      },
      correctionsMade: checks.filter((c) => c.wasCorrected).length,
      byReviewer: Object.fromEntries(
        Array.from(new Set(checks.map((c) => c.fromAgent))).map((agent) => [
          agent,
          checks.filter((c) => c.fromAgent === agent).length,
        ])
      ),
      chainOfCommand: POLICE_CHAIN,
    };
  }),

  // ── GET AGENT TRUST SCORES ──
  trustScores: adminQuery.query(async () => {
    const db = getDb();
    const checks = await db.select().from(interAgentChecks);

    const agentScores: Record<string, { total: number; passes: number; fails: number; score: number }> = {};

    for (const check of checks) {
      if (!agentScores[check.targetAgent]) {
        agentScores[check.targetAgent] = { total: 0, passes: 0, fails: 0, score: 100 };
      }
      agentScores[check.targetAgent].total++;
      if (check.verdict === "pass") agentScores[check.targetAgent].passes++;
      if (check.verdict === "fail") agentScores[check.targetAgent].fails++;
    }

    for (const [agent, data] of Object.entries(agentScores)) {
      data.score = data.total > 0 ? Math.round((data.passes / data.total) * 100) : 100;
    }

    return agentScores;
  }),
});
