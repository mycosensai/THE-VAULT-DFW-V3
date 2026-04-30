/**
 * GeneralStaff Agent System — Database Schema for D1/SQLite
 * Mission: Run The Vault's business operations autonomously
 */

import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";

// ─── AGENT PROJECTS (website business units) ───
export const agentProjects = sqliteTable("agent_projects", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  projectId: text("project_id").notNull().unique(), // e.g. "appraiser", "outreach", "security"
  name: text("name").notNull(),
  description: text("description"),
  mode: text("mode").default("A").notNull(), // A=bot-primary, B=interactive, C=binary
  priority: integer("priority").default(2).notNull(),
  engineerCommand: text("engineer_command"), // AI prompt template
  verificationCommand: text("verification_command"), // validation rule
  cycleBudgetMinutes: integer("cycle_budget_minutes").default(15).notNull(),
  workDetection: text("work_detection").default("tasks_json").notNull(),
  concurrencyDetection: text("concurrency_detection").default("none").notNull(),
  branch: text("branch").default("bot/work").notNull(),
  autoMerge: integer("auto_merge", { mode: "boolean" }).default(false).notNull(),
  handsOff: text("hands_off").default("[]").notNull(), // JSON array of protected paths
  providerId: text("provider_id").default("openai").notNull(),
  model: text("model").default("gpt-4o").notNull(),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

// ─── AGENT TASKS (GS-style task queue) ───
export const agentTasks = sqliteTable("agent_tasks", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  taskId: text("task_id").notNull().unique(), // e.g. "gs-001"
  projectId: text("project_id").notNull(),
  title: text("title").notNull(),
  status: text("status").default("pending").notNull(), // pending, in_progress, done, skipped
  priority: integer("priority").default(2).notNull(),
  interactiveOnly: integer("interactive_only", { mode: "boolean" }).default(false).notNull(),
  expectedTouches: text("expected_touches").default("[]").notNull(), // JSON array of file paths
  description: text("description"),
  assignedAgent: text("assigned_agent"), // which bot type handles this
  cycleId: text("cycle_id"), // link to executing cycle
  result: text("result"), // outcome summary
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

// ─── AGENT CYCLES (engineer→verify→review pipeline) ───
export const agentCycles = sqliteTable("agent_cycles", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  cycleId: text("cycle_id").notNull().unique(), // e.g. "20260425143000_abc"
  projectId: text("project_id").notNull(),
  taskId: text("task_id").notNull(),
  status: text("status").default("running").notNull(), // starting, running, complete, failed
  outcome: text("outcome"), // verified, verification_failed, verified_weak
  engineerOutput: text("engineer_output"),
  verificationOutput: text("verification_output"),
  reviewOutput: text("review_output"),
  reviewVerdict: text("review_verdict"), // pass, fail, weak_pass
  startSha: text("start_sha"),
  endSha: text("end_sha"),
  durationSeconds: integer("duration_seconds"),
  scopeDriftFiles: text("scope_drift_files").default("[]").notNull(),
  handsOffViolations: text("hands_off_violations").default("[]").notNull(),
  silentFailures: text("silent_failures").default("[]").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

// ─── AGENT SESSIONS (batch of cycles) ───
export const agentSessions = sqliteTable("agent_sessions", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  sessionId: text("session_id").notNull().unique(), // e.g. "b05evw3nt"
  projectId: text("project_id").notNull(),
  status: text("status").default("active").notNull(), // starting, active, complete, failed
  stopReason: text("stop_reason"), // budget, max-cycles, STOP, error
  totalCycles: integer("total_cycles").default(0).notNull(),
  totalVerified: integer("total_verified").default(0).notNull(),
  totalFailed: integer("total_failed").default(0).notNull(),
  durationMinutes: integer("duration_minutes"),
  reviewer: text("reviewer"),
  maxParallelSlots: integer("max_parallel_slots"),
  parallelRounds: integer("parallel_rounds"),
  slotIdleSeconds: integer("slot_idle_seconds"),
  parallelEfficiency: real("parallel_efficiency"),
  startedAt: integer("started_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

// ─── AGENT LOGS (PROGRESS.jsonl equivalent) ───
export const agentLogs = sqliteTable("agent_logs", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  timestamp: integer("timestamp", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  event: text("event").notNull(), // cycle_start, cycle_end, session_start, session_complete, task_done, etc.
  cycleId: text("cycle_id"),
  sessionId: text("session_id"),
  projectId: text("project_id").notNull(),
  taskId: text("task_id"),
  data: text("data").default("{}").notNull(), // JSON event payload
});

// ─── AI PROVIDERS ───
export const agentProviders = sqliteTable("agent_providers", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  providerId: text("provider_id").notNull().unique(), // openai, openrouter, ollama
  name: text("name").notNull(),
  kind: text("kind").default("openai").notNull(), // openai, openrouter, ollama
  model: text("model").notNull(),
  apiKey: text("api_key"),
  baseUrl: text("base_url"),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

// ─── FLEET STATE (aggregated counters) ───
export const agentFleetState = sqliteTable("agent_fleet_state", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  projectId: text("project_id").notNull().unique(),
  totalCycles: integer("total_cycles").default(0).notNull(),
  totalVerified: integer("total_verified").default(0).notNull(),
  totalFailed: integer("total_failed").default(0).notNull(),
  accumulatedMinutes: integer("accumulated_minutes").default(0).notNull(),
  lastCycleAt: integer("last_cycle_at", { mode: "timestamp" }),
  lastCycleOutcome: text("last_cycle_outcome"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

// ─── INBOX / OUTBOX MESSAGES ───
export const agentMessages = sqliteTable("agent_messages", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  messageId: text("message_id").notNull().unique(),
  projectId: text("project_id").notNull(),
  sessionId: text("session_id"),
  from: text("from").notNull(), // bot, human, system
  kind: text("kind").default("fyi").notNull(), // blocker, handoff, fyi, decision
  body: text("body").notNull(),
  refs: text("refs").default("[]").notNull(), // JSON array of referenced task IDs
  processed: integer("processed", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
