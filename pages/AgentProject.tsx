/**
 * Agent Project Detail — Task Queue, Cycle History, Manual Controls
 */

import { useState } from "react";
import { useParams, Link } from "react-router";
import { trpc } from "@/providers/trpc";
import {
  ArrowLeft, Play, Plus, CheckCircle, XCircle, Clock, RotateCcw,
  Bot, AlertTriangle, Shield, FileText, BarChart3, Trash2
} from "lucide-react";

export default function AgentProject() {
  const { projectId } = useParams<{ projectId: string }>();
  const utils = trpc.useContext();
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState(2);

  const { data, isLoading } = trpc.agent.getProject.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId }
  );

  const runCycle = trpc.agent.runCycle.useMutation({
    onSuccess: () => { utils.agent.getProject.invalidate({ projectId: projectId! }); }
  });

  const runSession = trpc.agent.runSession.useMutation({
    onSuccess: () => { utils.agent.getProject.invalidate({ projectId: projectId! }); }
  });

  const addTask = trpc.agent.addTask.useMutation({
    onSuccess: () => { setNewTaskTitle(""); utils.agent.getProject.invalidate({ projectId: projectId! }); }
  });

  const markDone = trpc.agent.markTaskDone.useMutation({
    onSuccess: () => utils.agent.getProject.invalidate({ projectId: projectId! }),
  });

  const markPending = trpc.agent.markTaskPending.useMutation({
    onSuccess: () => utils.agent.getProject.invalidate({ projectId: projectId! }),
  });

  const removeTask = trpc.agent.removeTask.useMutation({
    onSuccess: () => utils.agent.getProject.invalidate({ projectId: projectId! }),
  });

  if (isLoading) {
    return (
          <div className="max-w-6xl mx-auto px-4 py-12 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-500">Loading agent...</p>
        </div>
      );
  }

  if (!data?.project) {
    return (
          <div className="max-w-6xl mx-auto px-4 py-12 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900">Agent not found</h2>
          <p className="text-slate-500 mt-2">The agent project <code>{projectId}</code> does not exist.</p>
          <Link to="/agents" className="mt-4 inline-block text-amber-700 hover:text-amber-800 underline">Back to Fleet</Link>
        </div>
      );
  }

  const project = data.project;
  const tasks = data.tasks ?? [];
  const fleet = data.fleet;
  const cycles = data.cycles ?? [];

  const pendingTasks = tasks.filter((t) => t.status === "pending" || t.status === "in_progress");
  const doneTasks = tasks.filter((t) => t.status === "done");
  const botPickable = pendingTasks.filter((t) => !t.interactiveOnly);

  return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link to="/agents" className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to Fleet
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Bot className="w-8 h-8 text-amber-700" />
            <h1 className="text-3xl font-serif font-bold text-slate-900">{project.name}</h1>
            <span className={`px-2 py-1 rounded text-xs font-medium ${project.mode === "A" ? "bg-green-100 text-green-700" : project.mode === "B" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
              {project.mode === "A" ? "Bot-Primary" : project.mode === "B" ? "Assist" : "Pipeline"}
            </span>
          </div>
          <p className="text-slate-600 max-w-2xl">{project.description}</p>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
            <span>Priority: <strong className="text-slate-700">{project.priority}</strong></span>
            <span>Model: <strong className="text-slate-700">{project.model}</strong></span>
            <span>Budget: <strong className="text-slate-700">{project.cycleBudgetMinutes}m/cycle</strong></span>
            <span>Auto-merge: <strong className="text-slate-700">{project.autoMerge ? "on" : "off"}</strong></span>
            {fleet && (
              <>
                <span>Cycles: <strong className="text-slate-700">{fleet.totalCycles}</strong></span>
                <span>Verified: <strong className="text-green-600">{fleet.totalVerified}</strong></span>
                <span>Failed: <strong className="text-red-600">{fleet.totalFailed}</strong></span>
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2 mb-8">
          {botPickable.length > 0 && (
            <button
              onClick={() => runSession.mutate({ projectId: project.projectId, budgetMinutes: 20, maxCycles: 5 })}
              disabled={runSession.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800 disabled:opacity-50 text-sm font-medium"
            >
              <Play className="w-4 h-4" />
              {runSession.isPending ? "Running..." : `Run Session (${botPickable.length} tasks)`}
            </button>
          )}
          <button
            onClick={() => utils.agent.getProject.invalidate({ projectId: project.projectId })}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 text-sm font-medium"
          >
            <RotateCcw className="w-4 h-4" /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Task Queue */}
          <div className="lg:col-span-2 space-y-6">
            {/* Add Task */}
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Task
              </h3>
              <div className="flex gap-2">
                <input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Task title..."
                  className="flex-1 px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(Number(e.target.value))}
                  className="px-3 py-2 border border-slate-200 rounded text-sm"
                >
                  <option value={1}>P1</option>
                  <option value={2}>P2</option>
                  <option value={3}>P3</option>
                  <option value={4}>P4</option>
                  <option value={5}>P5</option>
                </select>
                <button
                  onClick={() => addTask.mutate({
                    projectId: project.projectId,
                    title: newTaskTitle,
                    priority: newTaskPriority,
                  })}
                  disabled={!newTaskTitle.trim() || addTask.isPending}
                  className="px-4 py-2 bg-amber-700 text-white rounded text-sm hover:bg-amber-800 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Pending Tasks */}
            <div className="bg-white border border-slate-200 rounded-lg">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Pending Tasks ({pendingTasks.length})</h3>
                <span className="text-xs text-slate-500">{botPickable.length} bot-pickable</span>
              </div>
              <div className="divide-y divide-slate-50">
                {pendingTasks.map((task) => (
                  <div key={task.taskId} className="px-4 py-3 flex items-start justify-between hover:bg-slate-50/50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${task.priority === 1 ? "bg-red-100 text-red-700" : task.priority === 2 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                          P{task.priority}
                        </span>
                        <span className="font-medium text-slate-900 text-sm">{task.title}</span>
                        {task.interactiveOnly && (
                          <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">interactive</span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-xs text-slate-500 mt-1">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        <span className="font-mono">{task.taskId}</span>
                        <span>{task.status}</span>
                        {task.cycleId && <span>cycle: {task.cycleId}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      {!task.interactiveOnly && task.status === "pending" && (
                        <button
                          onClick={() => runCycle.mutate({ projectId: project.projectId, taskId: task.taskId })}
                          disabled={runCycle.isPending}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                          title="Run cycle"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => markDone.mutate({ projectId: project.projectId, taskId: task.taskId })}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                        title="Mark done"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeTask.mutate({ projectId: project.projectId, taskId: task.taskId })}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {pendingTasks.length === 0 && (
                  <div className="px-4 py-8 text-center text-slate-400 text-sm">No pending tasks.</div>
                )}
              </div>
            </div>

            {/* Done Tasks */}
            {doneTasks.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-semibold text-slate-900">Completed ({doneTasks.length})</h3>
                </div>
                <div className="divide-y divide-slate-50">
                  {doneTasks.slice(0, 10).map((task) => (
                    <div key={task.taskId} className="px-4 py-2 flex items-center justify-between text-sm opacity-70 hover:opacity-100">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-slate-600">{task.title}</span>
                        <span className="font-mono text-xs text-slate-400">{task.taskId}</span>
                      </div>
                      <button
                        onClick={() => markPending.mutate({ projectId: project.projectId, taskId: task.taskId })}
                        className="p-1 text-slate-400 hover:text-slate-600"
                        title="Reopen"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Cycle History */}
            <div className="bg-white border border-slate-200 rounded-lg">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Recent Cycles
                </h3>
              </div>
              <div className="p-3 space-y-2">
                {cycles.slice(0, 10).map((cycle) => (
                  <div key={cycle.cycleId} className="p-2.5 bg-slate-50 rounded border border-slate-100 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-slate-500">{cycle.cycleId}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${cycle.outcome === "verified" ? "bg-green-100 text-green-700" : cycle.outcome === "verified_weak" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                        {cycle.outcome ?? "running"}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {cycle.durationSeconds ? `${cycle.durationSeconds}s` : "—"} · {cycle.reviewVerdict ?? "—"}
                    </div>
                    {cycle.engineerOutput && cycle.engineerOutput.length > 50 && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{cycle.engineerOutput.slice(0, 120)}...</p>
                    )}
                  </div>
                ))}
                {cycles.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">No cycles yet.</p>
                )}
              </div>
            </div>

            {/* Hands-off */}
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4" /> Hands-off Zones
              </h3>
              <div className="space-y-1">
                {(() => {
                  try {
                    const list = JSON.parse(project.handsOff ?? "[]") as string[];
                    return list.map((zone) => (
                      <div key={zone} className="flex items-center gap-2 text-xs text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        {zone}
                      </div>
                    ));
                  } catch { return <span className="text-xs text-slate-400">None configured</span>; }
                })()}
              </div>
            </div>

            {/* Mission Card */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-semibold text-amber-900 mb-2 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4" /> Mission Brief
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                {project.description}
              </p>
              <div className="mt-2 text-xs text-amber-700 font-mono">
                Provider: {project.providerId} · Model: {project.model}
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
