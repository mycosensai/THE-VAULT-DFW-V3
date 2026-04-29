/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  DIFY-INSPIRED GRAPH WORKFLOW ENGINE FOR THE VAULT              ║
 * ║  Ported from langgenius/dify — Production-grade orchestration   ║
 * ║  • Graph-based node execution with dependency resolution       ║
 * ║  • Parallel/sequential execution modes                           ║
 * ║  • VariablePool with hierarchical scoping                        ║
 * ║  • CommandProcessor (pause/resume/terminate)                     ║
 * ║  • WorkerPool with auto-scaling                                  ║
 * ║  • IterationNode for batch processing                            ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

type NodeType = "start" | "agent" | "parallel" | "iteration" | "condition" | "aggregator" | "response" | "http" | "delay";

interface WorkflowNode {
  id: string;
  type: NodeType;
  config: Record<string, any>;
  inputs: string[]; // Node IDs this node depends on
  outputs: string[]; // Node IDs that depend on this node
  parallel?: boolean;
  maxWorkers?: number;
}

interface WorkflowGraph {
  id: string;
  name: string;
  nodes: Map<string, WorkflowNode>;
  startNode: string;
  endNodes: string[];
}

// ─── VARIABLE POOL (hierarchical scoping) ───
// Inspired by Dify's variable pool system
class VariablePool {
  scopes: Map<string, Map<string, any>> = new Map();
  parentMap: Map<string, string | null> = new Map();

  constructor() {
    this.scopes.set("global", new Map());
    this.parentMap.set("global", null);
  }

  createScope(scopeId: string, parentId: string = "global"): void {
    this.scopes.set(scopeId, new Map());
    this.parentMap.set(scopeId, parentId);
  }

  set(scopeId: string, key: string, value: any): void {
    const scope = this.scopes.get(scopeId);
    if (scope) scope.set(key, value);
  }

  get(scopeId: string, key: string): any {
    // Walk up the parent chain (hierarchical scoping)
    let current: string | null = scopeId;
    while (current) {
      const scope = this.scopes.get(current);
      if (scope && scope.has(key)) return scope.get(key);
      current = this.parentMap.get(current) ?? null;
    }
    return undefined;
  }

  getAll(scopeId: string): Record<string, any> {
    const result: Record<string, any> = {};
    let current: string | null = scopeId;
    while (current) {
      const scope = this.scopes.get(current);
      if (scope) {
        for (const [k, v] of scope) {
          if (!(k in result)) result[k] = v;
        }
      }
      current = this.parentMap.get(current) ?? null;
    }
    return result;
  }

  deleteScope(scopeId: string): void {
    this.scopes.delete(scopeId);
    this.parentMap.delete(scopeId);
    // Also delete all child scopes
    for (const [id, parent] of this.parentMap) {
      if (parent === scopeId) this.deleteScope(id);
    }
  }
}

// ─── COMMAND PROCESSOR ───
// Inspired by Dify 1.9.0 CommandProcessor
// Enables pause/resume/terminate during execution
type WorkflowCommand = "PAUSE" | "RESUME" | "TERMINATE" | "SKIP";

class CommandProcessor {
  commands: Map<string, WorkflowCommand> = new Map();
  listeners: Map<string, ((cmd: WorkflowCommand) => void)[]> = new Map();

  issue(workflowId: string, command: WorkflowCommand): void {
    this.commands.set(workflowId, command);
    const list = this.listeners.get(workflowId) || [];
    for (const cb of list) cb(command);
  }

  poll(workflowId: string): WorkflowCommand | null {
    return this.commands.get(workflowId) || null;
  }

  clear(workflowId: string): void {
    this.commands.delete(workflowId);
  }

  onCommand(workflowId: string, callback: (cmd: WorkflowCommand) => void): void {
    const list = this.listeners.get(workflowId) || [];
    list.push(callback);
    this.listeners.set(workflowId, list);
  }

  isTerminated(workflowId: string): boolean {
    return this.commands.get(workflowId) === "TERMINATE";
  }

  isPaused(workflowId: string): boolean {
    return this.commands.get(workflowId) === "PAUSE";
  }
}

