/**
 * Agent Workflow Router
 * Inter-agent collaboration system — agents communicate and create productive workflows.
 */

import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { agentWorkflows, agentProjects, agentTasks, agentLogs, systemSettings } from "@db/schema";
import { openaiChat } from "./lib/openai";

function genWorkflowId(): string {
  return "wf-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
}

export const agentWorkflowRouter = createRouter({
  // ── LIST WORKFLOWS ──
  list: adminQuery
    .input(z.object({
      status: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      if (input.status) {
        return db
          .select()
          .from(agentWorkflows)
          .where(eq(agentWorkflows.status, input.status))
          .orderBy(desc(agentWorkflows.createdAt))
          .limit(input.limit);
      }
      return db
        .select()
        .from(agentWorkflows)
        .orderBy(desc(agentWorkflows.createdAt))
        .limit(input.limit);
    }),

  // ── GET WORKFLOW DETAIL ──
  getById: adminQuery
    .input(z.object({ workflowId: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [wf] = await db
        .select()
        .from(agentWorkflows)
        .where(eq(agentWorkflows.workflowId, input.workflowId))
        .limit(1);
      if (!wf) return null;
      let stepDataParsed = {};
      let agentsParsed: string[] = [];
      try { stepDataParsed = JSON.parse(wf.stepData ?? "{}"); } catch { stepDataParsed = {}; }
      try { agentsParsed = JSON.parse(wf.participatingAgents ?? "[]"); } catch { agentsParsed = []; }
      return {
        ...wf,
        stepData: stepDataParsed,
        participatingAgents: agentsParsed,
      };
    }),

  // ── CREATE WORKFLOW ──
  create: adminQuery
    .input(z.object({
      title: z.string().min(1).max(200),
      description: z.string().optional(),
      triggerEvent: z.enum(["listing_paid", "appraisal_complete", "manual", "schedule"]),
      participatingAgents: z.array(z.string()).min(1),
      totalSteps: z.number().min(1).max(10).default(3),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const workflowId = genWorkflowId();

      const result = await db.insert(agentWorkflows).values({
        workflowId,
        title: input.title,
        description: input.description,
        triggerEvent: input.triggerEvent,
        participatingAgents: JSON.stringify(input.participatingAgents),
        totalSteps: input.totalSteps,
        currentStep: 0,
        stepData: "{}",
        createdBy: String(ctx.user?.id ?? "system"),
        status: "active",
      });

      await db.insert(agentLogs).values({
        event: "workflow_created",
        projectId: "system",
        data: JSON.stringify({
          workflowId,
          title: input.title,
          agents: input.participatingAgents,
          createdBy: ctx.user?.id,
        }),
      });

      return { id: Number(result.meta.last_row_id), workflowId, success: true };
    }),

  // ── AI GENERATE WORKFLOW ──
  generateWorkflow: adminQuery
    .input(z.object({
      goal: z.string().min(1).max(500),
      triggerEvent: z.enum(["listing_paid", "appraisal_complete", "manual", "schedule"]).default("manual"),
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
        return { success: false, error: "SAMSON IS ARMED. Workflow generation frozen." };
      }

      const prompt = `You are The Vault's Chief of Operations. Design an inter-agent workflow to achieve this goal:

"${input.goal}"

Available agents:
- appraiser: photo-based valuation
- outreach: professional buyer finding
- proverify: multi-expert verification
- content: SEO copy and marketing
- security: vulnerability audits
- pricing: market analysis
- support: customer service
- listing: listing optimization
- compliance: legal/regulatory
- social: social media lead gen

Return ONLY JSON:
{
  "title": "workflow title",
  "description": "what this workflow accomplishes",
  "steps": [
    { "agent": "agent_name", "task": "what this agent does in this step", "dependsOn": null or previous step index }
  ],
  "participatingAgents": ["agent1", "agent2"]
}

Rules:
- 3-5 steps maximum
- Each step names a specific agent
- Steps can have dependencies (sequential) or run parallel (dependsOn: null)
- Must benefit both the company AND the clientele`;

      const response = await openaiChat({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You design efficient business workflows for a luxury marketplace." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 2048,
      });

      const text = response.choices[0]?.message?.content ?? "{}";
      let plan: any = {};
      try {
        plan = JSON.parse(text);
      } catch {
        return { success: false, error: "AI failed to generate valid workflow JSON" };
      }

      const workflowId = genWorkflowId();
      const result = await db.insert(agentWorkflows).values({
        workflowId,
        title: plan.title ?? input.goal.slice(0, 50),
        description: plan.description ?? "AI-generated workflow",
        triggerEvent: input.triggerEvent,
        participatingAgents: JSON.stringify(plan.participatingAgents ?? []),
        totalSteps: (plan.steps ?? []).length,
        currentStep: 0,
        stepData: JSON.stringify({
          0: { status: "pending", agent: plan.steps?.[0]?.agent, task: plan.steps?.[0]?.task },
        }),
        createdBy: String(ctx.user?.id ?? "system"),
        status: "active",
      });

      // Create tasks for each step
      for (let i = 0; i < (plan.steps ?? []).length; i++) {
        const step = plan.steps[i];
        const prefix = step.agent?.slice(0, 2).toLowerCase() ?? "wf";
        const taskId = `${prefix}-${String(i + 1).padStart(3, "0")}`;
        await db.insert(agentTasks).values({
          taskId,
          projectId: step.agent,
          title: step.task ?? `Workflow step ${i + 1}`,
          description: `Auto-generated from workflow ${workflowId}. Step ${i + 1} of ${plan.steps.length}`,
          priority: 2,
          interactiveOnly: false,
          expectedTouches: "[]",
          assignedAgent: step.agent,
        });
      }

      await db.insert(agentLogs).values({
        event: "workflow_generated_by_ai",
        projectId: "system",
        data: JSON.stringify({
          workflowId,
          goal: input.goal,
          steps: plan.steps?.length ?? 0,
          agents: plan.participatingAgents,
        }),
      });

      return {
        success: true,
        workflowId,
        id: Number(result.meta.last_row_id),
        plan,
      };
    }),

  // ── ADVANCE WORKFLOW STEP ──
  advanceStep: adminQuery
    .input(z.object({ workflowId: z.string(), stepOutput: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [wf] = await db
        .select()
        .from(agentWorkflows)
        .where(eq(agentWorkflows.workflowId, input.workflowId))
        .limit(1);
      if (!wf) throw new Error("Workflow not found");

      let stepData: any = {};
      try { stepData = JSON.parse(wf.stepData ?? "{}"); } catch { stepData = {}; }
      stepData[wf.currentStep] = {
        ...stepData[wf.currentStep],
        output: input.stepOutput,
        completedAt: new Date().toISOString(),
        status: "done",
      };

      const nextStep = wf.currentStep + 1;
      let newStatus: string = wf.status;
      let completedAt: Date | null = null;

      if (nextStep >= wf.totalSteps) {
        newStatus = "completed";
        completedAt = new Date();
      } else {
        stepData[nextStep] = {
          status: "pending",
          ...stepData[nextStep],
        };
      }

      await db
        .update(agentWorkflows)
        .set({
          currentStep: nextStep,
          stepData: JSON.stringify(stepData),
          status: newStatus,
          completedAt,
        })
        .where(eq(agentWorkflows.id, wf.id));

      return {
        success: true,
        workflowId: input.workflowId,
        currentStep: nextStep,
        status: newStatus,
        isComplete: newStatus === "completed",
      };
    }),

  // ── PAUSE / RESUME ──
  updateStatus: adminQuery
    .input(z.object({
      workflowId: z.string(),
      status: z.enum(["active", "paused", "cancelled"]),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(agentWorkflows)
        .set({ status: input.status })
        .where(eq(agentWorkflows.workflowId, input.workflowId));
      return { success: true, status: input.status };
    }),

  // ── DELETE ──
  remove: adminQuery
    .input(z.object({ workflowId: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(agentWorkflows).where(eq(agentWorkflows.workflowId, input.workflowId));
      return { success: true };
    }),
});
