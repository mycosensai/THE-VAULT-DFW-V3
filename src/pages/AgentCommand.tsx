/**
 * Agent Command Center — Admin-only agent control dashboard
 * Samson kill switch, toggles, prompts, boundaries, audits, workflows, partnerships
 */

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertTriangle, Power, Send, Shield,
  Activity, MessageSquare, Globe, Workflow, BarChart3,
  CheckCircle, XCircle, ChevronDown, ChevronUp, Terminal,
  Lock, Unlock, Bot, Save, Plus,
  ArrowLeft, Loader2, Zap, Eye, EyeOff, RefreshCw,
  DollarSign, Receipt, ClipboardList, TrendingUp,
  FileText, Clock, BookOpen, UserCheck, ShieldCheck,
  Sparkles, Play, Square
} from "lucide-react";

// ─── ADMIN ACCESS CONTROL ───
// ONLY ratchetkrewelabs@gmail.com can access this page
const ADMIN_EMAIL = "ratchetkrewelabs@gmail.com";

export default function AgentCommand() {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, isLoading: authLoading, user } = useAuth();
  const utils = trpc.useUtils();

  // Strict email-based access — only the designated admin email
  const isOwner = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isOwner)) {
      navigate("/");
    }
  }, [isAuthenticated, isOwner, authLoading, navigate]);

  const { data: stats } = trpc.agent.dashboardStats.useQuery(undefined, { enabled: isOwner });
  const { data: fleet } = trpc.agent.fleetOverview.useQuery(undefined, { enabled: isOwner });
  const { data: samson } = trpc.samson.samsonStatus.useQuery(undefined, { enabled: isOwner });
  const { data: projects } = trpc.agent.listProjects.useQuery(undefined, { enabled: isOwner });
  const { data: sessions } = trpc.agent.listSessions.useQuery({ limit: 10 }, { enabled: isOwner });
  const { data: partnershipStats } = trpc.partnership.stats.useQuery(undefined, { enabled: isOwner });
  const { data: workflows } = trpc.workflow.list.useQuery({ limit: 20 }, { enabled: isOwner });
  const { data: researchStats } = trpc.research.stats.useQuery(undefined, { enabled: isOwner });
  const { data: researchSessions } = trpc.research.listSessions.useQuery(undefined, { enabled: isOwner });
  const { data: conversations } = trpc.research.getConversations.useQuery({ limit: 50 }, { enabled: isOwner });
  const { data: autoStatus } = trpc.autonomous.status.useQuery(undefined, { enabled: isOwner });
  const { data: autoStats } = trpc.autonomous.stats.useQuery(undefined, { enabled: isOwner });

  const armSamson = trpc.samson.armSamson.useMutation({
    onSuccess: () => { utils.samson.samsonStatus.invalidate(); utils.agent.dashboardStats.invalidate(); }
  });
  const disarmSamson = trpc.samson.disarmSamson.useMutation({
    onSuccess: () => { utils.samson.samsonStatus.invalidate(); utils.agent.dashboardStats.invalidate(); }
  });
  const toggleAgent = trpc.samson.toggleAgent.useMutation({
    onSuccess: () => utils.agent.fleetOverview.invalidate()
  });
  const updateConfig = trpc.samson.updateAgentConfig.useMutation({
    onSuccess: () => utils.agent.listProjects.invalidate()
  });
  const promptAgent = trpc.samson.promptAgent.useMutation();
  const runAudit = trpc.samson.runQualityAudit.useMutation();
  const generateWorkflow = trpc.workflow.generateWorkflow.useMutation({
    onSuccess: () => utils.workflow.list.invalidate()
  });
  const generatePartners = trpc.partnership.generateTargets.useMutation();
  const startResearch = trpc.research.startResearch.useMutation({
    onSuccess: () => { utils.research.stats.invalidate(); utils.research.listSessions.invalidate(); }
  });
  const agentDiscuss = trpc.research.agentDiscuss.useMutation({
    onSuccess: () => utils.research.getConversations.invalidate()
  });
  const runAutonomous = trpc.autonomous.runNow.useMutation({
    onSuccess: () => { utils.autonomous.status.invalidate(); utils.autonomous.stats.invalidate(); }
  });
  const triggerAction = trpc.autonomous.triggerFromAction.useMutation({
    onSuccess: () => utils.autonomous.stats.invalidate()
  });

  // ─── NEW SYSTEM QUERIES ───
  const { data: auditStats } = trpc.selfAudit.stats.useQuery(undefined, { enabled: isOwner });
  const { data: auditDashboard } = trpc.selfAudit.dashboard.useQuery(undefined, { enabled: isOwner });
  const { data: auditLogs } = trpc.selfAudit.getLogs.useQuery({ limit: 20 }, { enabled: isOwner });
  const { data: hardening } = trpc.selfAudit.getHardening.useQuery({ limit: 10 }, { enabled: isOwner });
  const { data: policeStats } = trpc.police.stats.useQuery(undefined, { enabled: isOwner });
  const { data: policeChecks } = trpc.police.recentChecks.useQuery({ limit: 20 }, { enabled: isOwner });
  const { data: trustScores } = trpc.police.trustScores.useQuery(undefined, { enabled: isOwner });
  const { data: accountingSummary } = trpc.accounting.summary.useQuery(undefined, { enabled: isOwner });
  const { data: latestReport } = trpc.dailyReport.latest.useQuery(undefined, { enabled: isOwner });
  const { data: reportStats } = trpc.dailyReport.stats.useQuery(undefined, { enabled: isOwner });
  const { data: promptStats } = trpc.adminPrompt.stats.useQuery(undefined, { enabled: isOwner });
  const { data: pendingPrompts } = trpc.adminPrompt.pending.useQuery(undefined, { enabled: isOwner });
  // ─── DIFY ENGINE QUERIES ───
  const { data: difyTypes } = trpc.graphWorkflow.workflowTypes.useQuery(undefined, { enabled: isOwner });
  const { data: difyStats } = trpc.graphWorkflow.engineStats.useQuery(undefined, { enabled: isOwner });

  // ─── NEW MUTATIONS ───
  const runSelfAudit = trpc.selfAudit.runAudit.useMutation({
    onSuccess: () => { utils.selfAudit.stats.invalidate(); utils.selfAudit.dashboard.invalidate(); utils.selfAudit.getLogs.invalidate(); }
  });
  const implementHardening = trpc.selfAudit.implementHardening.useMutation({
    onSuccess: () => utils.selfAudit.getHardening.invalidate()
  });
  const policeSweep = trpc.police.sweep.useMutation({
    onSuccess: () => { utils.police.stats.invalidate(); utils.police.recentChecks.invalidate(); utils.police.trustScores.invalidate(); }
  });
  const policeCheck = trpc.police.checkOutput.useMutation({
    onSuccess: () => { utils.police.stats.invalidate(); utils.police.recentChecks.invalidate(); }
  });
  const reconcileAccounting = trpc.accounting.reconcile.useMutation({
    onSuccess: () => utils.accounting.summary.invalidate()
  });
  const generateDailyReport = trpc.dailyReport.generate.useMutation({
    onSuccess: () => { utils.dailyReport.latest.invalidate(); utils.dailyReport.stats.invalidate(); }
  });
  const markReportRead = trpc.dailyReport.markRead.useMutation({
    onSuccess: () => utils.dailyReport.stats.invalidate()
  });
  const submitAdminPrompt = trpc.adminPrompt.submit.useMutation({
    onSuccess: () => { utils.adminPrompt.stats.invalidate(); utils.adminPrompt.pending.invalidate(); }
  });
  // ─── DIFY MUTATIONS ───
  const executeDifyWorkflow = trpc.graphWorkflow.execute.useMutation({
    onSuccess: () => utils.graphWorkflow.engineStats.invalidate()
  });
  const difyCommand = trpc.graphWorkflow.command.useMutation();
  const auditFleetHallucinations = trpc.samson.auditFleetHallucinations.useMutation({
    onSuccess: (data) => setAuditResult(data),
  });

  const [activeTab, setActiveTab] = useState<"status" | "control" | "prompt" | "boundaries" | "audit" | "partners" | "workflows" | "research" | "agentchat" | "outreach" | "commands" | "selfaudit" | "police" | "accounting" | "dailyreport" | "override" | "dify">("status");
  const [selectedProject, setSelectedProject] = useState<string>("__none__");
  const [promptText, setPromptText] = useState("");
  const [promptOutput, setPromptOutput] = useState("");
  const [promptLoading, setPromptLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, any>>({});
  const [workflowGoal, setWorkflowGoal] = useState("");
  const [partnerIndustry, setPartnerIndustry] = useState("");
  const [researchItem, setResearchItem] = useState("");
  const [researchCategory, setResearchCategory] = useState("");
  const [chatFromAgent, setChatFromAgent] = useState("research");
  const [chatMessage, setChatMessage] = useState("");
  const [autoItem, setAutoItem] = useState("");
  const [autoCategory, setAutoCategory] = useState("");
  const [triggerItem, setTriggerItem] = useState("");
  const [triggerCategory, setTriggerCategory] = useState("");
  const [triggerValue, setTriggerValue] = useState("");
  const [triggerType, setTriggerType] = useState<"sell" | "appraise" | "verify" | "tokenize">("sell");
  const [adminPromptText, setAdminPromptText] = useState("");
  const [difyWorkflowType, setDifyWorkflowType] = useState<"outreach" | "audit" | "cold_email_batch" | "research_scan">("outreach");
  const [difyItemName, setDifyItemName] = useState("");

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080808]">
        <Loader2 className="w-8 h-8 text-[#C9A84C] animate-spin" />
      </div>
    );
  }
  if (!isOwner) return null;

  const samsonArmed = samson?.armed ?? false;

  async function handlePrompt() {
    if (!selectedProject || selectedProject === "__none__" || !promptText.trim()) return;
    setPromptLoading(true);
    setPromptOutput("");
    const res = await promptAgent.mutateAsync({
      projectId: selectedProject,
      prompt: promptText,
    });
    setPromptLoading(false);
    if (res.success) {
      setPromptOutput(res.output ?? "");
    } else {
      setPromptOutput(`ERROR: ${res.error ?? "Unknown error"}`);
    }
  }

  async function handleAudit(type: "appraisal" | "buyer_finder" | "all") {
    setAuditLoading(true);
    const res = await runAudit.mutateAsync({ type });
    setAuditResult(res);
    setAuditLoading(false);
  }

  const tabs = [
    { id: "status", label: "Fleet Status", icon: <Activity className="w-4 h-4" /> },
    { id: "control", label: "Samson & Toggles", icon: <Power className="w-4 h-4" /> },
    { id: "prompt", label: "Direct Prompt", icon: <Terminal className="w-4 h-4" /> },
    { id: "boundaries", label: "Boundaries", icon: <Shield className="w-4 h-4" /> },
    { id: "audit", label: "Quality Audit", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "partners", label: "Partnerships", icon: <Globe className="w-4 h-4" /> },
    { id: "workflows", label: "Workflows", icon: <Workflow className="w-4 h-4" /> },
    { id: "research", label: "Internet Research", icon: <Globe className="w-4 h-4" /> },
    { id: "agentchat", label: "Agent Chat", icon: <MessageSquare className="w-4 h-4" /> },
    { id: "outreach", label: "Outreach Engine", icon: <Zap className="w-4 h-4" /> },
    { id: "commands", label: "Command List", icon: <Terminal className="w-4 h-4" /> },
    { id: "override", label: "Override Box", icon: <Sparkles className="w-4 h-4" /> },
    { id: "selfaudit", label: "Self Audit", icon: <ShieldCheck className="w-4 h-4" /> },
    { id: "police", label: "Agent Police", icon: <UserCheck className="w-4 h-4" /> },
    { id: "accounting", label: "Auto-Books", icon: <DollarSign className="w-4 h-4" /> },
    { id: "dailyreport", label: "Daily Report", icon: <FileText className="w-4 h-4" /> },
    { id: "dify", label: "Dify Engine", icon: <Workflow className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#080808] pt-24 pb-16 px-4 flex justify-center">
      <div className="w-full max-w-6xl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-[10px] tracking-[3px] uppercase text-[#C8BC98] hover:text-[#C9A84C] transition-colors mb-3">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Site
            </Link>
            <h1 className="font-cinzel text-2xl sm:text-3xl font-bold text-[#F5EED8] tracking-[4px]">
              Agent Command Center
            </h1>
            <p className="text-xs text-[#8A6E2F] mt-1">Full spectrum control of the autonomous fleet</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/admin/marketing" className="flex items-center gap-2 px-4 py-2 bg-[#C9A84C]/10 border border-[#C9A84C]/20 text-[#C9A84C] text-[10px] tracking-[2px] uppercase hover:bg-[#C9A84C]/20 transition-colors">
              <BarChart3 className="w-3.5 h-3.5" /> Marketing
            </Link>
            {samsonArmed ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-950/50 border border-red-500/30 text-red-400 text-[10px] tracking-[2px] uppercase">
                <Lock className="w-3.5 h-3.5" /> Samson Armed
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 text-[10px] tracking-[2px] uppercase">
                <Unlock className="w-3.5 h-3.5" /> Agents Active
              </div>
            )}
          </div>
        </div>

        {/* ─── ADMIN PROMPT OVERRIDE BOX ─── */}
        <div className="mb-8 bg-gradient-to-r from-[#C9A84C]/10 via-[#161616] to-[#C9A84C]/10 border border-[#C9A84C]/30 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Admin Override — All Agents Drop Everything
            </h3>
            <span className="text-[9px] tracking-[1px] uppercase px-2 py-1 bg-red-950/30 text-red-400 border border-red-500/20">
              PRIORITY 100
            </span>
          </div>
          <p className="text-[10px] text-[#8A6E2F] mb-3">
            Type any command or task. The system routes it to the right agent(s) and they execute immediately, overriding all current tasks.
          </p>
          <div className="flex gap-2">
            <input
              value={adminPromptText}
              onChange={(e) => setAdminPromptText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && adminPromptText.trim()) {
                  submitAdminPrompt.mutate({ promptText: adminPromptText });
                  setAdminPromptText("");
                }
              }}
              placeholder="Type a command: e.g., 'Run full system audit' or 'Find buyers for Rolex Submariner' or 'Stop all agents immediately'..."
              className="flex-1 bg-[#1E1E1E] border border-[#C9A84C]/30 px-4 py-3 text-sm text-[#F5EED8] placeholder-[#8A6E2F]/50 focus:border-[#C9A84C] outline-none"
            />
            <button
              onClick={() => {
                if (!adminPromptText.trim()) return;
                submitAdminPrompt.mutate({ promptText: adminPromptText });
                setAdminPromptText("");
              }}
              disabled={submitAdminPrompt.isPending || !adminPromptText.trim()}
              className="px-6 py-3 bg-[#C9A84C] text-[#080808] text-[10px] tracking-[2px] uppercase font-bold hover:bg-[#E8CB7A] transition-colors disabled:opacity-30 flex items-center gap-2"
            >
              {submitAdminPrompt.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {submitAdminPrompt.isPending ? "DISPATCHING..." : "EXECUTE"}
            </button>
          </div>
          {submitAdminPrompt.data && (
            <div className="mt-3 p-3 bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-400">
              {submitAdminPrompt.data.message}
            </div>
          )}
          {pendingPrompts && pendingPrompts.length > 0 && (
            <div className="mt-3 flex items-center gap-2 text-[10px] text-amber-400">
              <Clock className="w-3 h-3" /> {pendingPrompts.length} prompt{pendingPrompts.length > 1 ? "s" : ""} pending execution
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-8 border-b border-[#C9A84C]/15 pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-[10px] tracking-[2px] uppercase transition-all ${
                activeTab === tab.id
                  ? "bg-[#C9A84C]/15 text-[#E8CB7A] border-t-2 border-[#C9A84C]"
                  : "text-[#8A6E2F] hover:text-[#C8BC98]"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ─── TAB: FLEET STATUS ─── */}
        {activeTab === "status" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatBox label="Projects" value={stats?.projects ?? 0} color="text-[#C9A84C]" />
              <StatBox label="Pending Tasks" value={stats?.pendingTasks ?? 0} color="text-amber-400" />
              <StatBox label="Cycles Run" value={stats?.totalCycles ?? 0} color="text-blue-400" />
              <StatBox label="Pass Rate" value={`${stats?.passRate ?? 0}%`} color="text-emerald-400" />
            </div>

            <div className="bg-[#161616] border border-[#C9A84C]/15">
              <div className="px-6 py-4 border-b border-[#C9A84C]/10">
                <h2 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase">Fleet Overview</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#C9A84C]/10 text-[10px] tracking-[2px] uppercase text-[#8A6E2F]">
                      <th className="px-4 py-3 text-left">Agent</th>
                      <th className="px-4 py-3 text-center">Cycles</th>
                      <th className="px-4 py-3 text-center">Verified</th>
                      <th className="px-4 py-3 text-center">Failed</th>
                      <th className="px-4 py-3 text-center">Queue</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fleet?.map((row) => (
                      <tr key={row.projectId} className="border-b border-[#C9A84C]/5 hover:bg-[#1E1E1E]/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Bot className="w-4 h-4 text-[#C9A84C]" />
                            <div>
                              <div className="text-xs text-[#F5EED8] font-medium">{row.name}</div>
                              <div className="text-[10px] text-[#8A6E2F] font-mono">{row.projectId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-[#C8BC98]">{row.totalCycles}</td>
                        <td className="px-4 py-3 text-center text-xs text-emerald-400">{row.totalVerified}</td>
                        <td className="px-4 py-3 text-center text-xs text-red-400">{row.totalFailed}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded ${row.botPickable > 0 ? "bg-amber-900/30 text-amber-400" : "bg-[#1E1E1E] text-[#8A6E2F]"}`}>
                            {row.botPickable}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-wider ${row.active ? "bg-emerald-900/30 text-emerald-400" : "bg-red-900/30 text-red-400"}`}>
                            {row.active ? "Active" : "Offline"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-[10px] text-[#8A6E2F] uppercase">{row.mode === "A" ? "Auto" : row.mode === "B" ? "Assist" : "Pipeline"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
                <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase mb-4">Recent Sessions</h3>
                <div className="space-y-2">
                  {(sessions ?? []).map((s) => (
                    <div key={s.sessionId} className="flex items-center justify-between p-3 bg-[#1E1E1E] border border-[#C9A84C]/10">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${s.status === "complete" ? "bg-emerald-500" : s.status === "failed" ? "bg-red-500" : "bg-blue-500"}`} />
                          <span className="text-xs text-[#F5EED8] font-mono">{s.sessionId}</span>
                        </div>
                        <div className="text-[10px] text-[#8A6E2F]">
                          {s.totalCycles} cycles · {s.totalVerified} passed · {s.durationMinutes ?? 0}m
                        </div>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-[#8A6E2F]">{s.stopReason ?? s.status}</span>
                    </div>
                  ))}
                  {(!sessions || sessions.length === 0) && <p className="text-xs text-[#8A6E2F] text-center py-4">No sessions recorded</p>}
                </div>
              </div>

              <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
                <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase mb-4">Partnership Pipeline</h3>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <QuickStat label="Total" value={partnershipStats?.total ?? 0} />
                  <QuickStat label="Sent" value={partnershipStats?.sent ?? 0} />
                  <QuickStat label="Partners" value={partnershipStats?.partners ?? 0} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <QuickStat label="Draft" value={partnershipStats?.draft ?? 0} />
                  <QuickStat label="Responded" value={partnershipStats?.responded ?? 0} />
                  <QuickStat label="Declined" value={partnershipStats?.declined ?? 0} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: SAMSON & TOGGLES ─── */}
        {activeTab === "control" && (
          <div className="space-y-8">
            <div className={`p-8 border-2 rounded ${samsonArmed ? "border-red-500/50 bg-red-950/10" : "border-emerald-500/30 bg-emerald-950/10"}`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${samsonArmed ? "bg-red-500/20 animate-pulse" : "bg-emerald-500/20"}`}>
                    <AlertTriangle className={`w-8 h-8 ${samsonArmed ? "text-red-400" : "text-emerald-400"}`} />
                  </div>
                  <div>
                    <h2 className="font-cinzel text-lg font-bold tracking-[4px] text-[#F5EED8]">SAMSON KILL SWITCH</h2>
                    <p className="text-xs text-[#8A6E2F] mt-1">
                      {samsonArmed
                        ? "All agent operations are FROZEN. No cycles, no outreach, no workflows."
                        : "Agents are cleared for normal operations. Samson is disarmed."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {samsonArmed ? (
                    <button
                      onClick={() => disarmSamson.mutate()}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs tracking-[3px] uppercase font-cinzel font-semibold transition-colors flex items-center gap-2"
                    >
                      <Unlock className="w-4 h-4" /> Disarm Samson
                    </button>
                  ) : (
                    <button
                      onClick={() => armSamson.mutate()}
                      className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-xs tracking-[3px] uppercase font-cinzel font-semibold transition-colors flex items-center gap-2"
                    >
                      <Lock className="w-4 h-4" /> Arm Samson
                    </button>
                  )}
                </div>
              </div>
              {samson?.armedAt && (
                <p className="text-[10px] text-[#8A6E2F]">
                  Last changed: {new Date(samson.armedAt).toLocaleString()}
                </p>
              )}
            </div>

            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase mb-6">Agent Power Switches</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects?.map((proj) => {
                  const fleetRow = fleet?.find((f) => f.projectId === proj.projectId);
                  return (
                    <div key={proj.projectId} className={`p-4 border ${proj.active ? "border-emerald-500/20 bg-emerald-950/5" : "border-red-500/20 bg-red-950/5"}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4 text-[#C9A84C]" />
                          <span className="text-xs text-[#F5EED8] font-medium">{proj.name}</span>
                        </div>
                        <button
                          onClick={() => toggleAgent.mutate({ projectId: proj.projectId, active: !proj.active })}
                          className={`w-10 h-5 rounded-full transition-colors relative ${proj.active ? "bg-emerald-500" : "bg-[#3A3A3A]"}`}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${proj.active ? "left-5" : "left-0.5"}`} />
                        </button>
                      </div>
                      <div className="flex justify-between text-[10px] text-[#8A6E2F]">
                        <span>Cycles: {fleetRow?.totalCycles ?? 0}</span>
                        <span>Queue: {fleetRow?.botPickable ?? 0}</span>
                      </div>
                      <div className="text-[10px] text-[#8A6E2F] mt-1 truncate">{proj.model}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: DIRECT PROMPT ─── */}
        {activeTab === "prompt" && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase mb-6">Direct Agent Prompt</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] tracking-[3px] uppercase text-[#8A6E2F] mb-2">Select Agent</label>
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.currentTarget.value || "__none__")}
                    className="w-full bg-[#1E1E1E] border border-[#C9A84C]/20 text-[#F5EED8] text-sm py-3 px-4 outline-none focus:border-[#C9A84C]"
                  >
                    <option value="__none__">Choose an agent...</option>
                    {projects?.map((p) => (
                      <option key={p.projectId} value={p.projectId}>{p.name} ({p.projectId})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] tracking-[3px] uppercase text-[#8A6E2F] mb-2">Your Prompt</label>
                  <textarea
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder="e.g., Find 5 high-end watch collectors in London who might be interested in a 1970s Rolex Paul Newman..."
                    className="w-full bg-[#1E1E1E] border border-[#C9A84C]/20 text-[#F5EED8] text-sm py-3 px-4 outline-none focus:border-[#C9A84C] min-h-[120px] resize-y"
                  />
                </div>
                <button
                  onClick={handlePrompt}
                  disabled={!selectedProject || !promptText.trim() || promptLoading}
                  className="px-6 py-3 bg-[#C9A84C] text-[#080808] text-xs tracking-[3px] uppercase font-cinzel font-semibold hover:bg-[#E8CB7A] transition-colors disabled:opacity-40 flex items-center gap-2"
                >
                  {promptLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {promptLoading ? "Running..." : "Execute Prompt"}
                </button>
              </div>
            </div>

            {promptOutput && (
              <div className="mt-6 bg-[#161616] border border-[#C9A84C]/15 p-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase">Agent Output</h4>
                  <button onClick={() => setPromptOutput("")} className="text-[10px] text-[#8A6E2F] hover:text-red-400">Clear</button>
                </div>
                <pre className="text-xs text-[#C8BC98] whitespace-pre-wrap font-mono leading-relaxed bg-[#1E1E1E] p-4 border border-[#C9A84C]/10 max-h-[500px] overflow-y-auto">
                  {promptOutput}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: BOUNDARIES ─── */}
        {activeTab === "boundaries" && (
          <div className="space-y-6">
            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase mb-6">Boundary Configuration</h3>
              <div className="space-y-4">
                {projects?.map((proj) => {
                  const isOpen = expandedProject === proj.projectId;
                  const handsOff = (() => { try { return JSON.parse(proj.handsOff ?? "[]"); } catch { return []; } })();
                  return (
                    <div key={proj.projectId} className="border border-[#C9A84C]/10 bg-[#1E1E1E]/50">
                      <button
                        onClick={() => setExpandedProject(isOpen ? null : proj.projectId)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left"
                      >
                        <div className="flex items-center gap-3">
                          <Shield className="w-4 h-4 text-[#C9A84C]" />
                          <span className="text-xs text-[#F5EED8] font-medium">{proj.name}</span>
                          <span className="text-[10px] text-[#8A6E2F]">{proj.projectId}</span>
                        </div>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-[#8A6E2F]" /> : <ChevronDown className="w-4 h-4 text-[#8A6E2F]" />}
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 space-y-3">
                          <div>
                            <label className="block text-[9px] tracking-[2px] uppercase text-[#8A6E2F] mb-1">Engineer Command</label>
                            <textarea
                              value={configForm[proj.projectId]?.engineerCommand ?? proj.engineerCommand ?? ""}
                              onChange={(e) => setConfigForm({ ...configForm, [proj.projectId]: { ...(configForm[proj.projectId] ?? {}), engineerCommand: e.target.value } })}
                              className="w-full bg-[#080808] border border-[#C9A84C]/20 text-[#C8BC98] text-xs py-2 px-3 outline-none focus:border-[#C9A84C] min-h-[100px] resize-y"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] tracking-[2px] uppercase text-[#8A6E2F] mb-1">Verification Rule</label>
                            <input
                              value={configForm[proj.projectId]?.verificationCommand ?? proj.verificationCommand ?? ""}
                              onChange={(e) => setConfigForm({ ...configForm, [proj.projectId]: { ...(configForm[proj.projectId] ?? {}), verificationCommand: e.target.value } })}
                              className="w-full bg-[#080808] border border-[#C9A84C]/20 text-[#C8BC98] text-xs py-2 px-3 outline-none focus:border-[#C9A84C]"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] tracking-[2px] uppercase text-[#8A6E2F] mb-1">Hands-off Zones (comma-separated)</label>
                            <input
                              value={configForm[proj.projectId]?.handsOff ?? handsOff.join(", ")}
                              onChange={(e) => setConfigForm({ ...configForm, [proj.projectId]: { ...(configForm[proj.projectId] ?? {}), handsOff: e.target.value } })}
                              className="w-full bg-[#080808] border border-[#C9A84C]/20 text-[#C8BC98] text-xs py-2 px-3 outline-none focus:border-[#C9A84C]"
                              placeholder="users, payments, auth, stripe"
                            />
                          </div>
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <label className="block text-[9px] tracking-[2px] uppercase text-[#8A6E2F] mb-1">Model</label>
                              <select
                                value={configForm[proj.projectId]?.model ?? proj.model ?? "gpt-4o"}
                                onChange={(e) => setConfigForm({ ...configForm, [proj.projectId]: { ...(configForm[proj.projectId] ?? {}), model: e.target.value } })}
                                className="w-full bg-[#080808] border border-[#C9A84C]/20 text-[#C8BC98] text-xs py-2 px-3 outline-none focus:border-[#C9A84C]"
                              >
                                <option value="gpt-4o">gpt-4o</option>
                                <option value="gpt-4o-mini">gpt-4o-mini</option>
                                <option value="o3-mini">o3-mini</option>
                              </select>
                            </div>
                            <div className="flex-1">
                              <label className="block text-[9px] tracking-[2px] uppercase text-[#8A6E2F] mb-1">Mode</label>
                              <select
                                value={configForm[proj.projectId]?.mode ?? proj.mode ?? "A"}
                                onChange={(e) => setConfigForm({ ...configForm, [proj.projectId]: { ...(configForm[proj.projectId] ?? {}), mode: e.target.value as "A" | "B" | "C" } })}
                                className="w-full bg-[#080808] border border-[#C9A84C]/20 text-[#C8BC98] text-xs py-2 px-3 outline-none focus:border-[#C9A84C]"
                              >
                                <option value="A">A — Bot-Primary</option>
                                <option value="B">B — Assist</option>
                                <option value="C">C — Pipeline</option>
                              </select>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              const form = configForm[proj.projectId] ?? {};
                              updateConfig.mutate({
                                projectId: proj.projectId,
                                engineerCommand: form.engineerCommand,
                                verificationCommand: form.verificationCommand,
                                handsOff: form.handsOff?.split(",").map((s: string) => s.trim()).filter(Boolean),
                                model: form.model,
                                mode: form.mode,
                              });
                            }}
                            className="px-4 py-2 bg-[#C9A84C] text-[#080808] text-[10px] tracking-[2px] uppercase font-semibold hover:bg-[#E8CB7A] transition-colors flex items-center gap-2"
                          >
                            <Save className="w-3.5 h-3.5" /> Save Config
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: QUALITY AUDIT ─── */}
        {activeTab === "audit" && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase mb-6">Legitimacy & Quality Audit</h3>
              <div className="flex flex-wrap gap-3 mb-6">
                <button onClick={() => handleAudit("all")} disabled={auditLoading} className="px-4 py-2 bg-[#C9A84C] text-[#080808] text-[10px] tracking-[2px] uppercase font-semibold hover:bg-[#E8CB7A] transition-colors disabled:opacity-40 flex items-center gap-2">
                  {auditLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BarChart3 className="w-3.5 h-3.5" />}
                  Audit All
                </button>
                <button onClick={() => handleAudit("appraisal")} disabled={auditLoading} className="px-4 py-2 border border-[#C9A84C]/30 text-[#C9A84C] text-[10px] tracking-[2px] uppercase hover:bg-[#C9A84C]/10 transition-colors disabled:opacity-40">
                  Appraisal Only
                </button>
                <button onClick={() => handleAudit("buyer_finder")} disabled={auditLoading} className="px-4 py-2 border border-[#C9A84C]/30 text-[#C9A84C] text-[10px] tracking-[2px] uppercase hover:bg-[#C9A84C]/10 transition-colors disabled:opacity-40">
                  Buyer Finder Only
                </button>
              </div>

              {auditResult && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-[#1E1E1E] border border-[#C9A84C]/10">
                    <div className={`text-2xl font-cinzel font-bold ${auditResult.overallLegitimacy >= 80 ? "text-emerald-400" : auditResult.overallLegitimacy >= 50 ? "text-amber-400" : "text-red-400"}`}>
                      {auditResult.overallLegitimacy}%
                    </div>
                    <div>
                      <div className="text-xs text-[#F5EED8]">Overall Legitimacy Score</div>
                      <div className="text-[10px] text-[#8A6E2F]">{auditResult.timestamp}</div>
                    </div>
                  </div>

                  {auditResult.results?.appraisal && (
                    <div className="p-4 bg-[#1E1E1E] border border-[#C9A84C]/10">
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="w-4 h-4 text-[#C9A84C]" />
                        <span className="text-xs text-[#F5EED8] font-medium">AI Appraisal Audit</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        <QuickStat label="Cycles" value={auditResult.results.appraisal.totalCycles} />
                        <QuickStat label="Pass Rate" value={`${auditResult.results.appraisal.passRate}%`} />
                        <QuickStat label="Verified" value={auditResult.results.appraisal.verified} />
                        <QuickStat label="Fake Flags" value={auditResult.results.appraisal.fakeComparableFlags} color={auditResult.results.appraisal.fakeComparableFlags > 0 ? "text-red-400" : "text-emerald-400"} />
                      </div>
                      {auditResult.results.appraisal.issues.length > 0 && (
                        <div className="space-y-1">
                          {auditResult.results.appraisal.issues.map((issue: string, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-[10px] text-red-400">
                              <XCircle className="w-3 h-3" /> {issue}
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-[10px] text-[#8A6E2F] mt-2">{auditResult.results.appraisal.recommendation}</p>
                    </div>
                  )}

                  {auditResult.results?.buyerFinder && (
                    <div className="p-4 bg-[#1E1E1E] border border-[#C9A84C]/10">
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquare className="w-4 h-4 text-[#C9A84C]" />
                        <span className="text-xs text-[#F5EED8] font-medium">Buyer Finder Audit</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        <QuickStat label="Cycles" value={auditResult.results.buyerFinder.totalCycles} />
                        <QuickStat label="Pass Rate" value={`${auditResult.results.buyerFinder.passRate}%`} />
                        <QuickStat label="Verified" value={auditResult.results.buyerFinder.verified} />
                        <QuickStat label="Fake Flags" value={auditResult.results.buyerFinder.fakeLeadFlags} color={auditResult.results.buyerFinder.fakeLeadFlags > 0 ? "text-red-400" : "text-emerald-400"} />
                      </div>
                      {auditResult.results.buyerFinder.issues.length > 0 && (
                        <div className="space-y-1">
                          {auditResult.results.buyerFinder.issues.map((issue: string, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-[10px] text-red-400">
                              <XCircle className="w-3 h-3" /> {issue}
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-[10px] text-[#8A6E2F] mt-2">{auditResult.results.buyerFinder.recommendation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: PARTNERSHIPS ─── */}
        {activeTab === "partners" && (
          <div className="space-y-6">
            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase mb-4">Partnership Outreach</h3>
              <p className="text-xs text-[#8A6E2F] mb-4">
                Generate AI-targeted partnership outreach to complementary businesses and respectful competitor engagement.
              </p>
              <div className="flex gap-3 mb-4">
                <input
                  value={partnerIndustry}
                  onChange={(e) => setPartnerIndustry(e.target.value)}
                  placeholder="Industry (e.g., luxury watches, fine art galleries)"
                  className="flex-1 bg-[#1E1E1E] border border-[#C9A84C]/20 text-[#F5EED8] text-sm py-3 px-4 outline-none focus:border-[#C9A84C]"
                />
                <button
                  onClick={() => partnerIndustry && generatePartners.mutate({ industry: partnerIndustry, count: 5 })}
                  disabled={generatePartners.isPending || !partnerIndustry}
                  className="px-4 py-2 bg-[#C9A84C] text-[#080808] text-[10px] tracking-[2px] uppercase font-semibold hover:bg-[#E8CB7A] transition-colors disabled:opacity-40 flex items-center gap-2"
                >
                  {generatePartners.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Generate Targets
                </button>
              </div>
              {generatePartners.data && (
                <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-400">
                  Generated {generatePartners.data.generated} partnership targets in {partnerIndustry}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: WORKFLOWS ─── */}
        {activeTab === "workflows" && (
          <div className="space-y-6">
            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase mb-4">AI Workflow Generator</h3>
              <p className="text-xs text-[#8A6E2F] mb-4">
                Describe a business goal and the AI will design an inter-agent workflow with step-by-step task delegation.
              </p>
              <div className="flex gap-3 mb-4">
                <input
                  value={workflowGoal}
                  onChange={(e) => setWorkflowGoal(e.target.value)}
                  placeholder="e.g., Launch a new vintage watch category with 10 listings, full verification, and targeted outreach..."
                  className="flex-1 bg-[#1E1E1E] border border-[#C9A84C]/20 text-[#F5EED8] text-sm py-3 px-4 outline-none focus:border-[#C9A84C]"
                />
                <button
                  onClick={() => workflowGoal && generateWorkflow.mutate({ goal: workflowGoal })}
                  disabled={generateWorkflow.isPending || !workflowGoal}
                  className="px-4 py-2 bg-[#C9A84C] text-[#080808] text-[10px] tracking-[2px] uppercase font-semibold hover:bg-[#E8CB7A] transition-colors disabled:opacity-40 flex items-center gap-2"
                >
                  {generateWorkflow.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  Generate Workflow
                </button>
              </div>
              {generateWorkflow.data?.success && (
                <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-400 mb-4">
                  Workflow <code>{generateWorkflow.data.workflowId}</code> created with {generateWorkflow.data.plan?.steps?.length ?? 0} steps
                </div>
              )}
            </div>

            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase mb-4">Active Workflows</h3>
              <div className="space-y-2">
                {(workflows ?? []).map((wf) => (
                  <div key={wf.workflowId} className="flex items-center justify-between p-3 bg-[#1E1E1E] border border-[#C9A84C]/10">
                    <div>
                      <div className="text-xs text-[#F5EED8] font-medium">{wf.title}</div>
                      <div className="text-[10px] text-[#8A6E2F]">
                        {wf.workflowId} · Step {wf.currentStep}/{wf.totalSteps} · {wf.status}
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase ${
                      wf.status === "active" ? "bg-emerald-900/30 text-emerald-400" :
                      wf.status === "paused" ? "bg-amber-900/30 text-amber-400" :
                      wf.status === "completed" ? "bg-blue-900/30 text-blue-400" :
                      "bg-red-900/30 text-red-400"
                    }`}>
                      {wf.status}
                    </span>
                  </div>
                ))}
                {(!workflows || workflows.length === 0) && (
                  <p className="text-xs text-[#8A6E2F] text-center py-4">No workflows yet. Generate one above.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: INTERNET RESEARCH ─── */}
        {activeTab === "research" && (
          <div className="space-y-6">
            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase">BOXED-IN Internet Research</h3>
                <span className="text-[9px] tracking-[1px] uppercase px-2 py-1 bg-emerald-950/30 text-emerald-400 border border-emerald-500/20">BOX ENFORCED</span>
              </div>
              <p className="text-[10px] text-[#8A6E2F] mb-4 leading-relaxed">
                Agents search the internet for REAL buyer interest and social media posts. STRICTLY LIMITED to finding buyers and relevant discussions. All findings pass through BOX enforcement before storage.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <StatBox label="Total Findings" value={researchStats?.totalFindings ?? 0} color="text-[#C9A84C]" />
                <StatBox label="Buying Signals" value={researchStats?.buyingSignals ?? 0} color="text-emerald-400" />
                <StatBox label="Sessions" value={researchStats?.completedSessions ?? 0} color="text-blue-400" />
                <StatBox label="Blocked by Box" value={researchStats?.boundaryViolations ?? 0} color="text-red-400" />
              </div>

              <div className="flex gap-2 mb-4">
                <input
                  value={researchItem}
                  onChange={(e) => setResearchItem(e.target.value)}
                  placeholder="Item name (e.g., Rolex Submariner 16800)"
                  className="flex-1 bg-[#1E1E1E] border border-[#C9A84C]/20 px-3 py-2 text-xs text-[#F5EED8] placeholder-[#8A6E2F]/50 focus:border-[#C9A84C] outline-none"
                />
                <input
                  value={researchCategory}
                  onChange={(e) => setResearchCategory(e.target.value)}
                  placeholder="Category (optional)"
                  className="w-40 bg-[#1E1E1E] border border-[#C9A84C]/20 px-3 py-2 text-xs text-[#F5EED8] placeholder-[#8A6E2F]/50 focus:border-[#C9A84C] outline-none"
                />
                <button
                  onClick={() => {
                    if (!researchItem.trim()) return;
                    startResearch.mutate({ itemName: researchItem, category: researchCategory || undefined });
                  }}
                  disabled={startResearch.isPending || !researchItem.trim()}
                  className="px-4 py-2 bg-[#C9A84C] text-[#080808] text-[10px] tracking-[2px] uppercase font-bold hover:bg-[#E8CB7A] transition-colors disabled:opacity-30"
                >
                  {startResearch.isPending ? "Searching..." : "Start Research"}
                </button>
              </div>
              {startResearch.data && (
                <div className={`p-3 border text-xs mb-4 ${startResearch.data.success ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-400" : "bg-red-950/20 border-red-500/20 text-red-400"}`}>
                  {startResearch.data.summary} · {startResearch.data.stored} findings stored · {startResearch.data.boundaryViolations} blocked
                </div>
              )}
            </div>

            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase mb-4">Research Sessions</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {(researchSessions ?? []).map((rs) => (
                  <div key={rs.sessionId} className="flex items-center justify-between p-3 bg-[#1E1E1E] border border-[#C9A84C]/10">
                    <div>
                      <div className="text-xs text-[#F5EED8] font-medium">{rs.itemName}</div>
                      <div className="text-[10px] text-[#8A6E2F]">
                        {rs.sessionId} · {rs.totalFindings} findings · {rs.buyingSignals} buying signals
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase ${
                      rs.status === "completed" ? "bg-emerald-900/30 text-emerald-400" :
                      rs.status === "running" ? "bg-amber-900/30 text-amber-400" :
                      "bg-red-900/30 text-red-400"
                    }`}>
                      {rs.status}
                    </span>
                  </div>
                ))}
                {(!researchSessions || researchSessions.length === 0) && (
                  <p className="text-xs text-[#8A6E2F] text-center py-4">No research sessions yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: AGENT CHAT ─── */}
        {activeTab === "agentchat" && (
          <div className="space-y-6">
            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase">Inter-Agent Communication</h3>
                <span className="text-[9px] tracking-[1px] uppercase px-2 py-1 bg-emerald-950/30 text-emerald-400 border border-emerald-500/20">BOXED IN</span>
              </div>
              <p className="text-[10px] text-[#8A6E2F] mb-4 leading-relaxed">
                Agents communicate findings, ask questions, and build on each other's work. ALL messages pass through BOX enforcement — off-topic messages are automatically blocked.
              </p>

              <div className="flex gap-2 mb-4">
                <select
                  value={chatFromAgent}
                  onChange={(e) => setChatFromAgent(e.target.value)}
                  className="w-36 bg-[#1E1E1E] border border-[#C9A84C]/20 px-3 py-2 text-xs text-[#F5EED8] outline-none"
                >
                  <option value="research">Research</option>
                  <option value="outreach">Outreach</option>
                  <option value="social">Social</option>
                  <option value="content">Content</option>
                  <option value="appraiser">Appraiser</option>
                  <option value="pricing">Pricing</option>
                </select>
                <input
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Message (buyer-finding topics only)..."
                  className="flex-1 bg-[#1E1E1E] border border-[#C9A84C]/20 px-3 py-2 text-xs text-[#F5EED8] placeholder-[#8A6E2F]/50 focus:border-[#C9A84C] outline-none"
                />
                <button
                  onClick={() => {
                    if (!chatMessage.trim()) return;
                    agentDiscuss.mutate({
                      sessionId: "manual",
                      fromAgent: chatFromAgent as any,
                      message: chatMessage,
                    });
                    setChatMessage("");
                  }}
                  disabled={agentDiscuss.isPending || !chatMessage.trim()}
                  className="px-4 py-2 bg-[#C9A84C] text-[#080808] text-[10px] tracking-[2px] uppercase font-bold hover:bg-[#E8CB7A] transition-colors disabled:opacity-30"
                >
                  {agentDiscuss.isPending ? "Sending..." : "Send"}
                </button>
              </div>
              {agentDiscuss.data?.blocked && (
                <div className="p-3 bg-red-950/20 border border-red-500/20 text-xs text-red-400 mb-4">
                  BLOCKED by BOX enforcement: {agentDiscuss.data.reason}
                </div>
              )}
            </div>

            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase mb-4">Agent Conversation Log</h3>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {(conversations ?? []).map((conv, i) => (
                  <div key={i} className={`p-3 border ${conv.topicVerified ? "bg-[#1E1E1E] border-[#C9A84C]/10" : "bg-red-950/10 border-red-500/20"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-[#C9A84C]">{conv.fromAgent}</span>
                      <span className="text-[9px] text-[#8A6E2F]">→ {conv.toAgent}</span>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase ${
                        conv.messageType === "alert" ? "bg-red-900/30 text-red-400" :
                        conv.messageType === "finding" ? "bg-blue-900/30 text-blue-400" :
                        conv.messageType === "insight" ? "bg-emerald-900/30 text-emerald-400" :
                        "bg-[#C9A84C]/10 text-[#C8BC98]"
                      }`}>
                        {conv.messageType}
                      </span>
                      {conv.topicVerified && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                    </div>
                    <p className="text-[11px] text-[#F5EED8] leading-relaxed">{conv.message}</p>
                    {conv.safetyScore !== 100 && (
                      <div className="text-[9px] text-red-400 mt-1">Safety Score: {conv.safetyScore}</div>
                    )}
                  </div>
                ))}
                {(!conversations || conversations.length === 0) && (
                  <p className="text-xs text-[#8A6E2F] text-center py-4">No agent conversations yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: AUTONOMOUS OUTREACH ENGINE ─── */}
        {activeTab === "outreach" && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase">24-Hour Autonomous Outreach</h3>
                <span className="text-[9px] tracking-[1px] uppercase px-2 py-1 bg-emerald-950/30 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <Bot className="w-3 h-3" /> ENGINE STANDBY
                </span>
              </div>
              <p className="text-[10px] text-[#8A6E2F] mb-4 leading-relaxed">
                The autonomous outreach engine runs every 24 hours, scanning high-value listings and appraisals to generate personalized cold outreach. Each message passes through the zero-hallucination guard before sending.
              </p>

              {/* Status */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <StatBox label="Campaigns" value={autoStats?.totalCampaigns ?? 0} color="text-[#C9A84C]" />
                <StatBox label="Messages Sent" value={autoStats?.totalMessagesSent ?? 0} color="text-emerald-400" />
                <StatBox label="Blocked by Guard" value={autoStats?.blockedByGuard ?? 0} color="text-red-400" />
                <StatBox label="Avg Confidence" value={`${autoStats?.avgConfidence ?? 0}%`} color="text-blue-400" />
              </div>

              <div className="text-[10px] text-[#8A6E2F] mb-4 space-y-1">
                <div>Last run: {autoStatus?.lastRunAt ? new Date(autoStatus.lastRunAt).toLocaleString() : "Never"}</div>
                <div>Next scheduled: {autoStatus?.nextRun ? new Date(autoStatus.nextRun).toLocaleString() : "Not scheduled"}</div>
                <div>Sent last 24h: {autoStatus?.sentLast24h ?? 0}</div>
              </div>

              {/* Run Now */}
              <div className="border-t border-[#C9A84C]/10 pt-4 mb-4">
                <h4 className="text-[10px] tracking-[2px] uppercase text-[#C9A84C] mb-3">Run Outreach Now</h4>
                <div className="flex gap-2 mb-3">
                  <input
                    value={autoItem}
                    onChange={(e) => setAutoItem(e.target.value)}
                    placeholder="Item name (optional — leave blank for full round)"
                    className="flex-1 bg-[#1E1E1E] border border-[#C9A84C]/20 px-3 py-2 text-xs text-[#F5EED8] placeholder-[#8A6E2F]/50 focus:border-[#C9A84C] outline-none"
                  />
                  <input
                    value={autoCategory}
                    onChange={(e) => setAutoCategory(e.target.value)}
                    placeholder="Category"
                    className="w-32 bg-[#1E1E1E] border border-[#C9A84C]/20 px-3 py-2 text-xs text-[#F5EED8] placeholder-[#8A6E2F]/50 focus:border-[#C9A84C] outline-none"
                  />
                  <button
                    onClick={() => runAutonomous.mutate(autoItem ? { itemName: autoItem, category: autoCategory || undefined } : undefined)}
                    disabled={runAutonomous.isPending}
                    className="px-4 py-2 bg-[#C9A84C] text-[#080808] text-[10px] tracking-[2px] uppercase font-bold hover:bg-[#E8CB7A] transition-colors disabled:opacity-30 flex items-center gap-2"
                  >
                    {runAutonomous.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                    {runAutonomous.isPending ? "Running..." : "RUN NOW"}
                  </button>
                </div>
                {runAutonomous.data && (
                  <div className={`p-3 border text-xs ${runAutonomous.data.success ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-400" : "bg-red-950/20 border-red-500/20 text-red-400"}`}>
                    {runAutonomous.data.success
                      ? `Outreach complete: ${runAutonomous.data.messagesSent} sent, ${runAutonomous.data.blockedByGuard || 0} blocked by guard`
                      : "Failed — check server logs for details"}
                  </div>
                )}
              </div>

              {/* Manual Trigger */}
              <div className="border-t border-[#C9A84C]/10 pt-4">
                <h4 className="text-[10px] tracking-[2px] uppercase text-[#C9A84C] mb-3">Simulate User Action Trigger</h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  <select
                    value={triggerType}
                    onChange={(e) => setTriggerType(e.target.value as any)}
                    className="bg-[#1E1E1E] border border-[#C9A84C]/20 px-3 py-2 text-xs text-[#F5EED8] outline-none"
                  >
                    <option value="sell">Sell</option>
                    <option value="appraise">Appraise</option>
                    <option value="verify">Verify</option>
                    <option value="tokenize">Tokenize</option>
                  </select>
                  <input
                    value={triggerItem}
                    onChange={(e) => setTriggerItem(e.target.value)}
                    placeholder="Item name"
                    className="flex-1 min-w-0 bg-[#1E1E1E] border border-[#C9A84C]/20 px-3 py-2 text-xs text-[#F5EED8] placeholder-[#8A6E2F]/50 focus:border-[#C9A84C] outline-none"
                  />
                  <input
                    value={triggerCategory}
                    onChange={(e) => setTriggerCategory(e.target.value)}
                    placeholder="Category"
                    className="w-28 bg-[#1E1E1E] border border-[#C9A84C]/20 px-3 py-2 text-xs text-[#F5EED8] placeholder-[#8A6E2F]/50 focus:border-[#C9A84C] outline-none"
                  />
                  <input
                    value={triggerValue}
                    onChange={(e) => setTriggerValue(e.target.value)}
                    placeholder="Value $"
                    className="w-24 bg-[#1E1E1E] border border-[#C9A84C]/20 px-3 py-2 text-xs text-[#F5EED8] placeholder-[#8A6E2F]/50 focus:border-[#C9A84C] outline-none"
                  />
                  <button
                    onClick={() => {
                      if (!triggerItem.trim()) return;
                      triggerAction.mutate({
                        actionType: triggerType,
                        itemName: triggerItem,
                        category: triggerCategory || undefined,
                        value: triggerValue ? parseFloat(triggerValue) : undefined,
                      });
                    }}
                    disabled={triggerAction.isPending || !triggerItem.trim()}
                    className="px-4 py-2 bg-[#C9A84C]/20 border border-[#C9A84C]/30 text-[#C9A84C] text-[10px] tracking-[2px] uppercase font-bold hover:bg-[#C9A84C]/30 transition-colors disabled:opacity-30"
                  >
                    {triggerAction.isPending ? "Dispatching..." : "Dispatch Agents"}
                  </button>
                </div>
                {triggerAction.data && (
                  <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-400">
                    Agents dispatched for {triggerAction.data.actionType}: {triggerAction.data.messagesSent} messages sent, {triggerAction.data.blockedByGuard} blocked
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: COMMAND LIST ─── */}
        {activeTab === "commands" && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase mb-4">Autonomous Command Reference</h3>
              <p className="text-[10px] text-[#8A6E2F] mb-6">Only ratchetkrewelabs@gmail.com can execute these commands.</p>

              <div className="space-y-4">
                {/* OUTREACH */}
                <CommandGroup title="OUTREACH — Cold outreach engine" commands={[
                  ["OUTREACH RUN NOW", "Immediately run a full outreach round"],
                  ["OUTREACH RUN [item]", "Run outreach for a specific item"],
                  ["OUTREACH STATUS", "Show engine status and schedule"],
                  ["OUTREACH STATS", "Display aggregate statistics"],
                  ["OUTREACH BLOCKED", "Show messages blocked by guard"],
                ]} />

                {/* RESEARCH */}
                <CommandGroup title="RESEARCH — Internet research & buyer discovery" commands={[
                  ["RESEARCH START [item]", "Begin internet research for an item"],
                  ["RESEARCH BUYERS [item]", "Show buying-signal findings only"],
                  ["RESEARCH REDDIT [item]", "Search Reddit for discussions"],
                  ["RESEARCH X [item]", "Search X/Twitter for posts"],
                ]} />

                {/* AGENT */}
                <CommandGroup title="AGENT — Individual agent control" commands={[
                  ["AGENT STATUS", "Show all agents' status and health"],
                  ["AGENT STATUS [name]", "Show specific agent status"],
                  ["AGENT TOGGLE [name] [on/off]", "Activate/deactivate an agent"],
                  ["AGENT PROMPT [name] [msg]", "Send direct prompt to an agent"],
                  ["AGENT HEALTH", "Run health check on all agents"],
                ]} />

                {/* FLEET */}
                <CommandGroup title="FLEET — Fleet-wide operations" commands={[
                  ["FLEET OVERVIEW", "Complete fleet dashboard"],
                  ["FLEET CYCLES", "Show recent execution cycles"],
                  ["FLEET STATS", "Aggregate statistics"],
                ]} />

                {/* SAMSON */}
                <CommandGroup title="SAMSON — Emergency kill switch" commands={[
                  ["SAMSON ARM", "FREEZE all agent activity"],
                  ["SAMSON DISARM", "Resume all operations"],
                  ["SAMSON STATUS", "Check kill switch status"],
                ]} />

                {/* AUDIT */}
                <CommandGroup title="AUDIT — Quality & legitimacy" commands={[
                  ["AUDIT APPRAISAL", "Legitimacy audit on appraisals"],
                  ["AUDIT OUTREACH", "Check outreach for hallucinations"],
                  ["AUDIT HALLUCINATION", "Full hallucination test"],
                  ["AUDIT FULL", "Complete system audit"],
                ]} />

                {/* TRIGGER */}
                <CommandGroup title="TRIGGER — Simulate user actions" commands={[
                  ["TRIGGER SELL [item] [cat] [val]", "Simulate sell — dispatch agents"],
                  ["TRIGGER APPRAISE [item] [cat] [val]", "Simulate appraisal — dispatch agents"],
                  ["TRIGGER VERIFY [item] [cat]", "Simulate verification — dispatch agents"],
                  ["TRIGGER TOKENIZE [item] [cat] [val]", "Simulate tokenization — dispatch agents"],
                ]} />

                {/* CHAT */}
                <CommandGroup title="CHAT — Inter-agent communication" commands={[
                  ["CHAT [agent] [message]", "Send message from agent to fleet"],
                  ["CHAT LOGS", "Show conversation history"],
                ]} />
              </div>

              <div className="mt-6 border-t border-[#C9A84C]/10 pt-4">
                <h4 className="text-[10px] tracking-[2px] uppercase text-[#C9A84C] mb-3">Blank Prompt Templates</h4>
                <div className="space-y-2">
                  {[
                    { name: "Custom Outreach", template: "OUTREACH RUN [ITEM] --target=[INDUSTRY] --count=[N]" },
                    { name: "Deep Research", template: "RESEARCH START [ITEM] --platforms=reddit,x --depth=deep" },
                    { name: "Agent Workflow", template: "WORKFLOW CREATE \"[DESCRIPTION]\" --agents=[A,B,C]" },
                    { name: "Partnership Blast", template: "PARTNER GENERATE [INDUSTRY] [COUNT] --region=[R]" },
                    { name: "Emergency Stop", template: "SAMSON ARM --reason=\"[REASON]\"" },
                    { name: "Custom Agent", template: "AGENT PROMPT [AGENT] \"[INSTRUCTIONS]\"" },
                    { name: "Action Trigger", template: "TRIGGER [sell/appraise/verify/tokenize] \"[ITEM]\" [CAT] [VAL]" },
                  ].map((tpl) => (
                    <div key={tpl.name} className="flex items-start gap-3 p-2 bg-[#1E1E1E] border border-[#C9A84C]/10">
                      <span className="text-[10px] text-[#C9A84C] font-bold min-w-[100px]">{tpl.name}</span>
                      <code className="text-[10px] text-[#8A6E2F] font-mono">{tpl.template}</code>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: OVERRIDE BOX (full page view) ─── */}
        {activeTab === "override" && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Admin Prompt Override
                </h3>
                <span className="text-[9px] tracking-[1px] uppercase px-2 py-1 bg-red-950/30 text-red-400 border border-red-500/20">
                  PRIORITY 100 — MAXIMUM
                </span>
              </div>
              <p className="text-[10px] text-[#8A6E2F] mb-4">
                When you type a command here, the AI routes it to the correct agent and all other tasks are dropped. This is your direct line to the fleet.
              </p>
              <div className="flex gap-2 mb-4">
                <input
                  value={adminPromptText}
                  onChange={(e) => setAdminPromptText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && adminPromptText.trim()) { submitAdminPrompt.mutate({ promptText: adminPromptText }); setAdminPromptText(""); }}}
                  placeholder="Enter any command..."
                  className="flex-1 bg-[#1E1E1E] border border-[#C9A84C]/30 px-4 py-3 text-sm text-[#F5EED8] placeholder-[#8A6E2F]/50 focus:border-[#C9A84C] outline-none"
                />
                <button
                  onClick={() => { if (!adminPromptText.trim()) return; submitAdminPrompt.mutate({ promptText: adminPromptText }); setAdminPromptText(""); }}
                  disabled={submitAdminPrompt.isPending || !adminPromptText.trim()}
                  className="px-6 py-3 bg-[#C9A84C] text-[#080808] text-[10px] tracking-[2px] uppercase font-bold hover:bg-[#E8CB7A] transition-colors disabled:opacity-30 flex items-center gap-2"
                >
                  {submitAdminPrompt.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  {submitAdminPrompt.isPending ? "EXECUTING..." : "EXECUTE"}
                </button>
              </div>
              {submitAdminPrompt.data && (
                <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-400 mb-4">
                  <strong>Routed to:</strong> {submitAdminPrompt.data.routedTo}<br/>
                  <strong>Action:</strong> {submitAdminPrompt.data.action}<br/>
                  {submitAdminPrompt.data.interpretation}
                </div>
              )}
            </div>

            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <QuickActionButton icon={<ShieldCheck className="w-4 h-4" />} label="Run Full Audit" onClick={() => { setAdminPromptText("Run full system audit"); }} />
                <QuickActionButton icon={<Zap className="w-4 h-4" />} label="Outreach Now" onClick={() => { setAdminPromptText("OUTREACH RUN NOW"); }} />
                <QuickActionButton icon={<Lock className="w-4 h-4" />} label="Arm Samson" onClick={() => { setAdminPromptText("SAMSON ARM"); }} />
                <QuickActionButton icon={<Unlock className="w-4 h-4" />} label="Disarm Samson" onClick={() => { setAdminPromptText("SAMSON DISARM"); }} />
                <QuickActionButton icon={<Activity className="w-4 h-4" />} label="Fleet Status" onClick={() => { setAdminPromptText("FLEET OVERVIEW"); }} />
                <QuickActionButton icon={<UserCheck className="w-4 h-4" />} label="Police Sweep" onClick={() => { setAdminPromptText("Run police sweep on all agents"); }} />
                <QuickActionButton icon={<BarChart3 className="w-4 h-4" />} label="Hallucination Test" onClick={() => { setAdminPromptText("AUDIT HALLUCINATION"); }} />
                <QuickActionButton
                  icon={<Eye className="w-4 h-4" />}
                  label="Scan Recent Cycles"
                  onClick={() => {
                    setAuditLoading(true);
                    auditFleetHallucinations.mutate(
                      { perAgent: 10 },
                      { onSettled: () => setAuditLoading(false) },
                    );
                  }}
                />
                <QuickActionButton icon={<FileText className="w-4 h-4" />} label="Daily Report" onClick={() => { setAdminPromptText("Generate daily report"); }} />
                <QuickActionButton icon={<Globe className="w-4 h-4" />} label="Research Item" onClick={() => { setAdminPromptText("RESEARCH START [item]"); }} />
              </div>
            </div>

            {auditLoading && (
              <div className="bg-[#161616] border border-[#C9A84C]/15 p-4 text-[10px] text-[#C8BC98] flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#C9A84C]" /> Scanning recent agent cycles...
              </div>
            )}

            {auditResult?.results && (
              <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
                <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase mb-4">Fleet Hallucination Scan</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <QuickStat label="Cycles Scanned" value={auditResult.totals?.cyclesScanned ?? 0} />
                  <QuickStat label="Flagged Cycles" value={auditResult.totals?.hallucinationCycles ?? 0} color="text-amber-400" />
                  <QuickStat label="Flagged Claims" value={auditResult.totals?.hallucinationClaims ?? 0} color="text-red-400" />
                  <QuickStat label="Per Agent" value={auditResult.perAgent ?? 0} />
                </div>
                <div className="space-y-2">
                  {auditResult.results.map((r: any) => (
                    <div key={r.projectId} className="p-3 bg-[#1E1E1E] border border-[#C9A84C]/10">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#F5EED8] font-bold capitalize">{r.projectId}</span>
                        <span className="text-[9px] tracking-[2px] uppercase text-[#8A6E2F]">
                          risk: {r.risk} · {r.hallucinationClaims} claim(s)
                        </span>
                      </div>
                      {r.sample?.length > 0 && (
                        <div className="mt-2 text-[10px] text-[#C8BC98]">
                          Sample: {r.sample[0]?.notes?.[0] ?? "flagged output"}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pendingPrompts && pendingPrompts.length > 0 && (
              <div className="bg-[#161616] border border-amber-500/20 p-6">
                <h3 className="font-cinzel text-xs tracking-[3px] text-amber-400 uppercase mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Pending Admin Commands
                </h3>
                <div className="space-y-2">
                  {pendingPrompts.map((p) => (
                    <div key={p.promptId} className="flex items-center justify-between p-2 bg-[#1E1E1E] border border-amber-500/10">
                      <span className="text-[10px] text-[#F5EED8]">{p.promptText}</span>
                      <span className="text-[9px] text-amber-400 uppercase">{p.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: SELF-AUDIT ─── */}
        {activeTab === "selfaudit" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> 24/7 Self-Auditing Agent
                </h3>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] tracking-[1px] uppercase px-2 py-1 border ${auditStats?.uptimeStatus === "HEALTHY" ? "bg-emerald-950/30 text-emerald-400 border-emerald-500/20" : "bg-amber-950/30 text-amber-400 border-amber-500/20"}`}>
                    {auditStats?.uptimeStatus || "NOT_STARTED"}
                  </span>
                  <button
                    onClick={() => runSelfAudit.mutate({ types: ["all"] })}
                    disabled={runSelfAudit.isPending}
                    className="px-3 py-1.5 bg-[#C9A84C] text-[#080808] text-[9px] tracking-[2px] uppercase font-bold hover:bg-[#E8CB7A] transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {runSelfAudit.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                    {runSelfAudit.isPending ? "Running..." : "RUN AUDIT"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <StatBox label="Total Checks" value={auditStats?.totalChecks ?? 0} color="text-[#C9A84C]" />
                <StatBox label="Auto-Fixed" value={auditStats?.autoFixed ?? 0} color="text-emerald-400" />
                <StatBox label="Needs Review" value={auditStats?.needsReview ?? 0} color="text-red-400" />
                <StatBox label="Critical" value={auditStats?.bySeverity?.critical ?? 0} color="text-red-500" />
              </div>

              {runSelfAudit.data && (
                <div className={`p-3 border text-xs mb-4 ${runSelfAudit.data.criticalIssues > 0 ? "bg-red-950/20 border-red-500/20 text-red-400" : "bg-emerald-950/20 border-emerald-500/20 text-emerald-400"}`}>
                  Audit complete: {runSelfAudit.data.totalIssues} findings, {runSelfAudit.data.autoFixed} auto-fixed, {runSelfAudit.data.criticalIssues} critical
                </div>
              )}
            </div>

            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase mb-4">Security Hardening Queue</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(hardening ?? []).filter((h) => !h.wasImplemented).map((h) => (
                  <div key={h.hardeningId} className="p-3 bg-[#1E1E1E] border border-[#C9A84C]/10">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-[#F5EED8]">{h.checkType}</span>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase ${h.severity === "warning" ? "bg-amber-900/30 text-amber-400" : "bg-blue-900/30 text-blue-400"}`}>{h.severity}</span>
                    </div>
                    <p className="text-[10px] text-[#8A6E2F] mb-1">{h.finding}</p>
                    <p className="text-[9px] text-[#C9A84C]">{h.recommendation}</p>
                    <button
                      onClick={() => implementHardening.mutate({ hardeningId: h.hardeningId })}
                      className="mt-2 px-2 py-1 bg-emerald-900/30 border border-emerald-500/20 text-emerald-400 text-[8px] tracking-[1px] uppercase hover:bg-emerald-900/50 transition-colors"
                    >
                      Mark Implemented
                    </button>
                  </div>
                ))}
                {(!hardening || hardening.filter((h) => !h.wasImplemented).length === 0) && (
                  <p className="text-xs text-[#8A6E2F] text-center py-4">No pending hardening items.</p>
                )}
              </div>
            </div>

            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase mb-4">Recent Audit Findings</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(auditLogs ?? []).map((log) => (
                  <div key={log.auditId} className={`p-2 border ${log.severity === "critical" ? "bg-red-950/10 border-red-500/20" : log.severity === "error" ? "bg-amber-950/10 border-amber-500/20" : "bg-[#1E1E1E] border-[#C9A84C]/5"}`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${log.severity === "critical" ? "bg-red-500" : log.severity === "error" ? "bg-amber-500" : log.severity === "warning" ? "bg-yellow-500" : "bg-emerald-500"}`} />
                      <span className="text-[10px] font-bold text-[#F5EED8]">{log.checkType}</span>
                      {log.autoFixed && <span className="text-[8px] text-emerald-400">(auto-fixed)</span>}
                      {log.requiresHumanReview && <span className="text-[8px] text-red-400">(needs review)</span>}
                    </div>
                    <p className="text-[9px] text-[#8A6E2F] ml-4">{log.finding}</p>
                  </div>
                ))}
                {(!auditLogs || auditLogs.length === 0) && (
                  <p className="text-xs text-[#8A6E2F] text-center py-4">No audit findings yet. Run an audit to begin.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: AGENT POLICE ─── */}
        {activeTab === "police" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase flex items-center gap-2">
                  <UserCheck className="w-4 h-4" /> Inter-Agent Police System
                </h3>
                <button
                  onClick={() => policeSweep.mutate({})}
                  disabled={policeSweep.isPending}
                  className="px-3 py-1.5 bg-[#C9A84C] text-[#080808] text-[9px] tracking-[2px] uppercase font-bold hover:bg-[#E8CB7A] transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {policeSweep.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                  {policeSweep.isPending ? "Sweeping..." : "RUN SWEEP"}
                </button>
              </div>
              <p className="text-[10px] text-[#8A6E2F] mb-4">
                Agents cross-verify each other's outputs. No agent is above review. The police system catches hallucinations, scope drift, and boundary violations.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                <StatBox label="Total Checks" value={policeStats?.totalChecks ?? 0} color="text-[#C9A84C]" />
                <StatBox label="Passed" value={policeStats?.byVerdict?.pass ?? 0} color="text-emerald-400" />
                <StatBox label="Failed" value={policeStats?.byVerdict?.fail ?? 0} color="text-red-400" />
                <StatBox label="Warnings" value={policeStats?.byVerdict?.warning ?? 0} color="text-amber-400" />
                <StatBox label="Corrections" value={policeStats?.correctionsMade ?? 0} color="text-blue-400" />
              </div>

              {policeSweep.data && (
                <div className={`p-3 border text-xs mb-4 ${policeSweep.data.allClear ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-400" : "bg-red-950/20 border-red-500/20 text-red-400"}`}>
                  Sweep: {policeSweep.data.itemsChecked} checked, {policeSweep.data.totalFailed} failures, {policeSweep.data.allClear ? "ALL CLEAR" : "ISSUES FOUND"}
                </div>
              )}
            </div>

            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase mb-4">Agent Trust Scores</h3>
              <div className="space-y-2">
                {trustScores && Object.entries(trustScores).map(([agent, data]: [string, any]) => (
                  <div key={agent} className="flex items-center justify-between p-2 bg-[#1E1E1E] border border-[#C9A84C]/10">
                    <span className="text-[10px] text-[#F5EED8] font-bold capitalize">{agent}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-[#333] rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${data.score}%` }} />
                      </div>
                      <span className="text-[10px] text-emerald-400 w-8 text-right">{data.score}%</span>
                    </div>
                  </div>
                ))}
                {(!trustScores || Object.keys(trustScores).length === 0) && (
                  <p className="text-xs text-[#8A6E2F] text-center py-4">No trust scores yet. Run a sweep to generate them.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: ACCOUNTING / AUTO-BOOKS ─── */}
        {activeTab === "accounting" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> Auto-Books
                </h3>
                <button
                  onClick={() => reconcileAccounting.mutate()}
                  disabled={reconcileAccounting.isPending}
                  className="px-3 py-1.5 bg-[#C9A84C] text-[#080808] text-[9px] tracking-[2px] uppercase font-bold hover:bg-[#E8CB7A] transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {reconcileAccounting.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  {reconcileAccounting.isPending ? "Reconciling..." : "RECONCILE"}
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <StatBox label="Total Revenue" value={`$${(accountingSummary?.totalRevenue ?? 0).toFixed(2)}`} color="text-emerald-400" />
                <StatBox label="Total Costs" value={`$${(accountingSummary?.totalCosts ?? 0).toFixed(2)}`} color="text-red-400" />
                <StatBox label="Net Income" value={`$${(accountingSummary?.netIncome ?? 0).toFixed(2)}`} color="text-blue-400" />
                <StatBox label="Transactions" value={accountingSummary?.totalTransactions ?? 0} color="text-[#C9A84C]" />
              </div>

              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
                {accountingSummary?.byType && Object.entries(accountingSummary.byType).map(([type, count]: [string, any]) => (
                  <div key={type} className="bg-[#1E1E1E] border border-[#C9A84C]/10 p-2 text-center">
                    <div className="font-cinzel text-sm font-bold text-[#C9A84C]">{count}</div>
                    <div className="text-[8px] tracking-[1px] uppercase text-[#8A6E2F]">{type}</div>
                  </div>
                ))}
              </div>

              {reconcileAccounting.data && (
                <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-400">
                  Reconciled: {reconcileAccounting.data.salesLogged} sales logged, {reconcileAccounting.data.agentCostsLogged} agent costs logged
                </div>
              )}
            </div>

            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase mb-4">Recent Financial Activity</h3>
              <div className="space-y-2">
                {(accountingSummary?.recentActivity ?? []).map((act: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-[#1E1E1E] border border-[#C9A84C]/5">
                    <div>
                      <span className="text-[10px] text-[#F5EED8]">{act.description}</span>
                      <span className="text-[8px] text-[#8A6E2F] ml-2">{act.type}</span>
                    </div>
                    <span className={`text-[10px] font-bold ${(act.amount || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {(act.amount || 0) >= 0 ? "+" : ""}${Math.abs(act.amount || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
                {(!accountingSummary?.recentActivity || accountingSummary.recentActivity.length === 0) && (
                  <p className="text-xs text-[#8A6E2F] text-center py-4">No financial activity recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: DAILY REPORT ─── */}
        {activeTab === "dailyreport" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Daily 9PM Report
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] tracking-[1px] uppercase px-2 py-1 bg-blue-950/30 text-blue-400 border border-blue-500/20">
                    {reportStats?.totalReports ?? 0} reports generated
                  </span>
                  <button
                    onClick={() => generateDailyReport.mutate()}
                    disabled={generateDailyReport.isPending}
                    className="px-3 py-1.5 bg-[#C9A84C] text-[#080808] text-[9px] tracking-[2px] uppercase font-bold hover:bg-[#E8CB7A] transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {generateDailyReport.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                    {generateDailyReport.isPending ? "Generating..." : "GENERATE NOW"}
                  </button>
                </div>
              </div>

              {latestReport && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-[#8A6E2F]">Latest: {latestReport.reportDate}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded uppercase ${latestReport.status === "read" ? "bg-emerald-900/30 text-emerald-400" : "bg-amber-900/30 text-amber-400"}`}>
                      {latestReport.status}
                    </span>
                  </div>
                </div>
              )}

              {generateDailyReport.data && (
                <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-400 mb-4">
                  Report generated: {generateDailyReport.data.reportId}
                </div>
              )}
            </div>

            {latestReport?.fullReport && (
              <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase">Latest Report — {latestReport.reportDate}</h3>
                  {latestReport.status !== "read" && (
                    <button
                      onClick={() => markReportRead.mutate({ reportId: latestReport.reportId })}
                      className="px-3 py-1 bg-emerald-900/30 border border-emerald-500/20 text-emerald-400 text-[8px] tracking-[1px] uppercase hover:bg-emerald-900/50 transition-colors"
                    >
                      Mark as Read
                    </button>
                  )}
                </div>
                <div className="prose prose-invert prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-[11px] text-[#F5EED8] leading-relaxed font-sans">{latestReport.fullReport}</pre>
                </div>
              </div>
            )}

            {!latestReport && (
              <div className="bg-[#161616] border border-[#C9A84C]/15 p-6 text-center">
                <p className="text-xs text-[#8A6E2F]">No daily reports generated yet. Click "Generate Now" to create the first report.</p>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: DIFY GRAPH ENGINE ─── */}
        {activeTab === "dify" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase flex items-center gap-2">
                  <Workflow className="w-4 h-4" /> Dify Graph Workflow Engine
                </h3>
                <span className="text-[9px] tracking-[1px] uppercase px-2 py-1 bg-emerald-950/30 text-emerald-400 border border-emerald-500/20">ACTIVE</span>
              </div>
              <p className="text-[10px] text-[#8A6E2F] mb-4 leading-relaxed">
                Ported from <strong>langgenius/dify</strong>. Graph-based orchestration with parallel execution, hierarchical variable scoping, auto-scaling worker pool, and command processor for pause/resume/terminate.
              </p>

              {/* Worker Pool Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <StatBox label="Workers" value={difyStats?.pool?.currentWorkers ?? 2} color="text-[#C9A84C]" />
                <StatBox label="Running" value={difyStats?.pool?.running ?? 0} color="text-blue-400" />
                <StatBox label="Queued" value={difyStats?.pool?.queued ?? 0} color="text-amber-400" />
                <StatBox label="Max Scale" value={difyStats?.pool?.maxWorkers ?? 10} color="text-emerald-400" />
              </div>
            </div>

            {/* Workflow Launcher */}
            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase mb-4">Launch Graph Workflow</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[8px] tracking-[2px] uppercase text-[#8A6E2F] block mb-1">Workflow Type</label>
                  <select
                    value={difyWorkflowType}
                    onChange={(e) => setDifyWorkflowType(e.target.value as any)}
                    className="w-full bg-[#1E1E1E] border border-[#C9A84C]/20 px-3 py-2 text-xs text-[#F5EED8] outline-none"
                  >
                    {difyTypes?.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[8px] tracking-[2px] uppercase text-[#8A6E2F] block mb-1">Item Name (for outreach/research)</label>
                  <input
                    value={difyItemName}
                    onChange={(e) => setDifyItemName(e.target.value)}
                    placeholder="e.g., Rolex Submariner 16800"
                    className="w-full bg-[#1E1E1E] border border-[#C9A84C]/20 px-3 py-2 text-xs text-[#F5EED8] placeholder-[#8A6E2F]/50 outline-none focus:border-[#C9A84C]"
                  />
                </div>
                <button
                  onClick={() => {
                    executeDifyWorkflow.mutate({
                      workflowType: difyWorkflowType,
                      itemName: difyItemName || undefined,
                    });
                  }}
                  disabled={executeDifyWorkflow.isPending}
                  className="w-full px-6 py-3 bg-[#C9A84C] text-[#080808] text-[10px] tracking-[2px] uppercase font-bold hover:bg-[#E8CB7A] transition-colors disabled:opacity-30 flex items-center justify-center gap-2"
                >
                  {executeDifyWorkflow.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Workflow className="w-3.5 h-3.5" />}
                  {executeDifyWorkflow.isPending ? "EXECUTING GRAPH..." : "EXECUTE WORKFLOW"}
                </button>
              </div>

              {executeDifyWorkflow.data && (
                <div className={`mt-4 p-3 border text-xs ${executeDifyWorkflow.data.success ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-400" : "bg-red-950/20 border-red-500/20 text-red-400"}`}>
                  <strong>Workflow:</strong> {executeDifyWorkflow.data.workflowId}<br/>
                  <strong>Completed:</strong> {executeDifyWorkflow.data.completedNodes} nodes<br/>
                  <strong>Failed:</strong> {executeDifyWorkflow.data.failedNodes} nodes<br/>
                  <div className="mt-2 text-[9px] text-[#8A6E2F]">
                    {executeDifyWorkflow.data.executionLog?.slice(0, 5).map((log: string, i: number) => (
                      <div key={i}>{log}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Workflow Types Info */}
            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase mb-4">Available Workflows</h3>
              <div className="space-y-3">
                {difyTypes?.map((t) => (
                  <div key={t.id} className="p-3 bg-[#1E1E1E] border border-[#C9A84C]/10">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-[#F5EED8]">{t.name}</span>
                      <span className="text-[8px] px-2 py-0.5 bg-[#C9A84C]/10 text-[#C9A84C] uppercase">{t.id}</span>
                    </div>
                    <p className="text-[9px] text-[#8A6E2F]">{t.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Command Controls */}
            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase mb-4">Command Processor (Pause / Resume / Terminate)</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (executeDifyWorkflow.data?.workflowId) {
                      difyCommand.mutate({ workflowId: executeDifyWorkflow.data.workflowId, command: "PAUSE" });
                    }
                  }}
                  disabled={!executeDifyWorkflow.data?.workflowId}
                  className="px-4 py-2 bg-amber-900/30 border border-amber-500/20 text-amber-400 text-[10px] tracking-[2px] uppercase font-bold hover:bg-amber-900/50 transition-colors disabled:opacity-30 flex items-center gap-2"
                >
                  <Loader2 className="w-3 h-3" /> PAUSE
                </button>
                <button
                  onClick={() => {
                    if (executeDifyWorkflow.data?.workflowId) {
                      difyCommand.mutate({ workflowId: executeDifyWorkflow.data.workflowId, command: "RESUME" });
                    }
                  }}
                  disabled={!executeDifyWorkflow.data?.workflowId}
                  className="px-4 py-2 bg-emerald-900/30 border border-emerald-500/20 text-emerald-400 text-[10px] tracking-[2px] uppercase font-bold hover:bg-emerald-900/50 transition-colors disabled:opacity-30 flex items-center gap-2"
                >
                  <Play className="w-3 h-3" /> RESUME
                </button>
                <button
                  onClick={() => {
                    if (executeDifyWorkflow.data?.workflowId) {
                      difyCommand.mutate({ workflowId: executeDifyWorkflow.data.workflowId, command: "TERMINATE" });
                    }
                  }}
                  disabled={!executeDifyWorkflow.data?.workflowId}
                  className="px-4 py-2 bg-red-900/30 border border-red-500/20 text-red-400 text-[10px] tracking-[2px] uppercase font-bold hover:bg-red-900/50 transition-colors disabled:opacity-30 flex items-center gap-2"
                >
                  <Square className="w-3 h-3" /> TERMINATE
                </button>
              </div>
              {difyCommand.data && (
                <div className="mt-3 p-2 bg-[#1E1E1E] border border-[#C9A84C]/10 text-[10px] text-[#F5EED8]">
                  {difyCommand.data.message}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

function QuickActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 p-3 bg-[#1E1E1E] border border-[#C9A84C]/10 hover:border-[#C9A84C]/30 hover:bg-[#252525] transition-all text-left"
    >
      <span className="text-[#C9A84C]">{icon}</span>
      <span className="text-[10px] text-[#F5EED8] tracking-[1px] uppercase">{label}</span>
    </button>
  );
}

function CommandGroup({ title, commands }: { title: string; commands: [string, string][] }) {
  return (
    <div className="border border-[#C9A84C]/10">
      <div className="bg-[#C9A84C]/5 px-3 py-2">
        <span className="text-[10px] tracking-[2px] uppercase text-[#C9A84C] font-bold">{title}</span>
      </div>
      <div className="divide-y divide-[#C9A84C]/5">
        {commands.map(([cmd, desc]) => (
          <div key={cmd} className="flex items-start gap-3 px-3 py-2">
            <code className="text-[10px] text-[#F5EED8] font-mono min-w-[200px]">{cmd}</code>
            <span className="text-[10px] text-[#8A6E2F]">{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-[#161616] border border-[#C9A84C]/15 p-4">
      <div className={`font-cinzel text-xl font-bold ${color} mb-1`}>{value}</div>
      <div className="text-[9px] tracking-[2px] uppercase text-[#8A6E2F]">{label}</div>
    </div>
  );
}

function QuickStat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-[#161616] border border-[#C9A84C]/10 p-2 text-center">
      <div className={`font-cinzel text-sm font-bold ${color ?? "text-[#C9A84C]"}`}>{value}</div>
      <div className="text-[8px] tracking-[1px] uppercase text-[#8A6E2F]">{label}</div>
    </div>
  );
}