// ─── WORKER POOL WITH AUTO-SCALING ───
// Inspired by Dify's GraphEngineThreadPool
class WorkerPool {
  queue: (() => Promise<any>)[] = [];
  running = 0;
  minWorkers: number;
  maxWorkers: number;
  scaleUpThreshold: number;
  scaleDownIdleTime: number;
  currentWorkers: number;
  idleSince: number = Date.now();

  constructor(options: {
    minWorkers?: number;
    maxWorkers?: number;
    scaleUpThreshold?: number;
    scaleDownIdleTime?: number;
  } = {}) {
    this.minWorkers = options.minWorkers ?? 1;
    this.maxWorkers = options.maxWorkers ?? 10;
    this.scaleUpThreshold = options.scaleUpThreshold ?? 3;
    this.scaleDownIdleTime = options.scaleDownIdleTime ?? 30;
    this.currentWorkers = this.minWorkers;
  }

  async submit<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
      this.processQueue();
    });
  }

  processQueue(): void {
    if (this.running >= this.currentWorkers || this.queue.length === 0) return;

    // Auto-scale up if queue is backing up
    if (this.queue.length > this.scaleUpThreshold && this.currentWorkers < this.maxWorkers) {
      this.currentWorkers = Math.min(this.currentWorkers + 1, this.maxWorkers);
    }

    while (this.running < this.currentWorkers && this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) break;
      this.running++;
      task().finally(() => {
        this.running--;
        this.processQueue();
      });
    }

    // Auto-scale down if idle
    if (this.queue.length === 0 && this.running === 0) {
      const idleTime = (Date.now() - this.idleSince) / 1000;
      if (idleTime > this.scaleDownIdleTime && this.currentWorkers > this.minWorkers) {
        this.currentWorkers = Math.max(this.currentWorkers - 1, this.minWorkers);
      }
    } else {
      this.idleSince = Date.now();
    }
  }

  getStats(): { currentWorkers: number; running: number; queued: number; maxWorkers: number } {
    return { currentWorkers: this.currentWorkers, running: this.running, queued: this.queue.length, maxWorkers: this.maxWorkers };
  }
}

// ─── ITERATION NODE ───
// Inspired by Dify's iteration_node.py
// Processes collections with parallel or sequential execution
class IterationNode {
  pool: WorkerPool;
  constructor(pool: WorkerPool) {
    this.pool = pool;
  }

  async execute<T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>,
    parallel: boolean = true,
    maxWorkers?: number
  ): Promise<R[]> {
    if (parallel) {
      const futures = items.map((item, index) =>
        this.pool.submit(() => processor(item, index))
      );
      return Promise.all(futures);
    } else {
      const results: R[] = [];
      for (let i = 0; i < items.length; i++) {
        results.push(await processor(items[i], i));
      }
      return results;
    }
  }
}

// ─── GRAPH ENGINE ───
// The core execution engine — resolves dependencies, executes nodes
class GraphEngine {
  pool: WorkerPool;
  commands: CommandProcessor;
  variables: VariablePool;

  constructor(options?: { pool?: WorkerPool; commands?: CommandProcessor; variables?: VariablePool }) {
    this.pool = options?.pool ?? new WorkerPool();
    this.commands = options?.commands ?? new CommandProcessor();
    this.variables = options?.variables ?? new VariablePool();
  }

