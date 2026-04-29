/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ADMIN PROMPT QUEUE — Override System                           ║
 * ║  When admin types a command, ALL agents drop everything         ║
 * ║  and execute the admin's instruction immediately                ║
 * ║  Priority 100 = highest — overrides all other tasks             ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { adminPromptQueue, agentLogs, agentSessions } from "@db/schema";
import { openaiChat } from "./lib/openai";
import { genId } from "./lib/id";


// ─── COMMAND ROUTER — parses admin prompt and routes to right agent ───
async function routeAdminCommand(
  promptText: string
): Promise<{
  targetAgent: string;
  action: string;
  params: Record<string, any>;
  interpretation: string;
}> {
  const routingPrompt = `You are a command parser for an AI agent system. Parse this admin command and return JSON.

ADMIN COMMAND: "${promptText}"

Available agents: appraiser, outreach, proverify, content, security, pricing, support, listing, compliance, social, research, auditor

Available actions:
- RUN: Execute a task
- STATUS: Get status report
- STOP: Halt an agent
- CONFIG: Change settings
- AUDIT: Run quality check
- RESEARCH: Search internet
- OUTREACH: Send messages
- FIX: Repair an issue
- REPORT: Generate report

Respond ONLY with JSON:
{"targetAgent": "agent_name", "action": "action_name", "params": {}, "interpretation": "human readable description"}`;

  try {
    const response = await openaiChat({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Parse admin commands into structured routing decisions. Respond with valid JSON only." },
        { role: "user", content: routingPrompt },
      ],
      temperature: 0.1,
      max_tokens: 512,
    });

    const text = response.choices[0]?.message?.content ?? "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallbackRoute(promptText);

    let parsed: any;
    try { parsed = JSON.parse(jsonMatch[0]); } catch { return fallbackRoute(promptText); }

    return {
      targetAgent: parsed.targetAgent || "all",
      action: parsed.action || "RUN",
      params: parsed.params || {},
      interpretation: parsed.interpretation || `Execute: ${promptText}`,
    };
  } catch {
    return fallbackRoute(promptText);
  }
}

function fallbackRoute(promptText: string): {
  targetAgent: string;
  action: string;
  params: Record<string, any>;
  interpretation: string;
} {
  // Simple keyword matching
  const lower = promptText.toLowerCase();
  if (lower.includes("apprais")) return { targetAgent: "appraiser", action: "RUN", params: {}, interpretation: `Run appraisal task: ${promptText}` };
  if (lower.includes("outreach") || lower.includes("email") || lower.includes("contact")) return { targetAgent: "outreach", action: "RUN", params: {}, interpretation: `Run outreach: ${promptText}` };
  if (lower.includes("research") || lower.includes("find") || lower.includes("search")) return { targetAgent: "research", action: "RESEARCH", params: {}, interpretation: `Research: ${promptText}` };
  if (lower.includes("audit") || lower.includes("check")) return { targetAgent: "auditor", action: "AUDIT", params: {}, interpretation: `Audit: ${promptText}` };
  if (lower.includes("stop") || lower.includes("halt") || lower.includes("pause")) return { targetAgent: "all", action: "STOP", params: {}, interpretation: `Emergency stop: ${promptText}` };
  if (lower.includes("status")) return { targetAgent: "all", action: "STATUS", params: {}, interpretation: `Get fleet status: ${promptText}` };
  if (lower.includes("fix") || lower.includes("repair")) return { targetAgent: "all", action: "FIX", params: {}, interpretation: `Fix issues: ${promptText}` };
  if (lower.includes("report")) return { targetAgent: "all", action: "REPORT", params: {}, interpretation: `Generate report: ${promptText}` };

  return { targetAgent: "all", action: "RUN", params: { prompt: promptText }, interpretation: `Broadcast to all agents: ${promptText}` };
}

