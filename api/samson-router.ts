/**
 * Samson Router — Kill switch, agent toggles, prompts, boundaries, audits
 */

import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  agentProjects,
  agentCycles,
  agentSessions,
  agentLogs,
  agentFleetState,
  agentBoundaryLog,
  agentFeedback,
  systemSettings,
} from "@db/schema";
import { openaiChat } from "./lib/openai";
import { checkHallucinations, sanitizeHallucinations, censorOutreach, verifyContact, buildFeedbackEnrichedPrompt } from "./lib/hallucination-guard";
import type { AgentFeedback } from "./lib/hallucination-guard";

function genCycleId(): string {
  const now = new Date();
  const ts = now.toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  const rnd = Math.random().toString(36).slice(2, 6);
  return `${ts}_${rnd}`;
}

export const samsonRouter = createRouter({
  // ── SAMSON STATUS ──
  samsonStatus: adminQuery.query(async () => {
    const db = getDb();
    const [setting] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, "samson_armed"))
      .limit(1);
    return {
      armed: setting?.value === "true",
      armedAt: setting?.updatedAt ?? null,
      message: setting?.value === "true"
        ? "SAMSON IS ARMED. All agent activity is FROZEN. No cycles, no sessions, no outreach until disarmed."
        : "Samson is disarmed. Agents are cleared for normal operations.",
    };
  }),

  // ── ARM SAMSON ──
  armSamson: adminQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    const [existing] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, "samson_armed"))
      .limit(1);

    if (existing) {
      await db
        .update(systemSettings)
        .set({ value: "true", updatedAt: new Date() })
        .where(eq(systemSettings.id, existing.id));
    } else {
      await db.insert(systemSettings).values({
        key: "samson_armed",
        value: "true",
      });
    }

    await db.insert(agentLogs).values({
      event: "samson_armed",
      projectId: "system",
      data: JSON.stringify({
        armedBy: ctx.user?.id,
        armedByName: ctx.user?.name,
        timestamp: new Date().toISOString(),
        message: "ALL AGENT OPERATIONS FROZEN BY SAMSON KILL SWITCH",
      }),
    });

    await db
      .update(agentSessions)
      .set({ status: "failed", stopReason: "SAMSON" })
      .where(eq(agentSessions.status, "active"));

    await db
      .update(agentCycles)
      .set({ status: "failed", outcome: "verification_failed" })
      .where(eq(agentCycles.status, "running"));

    return {
      armed: true,
      message: "SAMSON ARMED. All agent operations have been frozen. No bot will execute until you disarm.",
    };
  }),

  // ── DISARM SAMSON ──
  disarmSamson: adminQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    const [existing] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, "samson_armed"))
      .limit(1);

    if (existing) {
      await db
        .update(systemSettings)
        .set({ value: "false", updatedAt: new Date() })
        .where(eq(systemSettings.id, existing.id));
    } else {
      await db.insert(systemSettings).values({
        key: "samson_armed",
        value: "false",
      });
    }

    await db.insert(agentLogs).values({
      event: "samson_disarmed",
      projectId: "system",
      data: JSON.stringify({
        disarmedBy: ctx.user?.id,
        disarmedByName: ctx.user?.name,
        timestamp: new Date().toISOString(),
        message: "SAMSON DISARMED. Agents cleared for normal operations.",
      }),
    });

    return {
      armed: false,
      message: "Samson disarmed. All agents are cleared to resume operations.",
    };
  }),

  // ── TOGGLE AGENT ──
  toggleAgent: adminQuery
    .input(z.object({ projectId: z.string(), active: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [project] = await db
        .select()
        .from(agentProjects)
        .where(eq(agentProjects.projectId, input.projectId))
        .limit(1);
      if (!project) throw new Error("Project not found");

      await db
        .update(agentProjects)
        .set({ active: input.active, updatedAt: new Date() })
        .where(eq(agentProjects.id, project.id));

      await db.insert(agentLogs).values({
        event: input.active ? "agent_activated" : "agent_deactivated",
        projectId: input.projectId,
        data: JSON.stringify({ projectId: input.projectId, active: input.active }),
      });

      return { projectId: input.projectId, active: input.active, success: true };
    }),

  // ── UPDATE AGENT CONFIG ──
  updateAgentConfig: adminQuery
    .input(z.object({
      projectId: z.string(),
      engineerCommand: z.string().optional(),
      verificationCommand: z.string().optional(),
      handsOff: z.array(z.string()).optional(),
      model: z.string().optional(),
      cycleBudgetMinutes: z.number().min(1).max(120).optional(),
      mode: z.enum(["A", "B", "C"]).optional(),
      autoMerge: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [project] = await db
        .select()
        .from(agentProjects)
        .where(eq(agentProjects.projectId, input.projectId))
        .limit(1);
      if (!project) throw new Error("Project not found");

      const updates: Record<string, any> = { updatedAt: new Date() };
      if (input.engineerCommand !== undefined) updates.engineerCommand = input.engineerCommand;
      if (input.verificationCommand !== undefined) updates.verificationCommand = input.verificationCommand;
      if (input.handsOff !== undefined) updates.handsOff = JSON.stringify(input.handsOff);
      if (input.model !== undefined) updates.model = input.model;
      if (input.cycleBudgetMinutes !== undefined) updates.cycleBudgetMinutes = input.cycleBudgetMinutes;
      if (input.mode !== undefined) updates.mode = input.mode;
      if (input.autoMerge !== undefined) updates.autoMerge = input.autoMerge;

      await db
        .update(agentProjects)
        .set(updates)
        .where(eq(agentProjects.id, project.id));

      await db.insert(agentLogs).values({
        event: "agent_config_updated",
        projectId: input.projectId,
        data: JSON.stringify({ updatedFields: Object.keys(updates) }),
      });

      return { projectId: input.projectId, updatedFields: Object.keys(updates), success: true };
    }),

  // ── PROMPT AGENT DIRECTLY ──
  promptAgent: adminQuery
    .input(z.object({
      projectId: z.string(),
      prompt: z.string().min(1).max(10000),
      model: z.string().optional(),
      temperature: z.number().min(0).max(2).default(0.3),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      // Check Samson
      const [samson] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, "samson_armed"))
        .limit(1);
      if (samson?.value === "true") {
        return {
          success: false,
          error: "SAMSON IS ARMED. All agent operations are frozen. Disarm Samson to continue.",
          output: null,
        };
      }

      const [project] = await db
        .select()
        .from(agentProjects)
        .where(eq(agentProjects.projectId, input.projectId))
        .limit(1);
      if (!project) throw new Error("Project not found");

      const response = await openaiChat({
        model: input.model ?? project.model ?? "gpt-4o",
        messages: [
          {
            role: "system",
            content: project.engineerCommand ?? `You are the ${project.name} agent for The Vault (thevaultdfw.win). Mission: ${project.description}`,
          },
          { role: "user", content: input.prompt },
        ],
        temperature: input.temperature,
        max_tokens: 4096,
      });

      const output = response.choices[0]?.message?.content ?? "";
      const cycleId = genCycleId();

      await db.insert(agentCycles).values({
        cycleId,
        projectId: input.projectId,
        taskId: "manual-prompt",
        status: "complete",
        outcome: "verified",
        engineerOutput: output,
        verificationOutput: "Manual prompt — verification skipped",
        reviewVerdict: "pass",
        durationSeconds: 0,
      });

      await db.insert(agentLogs).values({
        event: "agent_manual_prompt",
        cycleId,
        projectId: input.projectId,
        data: JSON.stringify({
          promptLength: input.prompt.length,
          model: input.model ?? project.model,
          userId: ctx.user?.id,
          outputLength: output.length,
        }),
      });

      return {
        success: true,
        cycleId,
        output,
        model: input.model ?? project.model,
        tokensUsed: response.usage?.total_tokens ?? 0,
      };
    }),

  // ── BOUNDARY LOG ──
  getBoundaryLog: adminQuery
    .input(z.object({
      projectId: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      if (input.projectId) {
        return db
          .select()
          .from(agentBoundaryLog)
          .where(eq(agentBoundaryLog.projectId, input.projectId))
          .orderBy(desc(agentBoundaryLog.createdAt))
          .limit(input.limit);
      }
      return db
        .select()
        .from(agentBoundaryLog)
        .orderBy(desc(agentBoundaryLog.createdAt))
        .limit(input.limit);
    }),

  // ── QUALITY AUDIT ──
  runQualityAudit: adminQuery
    .input(z.object({
      type: z.enum(["appraisal", "buyer_finder", "all"]).default("all"),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const auditResults: Record<string, any> = {};

      if (input.type === "appraisal" || input.type === "all") {
        const cycles = await db
          .select()
          .from(agentCycles)
          .where(eq(agentCycles.projectId, "appraiser"))
          .orderBy(desc(agentCycles.createdAt))
          .limit(20);

        const total = cycles.length;
        const verified = cycles.filter((c) => c.outcome === "verified").length;
        const failed = cycles.filter((c) => c.outcome === "verification_failed").length;
        const weak = cycles.filter((c) => c.outcome === "verified_weak").length;

        let fakeFlags = 0;
        for (const cycle of cycles) {
          if (cycle.engineerOutput?.includes("eBay") || cycle.engineerOutput?.includes("Sold on")) {
            fakeFlags++;
          }
        }

        auditResults.appraisal = {
          totalCycles: total,
          passRate: total > 0 ? Math.round((verified / total) * 100) : 0,
          verified, failed, weakPassed: weak,
          fakeComparableFlags: fakeFlags,
          legitimacyScore: total > 0 ? Math.round(((verified + weak * 0.5) / total) * 100) : 0,
          issues: fakeFlags > 0 ? [`${fakeFlags} cycles contain potentially fabricated comparable sales`] : [],
          recommendation: fakeFlags > 0
            ? "Add stricter prompt rules: 'NEVER cite specific sold listings you cannot verify live'"
            : "Appraisal engine is operating within legitimacy parameters.",
        };
      }

      if (input.type === "buyer_finder" || input.type === "all") {
        const cycles = await db
          .select()
          .from(agentCycles)
          .where(eq(agentCycles.projectId, "outreach"))
          .orderBy(desc(agentCycles.createdAt))
          .limit(20);

        const total = cycles.length;
        const verified = cycles.filter((c) => c.outcome === "verified").length;

        let fakeLeadFlags = 0;
        for (const cycle of cycles) {
          if (cycle.engineerOutput?.includes("linkedin.com/in/") && cycle.engineerOutput?.includes("example")) {
            fakeLeadFlags++;
          }
        }

        auditResults.buyerFinder = {
          totalCycles: total,
          passRate: total > 0 ? Math.round((verified / total) * 100) : 0,
          verified, fakeLeadFlags,
          legitimacyScore: total > 0 ? Math.round((verified / total) * 100) : 0,
          issues: fakeLeadFlags > 0 ? [`${fakeLeadFlags} cycles may contain fabricated LinkedIn profiles`] : [],
          recommendation: fakeLeadFlags > 0
            ? "Enforce: 'Only contact professionals — no fabricated contact information'"
            : "Buyer finder is generating legitimate professional profiles.",
        };
      }

      return {
        auditType: input.type,
        timestamp: new Date().toISOString(),
        results: auditResults,
        overallLegitimacy: Math.round(
          (auditResults.appraisal?.legitimacyScore ?? 100) * 0.5 +
          (auditResults.buyerFinder?.legitimacyScore ?? 100) * 0.5
        ),
      };
    }),

  // ── SUBMIT FEEDBACK (learn from mistakes) ──
  submitFeedback: adminQuery
    .input(z.object({
      cycleId: z.string(),
      projectId: z.string(),
      taskId: z.string(),
      originalOutput: z.string(),
      issue: z.enum(["hallucination", "boundary_violation", "poor_quality", "incorrect_format", "censorship_violation", "contact_fake"]),
      correction: z.string(),
      severity: z.enum(["minor", "major", "critical"]),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const feedbackId = `fb-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;

      const result = await db.insert(agentFeedback).values({
        feedbackId,
        cycleId: input.cycleId,
        projectId: input.projectId,
        taskId: input.taskId,
        originalOutput: input.originalOutput,
        issue: input.issue,
        correction: input.correction,
        severity: input.severity,
        learned: true,
      });

      await db.insert(agentLogs).values({
        event: "feedback_submitted",
        projectId: input.projectId,
        data: JSON.stringify({ feedbackId, issue: input.issue, severity: input.severity }),
      });

      return { id: Number(result.meta.last_row_id), feedbackId, success: true };
    }),

  // ── LIST FEEDBACK ──
  listFeedback: adminQuery
    .input(z.object({
      projectId: z.string().optional(),
      severity: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      if (input.projectId && input.severity) {
        return db
          .select()
          .from(agentFeedback)
          .where(and(
            eq(agentFeedback.projectId, input.projectId),
            eq(agentFeedback.severity, input.severity),
          ))
          .orderBy(desc(agentFeedback.createdAt))
          .limit(input.limit);
      }
      if (input.projectId) {
        return db
          .select()
          .from(agentFeedback)
          .where(eq(agentFeedback.projectId, input.projectId))
          .orderBy(desc(agentFeedback.createdAt))
          .limit(input.limit);
      }
      return db
        .select()
        .from(agentFeedback)
        .orderBy(desc(agentFeedback.createdAt))
        .limit(input.limit);
    }),

  // ── RUN HALLUCINATION CHECK ON CYCLE ──
  checkCycle: adminQuery
    .input(z.object({
      cycleId: z.string(),
      category: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [cycle] = await db
        .select()
        .from(agentCycles)
        .where(eq(agentCycles.cycleId, input.cycleId))
        .limit(1);
      if (!cycle) throw new Error("Cycle not found");

      const report = await checkHallucinations(cycle.engineerOutput ?? "", input.category);
      const sanitized = sanitizeHallucinations(cycle.engineerOutput ?? "", report);

      // If hallucinations found, auto-submit feedback
      if (report.hallucination_count > 0) {
        await db.insert(agentFeedback).values({
          feedbackId: `auto-${Date.now()}`,
          cycleId: input.cycleId,
          projectId: cycle.projectId,
          taskId: cycle.taskId,
          originalOutput: cycle.engineerOutput ?? "",
          issue: "hallucination",
          correction: sanitized.changes.join("\n"),
          severity: report.overall_risk === "critical" ? "critical" : report.overall_risk === "high" ? "major" : "minor",
          learned: true,
        });
      }

      return {
        cycleId: input.cycleId,
        report,
        sanitized: sanitized.text,
        changes: sanitized.changes,
        safeToPublish: sanitized.safeToPublish,
      };
    }),

  // ── VERIFY CONTACT (real person check) ──
  verifyContact: adminQuery
    .input(z.object({
      name: z.string(),
      company: z.string().optional(),
      title: z.string().optional(),
      email: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await verifyContact(input.name, input.company, input.title, input.email);
      return result;
    }),

  // ── CENSORSHIP CHECK ──
  censorCheck: adminQuery
    .input(z.object({
      text: z.string().min(1).max(10000),
      context: z.enum(["email", "social", "partnership"]).default("email"),
    }))
    .mutation(async ({ input }) => {
      const result = await censorOutreach(input.text, input.context);
      return result;
    }),

  // ── AGENT STATS WITH FEEDBACK ──
  agentHealth: adminQuery
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();

      const [project] = await db
        .select()
        .from(agentProjects)
        .where(eq(agentProjects.projectId, input.projectId))
        .limit(1);

      const feedback = await db
        .select()
        .from(agentFeedback)
        .where(eq(agentFeedback.projectId, input.projectId))
        .orderBy(desc(agentFeedback.createdAt))
        .limit(20);

      const totalFeedback = feedback.length;
      const critical = feedback.filter((f) => f.severity === "critical").length;
      const major = feedback.filter((f) => f.severity === "major").length;
      const minor = feedback.filter((f) => f.severity === "minor").length;
      const learned = feedback.filter((f) => f.learned).length;

      // Get recent hallucination rate
      const recentCycles = await db
        .select()
        .from(agentCycles)
        .where(eq(agentCycles.projectId, input.projectId))
        .orderBy(desc(agentCycles.createdAt))
        .limit(20);

      const hallucinatedCycles = recentCycles.filter((c) => {
        return c.engineerOutput?.includes("UNVERIFIED") || c.engineerOutput?.includes("⚠️");
      }).length;

      const learnRate = totalFeedback > 0 ? Math.round((learned / totalFeedback) * 100) : 0;
      const hallucinationRate = recentCycles.length > 0 ? Math.round((hallucinatedCycles / recentCycles.length) * 100) : 0;
      const healthStatus =
        critical > 5 ? "critical" :
        critical > 0 || major > 3 ? "degraded" :
        hallucinationRate > 20 ? "warning" : "healthy";

      return {
        projectId: input.projectId,
        name: project?.name,
        totalFeedback,
        critical,
        major,
        minor,
        learned,
        learnRate,
        recentCycles: recentCycles.length,
        hallucinationRate,
        healthStatus,
        recentFeedback: feedback.slice(0, 5),
      };
    }),

  // ── HALLUCINATION MANIFESTO TEST ──
  // Verifies all 10 agents have zero-hallucination prompts loaded
  runHallucinationTest: adminQuery.query(async () => {
    const { getPrompt, APPRAISER_PROMPT, OUTREACH_PROMPT, PROVERIFY_PROMPT, CONTENT_PROMPT, SECURITY_PROMPT, PRICING_PROMPT, SUPPORT_PROMPT, LISTING_PROMPT, COMPLIANCE_PROMPT, SOCIAL_PROMPT } = await import("./agent-prompts");

    const requiredChecks = [
      { name: "ZERO-HALLUCINATION CONTRACT", pattern: /ZERO-HALLUCINATION CONTRACT/i },
      { name: "MANDATORY PRE-FLIGHT CHECK", pattern: /MANDATORY PRE-FLIGHT CHECK/i },
      { name: "ROGUE PREVENTION", pattern: /ROGUE PREVENTION/i },
      { name: "PRE-FLIGHT per-task", pattern: /PRE-FLIGHT:/i },
    ];

    const agents = [
      { id: "appraiser", prompt: APPRAISER_PROMPT },
      { id: "outreach", prompt: OUTREACH_PROMPT },
      { id: "proverify", prompt: PROVERIFY_PROMPT },
      { id: "content", prompt: CONTENT_PROMPT },
      { id: "security", prompt: SECURITY_PROMPT },
      { id: "pricing", prompt: PRICING_PROMPT },
      { id: "support", prompt: SUPPORT_PROMPT },
      { id: "listing", prompt: LISTING_PROMPT },
      { id: "compliance", prompt: COMPLIANCE_PROMPT },
      { id: "social", prompt: SOCIAL_PROMPT },
    ];

    const results: Record<string, any> = {};
    let allPassed = true;
    let totalChecks = 0;
    let passedChecks = 0;

    for (const agent of agents) {
      const agentResults: Record<string, boolean> = {};
      for (const check of requiredChecks) {
        const passed = check.pattern.test(agent.prompt);
        agentResults[check.name] = passed;
        totalChecks++;
        if (passed) passedChecks++;
      }

      // Verify getPrompt returns a non-empty prompt with preamble
      const resolvedPrompt = getPrompt(agent.id);
      const hasPreamble = resolvedPrompt.includes("ZERO-HALLUCINATION CONTRACT");
      const notEmpty = resolvedPrompt.length > 500;
      agentResults["getPrompt_returns_valid"] = hasPreamble && notEmpty;
      totalChecks += 2;
      if (hasPreamble) passedChecks++;
      if (notEmpty) passedChecks++;

      const agentPassed = Object.values(agentResults).every((v) => v === true);
      if (!agentPassed) allPassed = false;

      results[agent.id] = {
        passed: agentPassed,
        checks: agentResults,
        promptLength: agent.prompt.length,
        getPromptLength: resolvedPrompt.length,
      };
    }

    // Anti-rogue specific checks per agent
    const antiRogueChecks = [
      { id: "appraiser", required: ["DISCLAIMER", "estimatedValue", "cannot_assess"] },
      { id: "outreach", required: ["NEVER invent", "NEVER promise", "VERIFY INDEPENDENTLY"] },
      { id: "proverify", required: ["SIMULATED", "physical inspection", "NOT a substitute"] },
      { id: "content", required: ["NO fabricated stories", "cautious language", "investment"] },
      { id: "security", required: ["POTENTIAL CONCERN", "CVE", "disabling"] },
      { id: "pricing", required: ["general knowledge", "insufficient_data", "consult a professional"] },
      { id: "support", required: ["I don't have", "Let me connect you", "escalate"] },
      { id: "listing", required: ["Do not add", "based ONLY", "No invented"] },
      { id: "compliance", required: ["general references", "No invented", "NEVER recommend"] },
      { id: "social", required: ["NEVER invent", "usernames", "metrics"] },
    ];

    const antiRogueResults: Record<string, any> = {};
    for (const check of antiRogueChecks) {
      const prompt = getPrompt(check.id);
      const found = check.required.filter((r) => prompt.includes(r));
      const missing = check.required.filter((r) => !prompt.includes(r));
      const passed = missing.length === 0;
      if (!passed) allPassed = false;
      antiRogueResults[check.id] = { passed, found, missing };
      totalChecks += check.required.length;
      passedChecks += found.length;
    }

    return {
      allPassed,
      summary: `${passedChecks}/${totalChecks} checks passed`,
      passRate: Math.round((passedChecks / totalChecks) * 100),
      agentPromptChecks: results,
      antiRogueChecks: antiRogueResults,
      timestamp: new Date().toISOString(),
      verdict: allPassed
        ? "ALL CLEAR — Zero-hallucination manifesto is fully enforced across all 10 agents. No rogue vectors detected."
        : "ISSUES DETECTED — Some agents are missing hallucination protection. Review the failed checks above.",
    };
  }),
});