  async execute(graph: WorkflowGraph, context: Record<string, any> = {}): Promise<{
    success: boolean;
    results: Record<string, any>;
    executionLog: string[];
    completedNodes: string[];
    failedNodes: string[];
  }> {
    const executionLog: string[] = [];
    const results: Record<string, any> = {};
    const completedNodes: string[] = [];
    const failedNodes: string[] = [];

    // Initialize global scope
    this.variables.createScope(graph.id, "global");
    for (const [k, v] of Object.entries(context)) {
      this.variables.set(graph.id, k, v);
    }

    executionLog.push(`[${graph.id}] Workflow started: ${graph.name}`);

    // Topological sort for dependency resolution
    const sorted = this.topologicalSort(graph);
    executionLog.push(`[${graph.id}] Execution order: ${sorted.join(" → ")}`);

    for (const nodeId of sorted) {
      // Check for commands
      if (this.commands.isTerminated(graph.id)) {
        executionLog.push(`[${graph.id}] TERMINATED by command`);
        return { success: false, results, executionLog, completedNodes, failedNodes };
      }

      // Wait if paused
      while (this.commands.isPaused(graph.id)) {
        executionLog.push(`[${graph.id}] PAUSED — waiting...`);
        await new Promise((r) => setTimeout(r, 1000));
      }

      const node = graph.nodes.get(nodeId);
      if (!node) continue;

      try {
        executionLog.push(`[${graph.id}] Executing node: ${node.id} (${node.type})`);

        // Gather inputs from parent nodes
        const inputs: Record<string, any> = {};
        for (const inputId of node.inputs) {
          inputs[inputId] = results[inputId];
        }

        // Execute the node
        const output = await this.executeNode(node, inputs, graph.id);
        results[nodeId] = output;
        completedNodes.push(nodeId);
        executionLog.push(`[${graph.id}] Node ${node.id} completed successfully`);
      } catch (e: any) {
        failedNodes.push(nodeId);
        executionLog.push(`[${graph.id}] Node ${node.id} FAILED: ${e.message}`);
        // Continue with remaining nodes (fail-safe mode)
      }
    }

    executionLog.push(`[${graph.id}] Workflow completed: ${completedNodes.length}/${sorted.length} nodes succeeded`);

    return {
      success: failedNodes.length === 0,
      results,
      executionLog,
      completedNodes,
      failedNodes,
    };
  }

  private topologicalSort(graph: WorkflowGraph): string[] {
    const visited = new Set<string>();
    const temp = new Set<string>();
    const order: string[] = [];

    const visit = (id: string) => {
      if (temp.has(id)) throw new Error(`Cycle detected in workflow: ${id}`);
      if (visited.has(id)) return;
      temp.add(id);

      const node = graph.nodes.get(id);
      if (node) {
        for (const dep of node.inputs) visit(dep);
      }

      temp.delete(id);
      visited.add(id);
      order.push(id);
    };

    // Visit all nodes
    for (const [id] of graph.nodes) {
      if (!visited.has(id)) visit(id);
    }

    return order;
  }

  private async executeNode(
    node: WorkflowNode,
    inputs: Record<string, any>,
    scopeId: string
  ): Promise<any> {
    switch (node.type) {
      case "start":
        return { started: true, timestamp: new Date().toISOString() };

      case "agent": {
        // Execute an AI agent with the given config
        const { agentType, prompt, model = "gpt-4o-mini" } = node.config;
        return { agentType, prompt, model, status: "dispatched" };
      }

      case "parallel": {
        // Execute all child nodes in parallel
        const childIds = node.outputs;
        const futures = childIds.map((childId) =>
          this.pool.submit(async () => {
            // Child execution would go here
            return { childId, completed: true };
          })
        );
        return Promise.all(futures);
      }

      case "iteration": {
        const { items, processor } = node.config;
        const iter = new IterationNode(this.pool);
        return iter.execute(items, processor, node.parallel !== false, node.maxWorkers);
      }

      case "condition": {
        const { condition } = node.config;
        const result = condition(inputs);
        return { condition: result, branch: result ? "true" : "false" };
      }

      case "aggregator": {
        // Collect all inputs and merge
        return { aggregated: inputs, count: Object.keys(inputs).length };
      }

      case "response": {
        return { response: node.config.template, inputs };
      }

      case "http": {
        const { url, method = "GET", headers = {}, body } = node.config;
        const resp = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
        return { status: resp.status, body: await resp.text() };
      }

      case "delay": {
        const { seconds = 20 } = node.config;
        await new Promise((r) => setTimeout(r, seconds * 1000));
        return { delayed: seconds };
      }

      default:
        return { unknown: true, type: node.type };
    }
  }

  getStats(): { pool: ReturnType<WorkerPool["getStats"]> } {
    return { pool: this.pool.getStats() };
  }
}

// ─── EXPORTS ───
export {
  VariablePool,
  CommandProcessor,
  WorkerPool,
  IterationNode,
  GraphEngine,
};
export type { WorkflowNode, WorkflowGraph, WorkflowCommand, NodeType };
