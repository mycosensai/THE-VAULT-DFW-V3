/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  DIFY-STYLE WORKFLOW ROUTER — Graph-Based Agent Orchestration   ║
 * ║  Uses the Dify-inspired graph engine for:                      ║
 * ║  • Parallel agent execution                                    ║
 * ║  • Variable pool with cross-node scoping                       ║
 * ║  • Command processor (pause/resume/terminate)                  ║
 * ║  • Auto-scaling worker pool                                    ║
 * ║  • Iteration nodes for batch processing                        ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  agentWorkflows,
  agentLogs,
  agentCycles,
  coldEmailProspects,
  coldEmailTemplates,
  listings,
  appraisals,
} from "@db/schema";
import { openaiChat } from "./lib/openai";
import { checkHallucinations, censorOutreach } from "./lib/hallucination-guard";
import { genId } from "./lib/id";
import {
  GraphEngine,
  CommandProcessor,
  VariablePool,
  WorkerPool,
  IterationNode,
} from "./lib/graph-engine";

// ─── SINGLETON ENGINE INSTANCES ───
const globalPool = new WorkerPool({ minWorkers: 2, maxWorkers: 10, scaleUpThreshold: 3 });
const globalCommands = new CommandProcessor();
const globalVariables = new VariablePool();
const graphEngine = new GraphEngine({ pool: globalPool, commands: globalCommands, variables: globalVariables });

// ─── VAULT WORKFLOW DEFINITIONS (Dify-style graphs) ───
function buildOutreachWorkflow(listingId: number, itemName: string, category: string): any {
  return {
    id: genId("wf"),
    name: `Outreach for ${itemName}`,
    nodes: new Map([
      ["start", { id: "start", type: "start", config: {}, inputs: [], outputs: ["research", "appraise"], parallel: true }],
      ["research", { id: "research", type: "agent", config: { agentType: "research", prompt: `Research buyer interest for ${itemName}`, model: "gpt-4o-mini" }, inputs: ["start"], outputs: ["outreach"], parallel: false }],
      ["appraise", { id: "appraise", type: "agent", config: { agentType: "appraiser", prompt: `Appraise ${itemName}`, model: "gpt-4o-mini" }, inputs: ["start"], outputs: ["aggregator"], parallel: false }],
      ["aggregator", { id: "aggregator", type: "aggregator", config: {}, inputs: ["research", "appraise"], outputs: ["outreach"], parallel: false }],
      ["outreach", { id: "outreach", type: "agent", config: { agentType: "outreach", prompt: `Generate personalized outreach for ${itemName}`, model: "gpt-4o" }, inputs: ["aggregator"], outputs: ["iteration"], parallel: false }],
      ["iteration", { id: "iteration", type: "iteration", config: { batchSize: 5 }, inputs: ["outreach"], outputs: ["response"], parallel: true, maxWorkers: 5 }],
      ["response", { id: "response", type: "response", config: { template: "Outreach complete for {{itemName}}" }, inputs: ["iteration"], outputs: [], parallel: false }],
    ]),
    startNode: "start",
    endNodes: ["response"],
  };
}

function buildDailyAuditWorkflow(): any {
  return {
    id: genId("audit-wf"),
    name: "Daily 24/7 Self-Audit",
    nodes: new Map([
      ["start", { id: "start", type: "start", config: {}, inputs: [], outputs: ["integrity", "hallucination", "security"], parallel: true }],
      ["integrity", { id: "integrity", type: "agent", config: { agentType: "auditor", prompt: "Check data integrity", model: "gpt-4o-mini" }, inputs: ["start"], outputs: ["aggregator"], parallel: false }],
      ["hallucination", { id: "hallucination", type: "agent", config: { agentType: "auditor", prompt: "Check hallucinations", model: "gpt-4o-mini" }, inputs: ["start"], outputs: ["aggregator"], parallel: false }],
      ["security", { id: "security", type: "agent", config: { agentType: "security", prompt: "Check security", model: "gpt-4o-mini" }, inputs: ["start"], outputs: ["aggregator"], parallel: false }],
      ["aggregator", { id: "aggregator", type: "aggregator", config: {}, inputs: ["integrity", "hallucination", "security"], outputs: ["report"], parallel: false }],
      ["report", { id: "report", type: "agent", config: { agentType: "auditor", prompt: "Generate audit report", model: "gpt-4o-mini" }, inputs: ["aggregator"], outputs: ["response"], parallel: false }],
      ["response", { id: "response", type: "response", config: { template: "Audit complete" }, inputs: ["report"], outputs: [], parallel: false }],
    ]),
    startNode: "start",
    endNodes: ["response"],
  };
}