// ─── TRPC ROUTER ───
export const adminPromptRouter = createRouter({
  // ── SUBMIT ADMIN PROMPT (highest priority) ──
  submit: adminQuery
    .input(z.object({
      promptText: z.string().min(1).max(2000),
      targetAgent: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();

      // Route the command
      const routing = await routeAdminCommand(input.promptText);
      const finalAgent = input.targetAgent || routing.targetAgent;

      // Create high-priority queue entry
      const promptId = genId("ap");
      const result = await db.insert(adminPromptQueue).values({
        promptId,
        promptText: input.promptText,
        targetAgent: finalAgent,
        priority: 100, // HIGHEST — overrides everything
        status: "pending",
      });

      // Log that admin issued an override
      await db.insert(agentLogs).values({
        event: "admin_override_issued",
        projectId: finalAgent,
        data: JSON.stringify({
          promptId,
          promptText: input.promptText,
          routedTo: finalAgent,
          action: routing.action,
          interpretation: routing.interpretation,
          priority: 100,
          timestamp: new Date().toISOString(),
        }) || "{}",
      });

      // If targeting "all", log to each agent
      if (finalAgent === "all") {
        const allAgents = ["appraiser", "outreach", "proverify", "content", "security", "pricing", "support", "listing", "compliance", "social", "research", "auditor"];
        for (const agent of allAgents) {
          await db.insert(agentLogs).values({
            event: "agent_task_override",
            projectId: agent,
            data: JSON.stringify({ promptId, originalTask: "dropped", adminPriority: 100 }) || "{}",
          });
        }
      }

      return {
        success: true,
        promptId,
        routedTo: finalAgent,
        action: routing.action,
        interpretation: routing.interpretation,
        priority: 100,
        message: `Command submitted with MAXIMUM priority. ${finalAgent === "all" ? "All agents" : `The ${finalAgent} agent`} will drop current tasks and execute immediately.`,
      };
    }),

  // ── LIST PENDING PROMPTS ──
  pending: adminQuery.query(async () => {
    const db = getDb();
    return db.select().from(adminPromptQueue)
      .where(eq(adminPromptQueue.status, "pending"))
      .orderBy(desc(adminPromptQueue.createdAt))
      .limit(50);
  }),

  // ── LIST ALL PROMPTS ──
  list: adminQuery
    .input(z.object({
      status: z.string().optional(),
      limit: z.number().default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      if (input?.status) {
        return db.select().from(adminPromptQueue)
          .where(eq(adminPromptQueue.status, input.status as any))
          .orderBy(desc(adminPromptQueue.createdAt))
          .limit(input?.limit ?? 50);
      }
      return db.select().from(adminPromptQueue)
        .orderBy(desc(adminPromptQueue.createdAt))
        .limit(input?.limit ?? 50);
    }),

  // ── GET QUEUE STATS ──
  stats: adminQuery.query(async () => {
    const db = getDb();
    const allPrompts = await db.select().from(adminPromptQueue);
    return {
      totalSubmitted: allPrompts.length,
      pending: allPrompts.filter((p) => p.status === "pending").length,
      completed: allPrompts.filter((p) => p.status === "completed").length,
      failed: allPrompts.filter((p) => p.status === "failed").length,
      running: allPrompts.filter((p) => p.status === "running").length,
      lastSubmitted: allPrompts[0]?.createdAt ?? null,
    };
  }),

  // ── MARK AS RUNNING ──
  markRunning: adminQuery
    .input(z.object({ promptId: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(adminPromptQueue)
        .set({ status: "running", startedAt: new Date() })
        .where(eq(adminPromptQueue.promptId, input.promptId));
      return { success: true };
    }),

  // ── COMPLETE PROMPT ──
  complete: adminQuery
    .input(z.object({
      promptId: z.string(),
      result: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(adminPromptQueue)
        .set({ status: "completed", result: input.result || "Done", completedAt: new Date() })
        .where(eq(adminPromptQueue.promptId, input.promptId));
      return { success: true };
    }),
});