// ─── TRPC ROUTER ───
export const graphWorkflowRouter = createRouter({
  // ── EXECUTE WORKFLOW ──
  execute: adminQuery
    .input(z.object({
      workflowType: z.enum(["outreach", "audit", "cold_email_batch", "research_scan"]),
      listingId: z.number().optional(),
      itemName: z.string().optional(),
      category: z.string().optional(),
      prospectIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      let graph: any;
      let context: Record<string, any> = {};

      switch (input.workflowType) {
        case "outreach":
          if (!input.itemName) return { success: false, error: "itemName required" };
          graph = buildOutreachWorkflow(input.listingId || 0, input.itemName, input.category || "collectible");
          context = { itemName: input.itemName, category: input.category, listingId: input.listingId };
          break;

        case "audit":
          graph = buildDailyAuditWorkflow();
          context = { timestamp: new Date().toISOString() };
          break;

        case "cold_email_batch":
          // Build iteration workflow for cold email batch sends
          const prospects = input.prospectIds || [];
          graph = {
            id: genId("wf"),
            name: "Cold Email Batch",
            nodes: new Map([
              ["start", { id: "start", type: "start", config: {}, inputs: [], outputs: ["iteration"], parallel: false }],
              ["iteration", { id: "iteration", type: "iteration", config: { items: prospects }, inputs: ["start"], outputs: ["response"], parallel: true, maxWorkers: 5 }],
              ["response", { id: "response", type: "response", config: { template: "Batch complete" }, inputs: ["iteration"], outputs: [], parallel: false }],
            ]),
            startNode: "start",
            endNodes: ["response"],
          };
          context = { prospectCount: prospects.length };
          break;

        case "research_scan":
          graph = {
            id: genId("wf"),
            name: `Research: ${input.itemName}`,
            nodes: new Map([
              ["start", { id: "start", type: "start", config: {}, inputs: [], outputs: ["reddit", "x", "forums"], parallel: true }],
              ["reddit", { id: "reddit", type: "http", config: { url: `https://www.reddit.com/search.json?q=${encodeURIComponent(input.itemName || "")}&sort=new&limit=10&t=year`, method: "GET" }, inputs: ["start"], outputs: ["aggregator"], parallel: false }],
              ["x", { id: "x", type: "agent", config: { agentType: "research", prompt: `Search X for ${input.itemName}`, model: "gpt-4o-mini" }, inputs: ["start"], outputs: ["aggregator"], parallel: false }],
              ["forums", { id: "forums", type: "agent", config: { agentType: "research", prompt: `Search collector forums for ${input.itemName}`, model: "gpt-4o-mini" }, inputs: ["start"], outputs: ["aggregator"], parallel: false }],
              ["aggregator", { id: "aggregator", type: "aggregator", config: {}, inputs: ["reddit", "x", "forums"], outputs: ["analyze"], parallel: false }],
              ["analyze", { id: "analyze", type: "agent", config: { agentType: "research", prompt: `Analyze findings for ${input.itemName}`, model: "gpt-4o" }, inputs: ["aggregator"], outputs: ["delay"], parallel: false }],
              ["delay", { id: "delay", type: "delay", config: { seconds: 5 }, inputs: ["analyze"], outputs: ["response"], parallel: false }],
              ["response", { id: "response", type: "response", config: { template: "Research complete" }, inputs: ["delay"], outputs: [], parallel: false }],
            ]),
            startNode: "start",
            endNodes: ["response"],
          };
          context = { itemName: input.itemName, category: input.category };
          break;
      }

      const result = await graphEngine.execute(graph, context);

      // Log execution
      const db = getDb();
      await db.insert(agentLogs).values({
        event: "dify_workflow_executed",
        projectId: input.workflowType,
        data: JSON.stringify({
          workflowId: graph.id,
          workflowType: input.workflowType,
          success: result.success,
          completedNodes: result.completedNodes.length,
          failedNodes: result.failedNodes.length,
          logPreview: result.executionLog.slice(0, 5),
          timestamp: new Date().toISOString(),
        }) || "{}",
      });

      return {
        success: result.success,
        workflowId: graph.id,
        workflowType: input.workflowType,
        completedNodes: result.completedNodes.length,
        failedNodes: result.failedNodes.length,
        executionLog: result.executionLog,
        results: result.results,
      };
    }),

  // ── ISSUE COMMAND (pause/resume/terminate) ──
  command: adminQuery
    .input(z.object({
      workflowId: z.string(),
      command: z.enum(["PAUSE", "RESUME", "TERMINATE", "SKIP"]),
    }))
    .mutation(async ({ input }) => {
      globalCommands.issue(input.workflowId, input.command);
      return {
        success: true,
        workflowId: input.workflowId,
        command: input.command,
        message: `Command ${input.command} issued to workflow ${input.workflowId}`,
      };
    }),

  // ── GET WORKFLOW STATUS ──
  status: adminQuery
    .input(z.object({ workflowId: z.string() }))
    .query(async ({ input }) => {
      const cmd = globalCommands.poll(input.workflowId);
      const stats = graphEngine.getStats();
      return {
        workflowId: input.workflowId,
        activeCommand: cmd,
        poolStats: stats.pool,
      };
    }),

  // ── GET ENGINE STATS ──
  engineStats: adminQuery.query(async () => {
    return {
      pool: globalPool.getStats(),
      activeCommands: Array.from(globalCommands.poll("") ? [""] : []),
      uptime: 0,
    };
  }),

  // ── LIST WORKFLOW TYPES ──
  workflowTypes: adminQuery.query(async () => {
    return [
      { id: "outreach", name: "Outreach Pipeline", description: "Research → Appraise → Outreach (parallel research)" },
      { id: "audit", name: "24/7 Self-Audit", description: "Integrity + Hallucination + Security (parallel checks)" },
      { id: "cold_email_batch", name: "Cold Email Batch", description: "Iterate prospects with 20s delay, parallel sends" },
      { id: "research_scan", name: "Research Scan", description: "Reddit + X + Forums (parallel search)" },
    ];
  }),
});
