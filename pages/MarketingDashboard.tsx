/**
 * MARKETING ANALYTICS DASHBOARD
 * Full traffic analytics for thevaultdfw.win
 * Cold email campaign performance
 * Visitor insights, conversion funnels, referral tracking
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import {
  BarChart3, TrendingUp, Users, Mail, Eye, MousePointer,
  ArrowLeft, Loader2, Zap, Target, Globe, Clock,
  DollarSign, Activity, Percent, Send, Inbox, Reply,
  AlertTriangle, CheckCircle, XCircle, ChevronDown
} from "lucide-react";

const ADMIN_EMAIL = "ratchetkrewelabs@gmail.com";

function StatCard({ label, value, sub, icon, color = "text-[#C9A84C]" }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color?: string;
}) {
  return (
    <div className="bg-[#161616] border border-[#C9A84C]/15 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[8px] tracking-[2px] uppercase text-[#8A6E2F]">{label}</span>
        <span className={color}>{icon}</span>
      </div>
      <div className="font-cinzel text-2xl font-bold text-[#F5EED8]">{value}</div>
      {sub && <div className="text-[9px] text-[#8A6E2F] mt-1">{sub}</div>}
    </div>
  );
}

function MiniBar({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  return (
    <div className="w-full h-4 bg-[#1E1E1E] rounded-full overflow-hidden flex">
      {segments.map((seg, i) => (
        <div
          key={i}
          className="h-full transition-all duration-500"
          style={{ width: `${total > 0 ? (seg.value / total) * 100 : 0}%`, backgroundColor: seg.color }}
          title={`${seg.label}: ${seg.value}`}
        />
      ))}
    </div>
  );
}

export default function MarketingDashboard() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const isOwner = user?.email === ADMIN_EMAIL;
  const utils = trpc.useUtils();

  // ─── QUERIES ───
  const { data: emailStats } = trpc.coldEmail.stats.useQuery(undefined, { enabled: isOwner });
  const { data: templates } = trpc.coldEmail.listTemplates.useQuery({}, { enabled: isOwner });
  const { data: prospects } = trpc.coldEmail.listProspects.useQuery({}, { enabled: isOwner });
  const { data: sends } = trpc.coldEmail.listSends.useQuery({}, { enabled: isOwner });
  const { data: niches } = trpc.coldEmail.getNiches.useQuery(undefined, { enabled: isOwner });

  // ─── MUTATIONS ───
  const generateTemplate = trpc.coldEmail.generateTemplate.useMutation({
    onSuccess: () => utils.coldEmail.listTemplates.invalidate()
  });
  const addProspect = trpc.coldEmail.addProspect.useMutation({
    onSuccess: () => utils.coldEmail.listProspects.invalidate()
  });
  const sendOne = trpc.coldEmail.sendOne.useMutation({
    onSuccess: () => { utils.coldEmail.listSends.invalidate(); utils.coldEmail.listProspects.invalidate(); }
  });
  const batchSend = trpc.coldEmail.batchSend.useMutation({
    onSuccess: () => { utils.coldEmail.listSends.invalidate(); utils.coldEmail.listProspects.invalidate(); utils.coldEmail.stats.invalidate(); }
  });

  // ─── STATE ───
  const [tab, setTab] = useState<"overview" | "coldemail" | "traffic" | "templates">("overview");
  const [selectedNiche, setSelectedNiche] = useState("luxury_watch_dealers");
  const [prospectForm, setProspectForm] = useState({ name: "", email: "", niche: "luxury_watch_dealers", company: "", title: "" });
  const [selectedTemplate, setSelectedTemplate] = useState("");

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isOwner)) navigate("/");
  }, [isAuthenticated, isOwner, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080808]">
        <Loader2 className="w-8 h-8 text-[#C9A84C] animate-spin" />
      </div>
    );
  }
  if (!isOwner) return null;

  return (
    <div className="min-h-screen bg-[#080808] pt-24 pb-16 px-4 flex justify-center">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <button onClick={() => navigate("/admin/agents")} className="flex items-center gap-2 text-[#8A6E2F] hover:text-[#C9A84C] transition-colors text-[10px] tracking-[2px] uppercase mb-4">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Command Center
          </button>
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-5 h-5 text-[#C9A84C]" />
            <h1 className="font-cinzel text-xl text-[#C9A84C] tracking-[4px] uppercase">Marketing Analytics</h1>
          </div>
          <p className="text-[10px] text-[#8A6E2F] tracking-[1px]">
            thevaultdfw.win — Cold email campaigns, traffic insights, conversion tracking
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-8 border-b border-[#C9A84C]/15 pb-1">
          {[
            { id: "overview" as const, label: "Overview", icon: <Activity className="w-3.5 h-3.5" /> },
            { id: "coldemail" as const, label: "Cold Email Campaigns", icon: <Mail className="w-3.5 h-3.5" /> },
            { id: "templates" as const, label: "Templates", icon: <Zap className="w-3.5 h-3.5" /> },
            { id: "traffic" as const, label: "Traffic & Visitors", icon: <Globe className="w-3.5 h-3.5" /> },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3 py-2 text-[10px] tracking-[2px] uppercase font-bold transition-all border-b-2 ${
                tab === t.id
                  ? "text-[#C9A84C] border-[#C9A84C] bg-[#C9A84C]/5"
                  : "text-[#8A6E2F] border-transparent hover:text-[#C9A84C]"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ─── OVERVIEW TAB ─── */}
        {tab === "overview" && (
          <div className="space-y-6">
            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Total Prospects" value={emailStats?.totalProspects ?? 0} icon={<Users className="w-4 h-4" />} sub="Across all niches" />
              <StatCard label="Emails Sent" value={emailStats?.totalSent ?? 0} icon={<Send className="w-4 h-4" />} sub="Personalized sends" />
              <StatCard label="Open Rate" value={`${emailStats?.openRate ?? 0}%`} icon={<Eye className="w-4 h-4" />} color="text-blue-400" sub={`${emailStats?.totalOpened ?? 0} total opens`} />
              <StatCard label="Reply Rate" value={`${emailStats?.replyRate ?? 0}%`} icon={<Reply className="w-4 h-4" />} color="text-emerald-400" sub={`${emailStats?.totalReplied ?? 0} replies`} />
            </div>

            {/* Niche Performance */}
            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase mb-4">Performance by Niche</h3>
              <div className="space-y-4">
                {niches?.map((n) => {
                  const data = emailStats?.byNiche?.[n.id];
                  if (!data) return null;
                  const openRate = data.sent > 0 ? Math.round((data.opened / data.sent) * 100) : 0;
                  const replyRate = data.sent > 0 ? Math.round((data.replied / data.sent) * 100) : 0;
                  return (
                    <div key={n.id} className="border border-[#C9A84C]/10 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-[#F5EED8] capitalize">{n.label}</span>
                        <div className="flex gap-3">
                          <span className="text-[8px] text-[#8A6E2F]">{data.prospects} prospects</span>
                          <span className="text-[8px] text-blue-400">{data.sent} sent</span>
                          <span className="text-[8px] text-emerald-400">{openRate}% open</span>
                          <span className="text-[8px] text-[#C9A84C]">{replyRate}% reply</span>
                        </div>
                      </div>
                      <MiniBar segments={[
                        { label: "Sent", value: data.sent, color: "#3B82F6" },
                        { label: "Opened", value: data.opened, color: "#10B981" },
                        { label: "Replied", value: data.replied, color: "#C9A84C" },
                      ]} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button onClick={() => { setTab("coldemail"); }} className="p-4 bg-[#1E1E1E] border border-[#C9A84C]/10 hover:border-[#C9A84C]/30 text-left transition-all">
                  <Users className="w-4 h-4 text-[#C9A84C] mb-2" />
                  <div className="text-[9px] tracking-[1px] uppercase text-[#F5EED8]">Add Prospect</div>
                </button>
                <button onClick={() => { setTab("templates"); setSelectedNiche("luxury_watch_dealers"); }} className="p-4 bg-[#1E1E1E] border border-[#C9A84C]/10 hover:border-[#C9A84C]/30 text-left transition-all">
                  <Zap className="w-4 h-4 text-[#C9A84C] mb-2" />
                  <div className="text-[9px] tracking-[1px] uppercase text-[#F5EED8]">Generate Template</div>
                </button>
                <button onClick={() => { setTab("coldemail"); }} className="p-4 bg-[#1E1E1E] border border-[#C9A84C]/10 hover:border-[#C9A84C]/30 text-left transition-all">
                  <Send className="w-4 h-4 text-[#C9A84C] mb-2" />
                  <div className="text-[9px] tracking-[1px] uppercase text-[#F5EED8]">Launch Campaign</div>
                </button>
                <button onClick={() => setTab("traffic")} className="p-4 bg-[#1E1E1E] border border-[#C9A84C]/10 hover:border-[#C9A84C]/30 text-left transition-all">
                  <Globe className="w-4 h-4 text-[#C9A84C] mb-2" />
                  <div className="text-[9px] tracking-[1px] uppercase text-[#F5EED8]">View Traffic</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── COLD EMAIL TAB ─── */}
        {tab === "coldemail" && (
          <div className="space-y-6">
            {/* Add Prospect Form */}
            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase mb-4 flex items-center gap-2">
                <Users className="w-3.5 h-3.5" /> Add Prospect
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <input value={prospectForm.name} onChange={(e) => setProspectForm({...prospectForm, name: e.target.value})} placeholder="Full Name *" className="bg-[#1E1E1E] border border-[#C9A84C]/20 px-3 py-2 text-xs text-[#F5EED8] outline-none focus:border-[#C9A84C]" />
                <input value={prospectForm.email} onChange={(e) => setProspectForm({...prospectForm, email: e.target.value})} placeholder="Email *" className="bg-[#1E1E1E] border border-[#C9A84C]/20 px-3 py-2 text-xs text-[#F5EED8] outline-none focus:border-[#C9A84C]" />
                <select value={prospectForm.niche} onChange={(e) => setProspectForm({...prospectForm, niche: e.target.value})} className="bg-[#1E1E1E] border border-[#C9A84C]/20 px-3 py-2 text-xs text-[#F5EED8] outline-none">
                  {niches?.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
                </select>
                <input value={prospectForm.company} onChange={(e) => setProspectForm({...prospectForm, company: e.target.value})} placeholder="Company" className="bg-[#1E1E1E] border border-[#C9A84C]/20 px-3 py-2 text-xs text-[#F5EED8] outline-none focus:border-[#C9A84C]" />
                <input value={prospectForm.title} onChange={(e) => setProspectForm({...prospectForm, title: e.target.value})} placeholder="Title" className="bg-[#1E1E1E] border border-[#C9A84C]/20 px-3 py-2 text-xs text-[#F5EED8] outline-none focus:border-[#C9A84C]" />
                <button
                  onClick={() => {
                    if (!prospectForm.name || !prospectForm.email) return;
                    addProspect.mutate(prospectForm);
                    setProspectForm({ name: "", email: "", niche: "luxury_watch_dealers", company: "", title: "" });
                  }}
                  disabled={addProspect.isPending || !prospectForm.name || !prospectForm.email}
                  className="bg-[#C9A84C] text-[#080808] text-[10px] tracking-[2px] uppercase font-bold hover:bg-[#E8CB7A] transition-colors disabled:opacity-30"
                >
                  {addProspect.isPending ? "Adding..." : "Add Prospect"}
                </button>
              </div>
            </div>

            {/* Send Control */}
            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase mb-4 flex items-center gap-2">
                <Send className="w-3.5 h-3.5" /> Launch Campaign
              </h3>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-[8px] tracking-[2px] uppercase text-[#8A6E2F] block mb-1">Template</label>
                  <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} className="w-full bg-[#1E1E1E] border border-[#C9A84C]/20 px-3 py-2 text-xs text-[#F5EED8] outline-none">
                    <option value="">Select a template...</option>
                    {templates?.map((t) => <option key={t.id} value={t.templateId}>{t.subject} ({t.niche})</option>)}
                  </select>
                </div>
                <div className="w-48">
                  <label className="text-[8px] tracking-[2px] uppercase text-[#8A6E2F] block mb-1">Niche Filter</label>
                  <select value={selectedNiche} onChange={(e) => setSelectedNiche(e.target.value)} className="w-full bg-[#1E1E1E] border border-[#C9A84C]/20 px-3 py-2 text-xs text-[#F5EED8] outline-none">
                    {niches?.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
                  </select>
                </div>
                <button
                  onClick={() => {
                    if (!selectedTemplate) return;
                    batchSend.mutate({ templateId: selectedTemplate, niche: selectedNiche });
                  }}
                  disabled={batchSend.isPending || !selectedTemplate}
                  className="px-6 py-2 bg-[#C9A84C] text-[#080808] text-[10px] tracking-[2px] uppercase font-bold hover:bg-[#E8CB7A] transition-colors disabled:opacity-30 flex items-center gap-2 h-[33px]"
                >
                  {batchSend.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  {batchSend.isPending ? "Sending..." : "Batch Send"}
                </button>
              </div>
              {batchSend.data && (
                <div className="mt-3 p-3 bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-400">
                  Campaign launched: {batchSend.data.sent} sent, {batchSend.data.failed} failed (20s delay between each)
                </div>
              )}
            </div>

            {/* Prospects List */}
            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase mb-4">Prospects ({prospects?.length ?? 0})</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {(prospects ?? []).map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-[#1E1E1E] border border-[#C9A84C]/5">
                    <div>
                      <div className="text-[10px] font-bold text-[#F5EED8]">{p.name}</div>
                      <div className="text-[9px] text-[#8A6E2F]">{p.email} · {p.company} · {p.niche}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[8px] px-2 py-0.5 rounded uppercase ${
                        p.status === "replied" ? "bg-emerald-900/30 text-emerald-400" :
                        p.status === "opened" ? "bg-blue-900/30 text-blue-400" :
                        p.status === "sent" ? "bg-amber-900/30 text-amber-400" :
                        "bg-[#333] text-[#8A6E2F]"
                      }`}>{p.status}</span>
                      {p.status === "pending" && selectedTemplate && (
                        <button
                          onClick={() => sendOne.mutate({ prospectId: p.prospectId, templateId: selectedTemplate })}
                          className="text-[8px] px-2 py-0.5 bg-[#C9A84C] text-[#080808] tracking-[1px] uppercase font-bold hover:bg-[#E8CB7A]"
                        >
                          Send
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {(!prospects || prospects.length === 0) && (
                  <p className="text-xs text-[#8A6E2F] text-center py-4">No prospects yet. Add your first prospect above.</p>
                )}
              </div>
            </div>

            {/* Send Log */}
            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase mb-4">Send Log</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(sends ?? []).slice(0, 20).map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-2 bg-[#1E1E1E] border border-[#C9A84C]/5">
                    <div>
                      <div className="text-[9px] text-[#F5EED8]">{s.subject}</div>
                      <div className="text-[8px] text-[#8A6E2F]">{s.niche} · {s.sentAt ? new Date(s.sentAt).toLocaleString() : "Queued"}</div>
                    </div>
                    <span className={`text-[8px] px-2 py-0.5 rounded uppercase ${
                      s.status === "replied" ? "bg-emerald-900/30 text-emerald-400" :
                      s.status === "opened" ? "bg-blue-900/30 text-blue-400" :
                      s.status === "sent" ? "bg-amber-900/30 text-amber-400" :
                      s.status === "failed" ? "bg-red-900/30 text-red-400" :
                      "bg-[#333] text-[#8A6E2F]"
                    }`}>{s.status}</span>
                  </div>
                ))}
                {(!sends || sends.length === 0) && (
                  <p className="text-xs text-[#8A6E2F] text-center py-4">No sends yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── TEMPLATES TAB ─── */}
        {tab === "templates" && (
          <div className="space-y-6">
            {/* Generate Template */}
            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase mb-4 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" /> AI Template Generator
              </h3>
              <p className="text-[10px] text-[#8A6E2F] mb-4">
                Select a luxury collectible niche. The AI will generate a personalized cold email template for that audience — using The Vault's voice and zero-hallucination guardrails.
              </p>
              <div className="flex gap-3">
                <select value={selectedNiche} onChange={(e) => setSelectedNiche(e.target.value)} className="flex-1 bg-[#1E1E1E] border border-[#C9A84C]/20 px-3 py-2 text-xs text-[#F5EED8] outline-none">
                  {niches?.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
                </select>
                <button
                  onClick={() => generateTemplate.mutate({ niche: selectedNiche })}
                  disabled={generateTemplate.isPending}
                  className="px-6 py-2 bg-[#C9A84C] text-[#080808] text-[10px] tracking-[2px] uppercase font-bold hover:bg-[#E8CB7A] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {generateTemplate.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                  {generateTemplate.isPending ? "Generating..." : "Generate Template"}
                </button>
              </div>
              {generateTemplate.data && (
                <div className="mt-4 border border-[#C9A84C]/20 p-4 bg-[#1E1E1E]">
                  <div className="text-[10px] text-[#C9A84C] font-bold mb-1">{generateTemplate.data.subject}</div>
                  <pre className="text-[10px] text-[#F5EED8] whitespace-pre-wrap leading-relaxed">{generateTemplate.data.body}</pre>
                </div>
              )}
            </div>

            {/* Existing Templates */}
            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase mb-4">Saved Templates ({templates?.length ?? 0})</h3>
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {(templates ?? []).map((t) => (
                  <div key={t.id} className="border border-[#C9A84C]/10 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-[#F5EED8]">{t.subject}</span>
                      <div className="flex gap-2">
                        <span className="text-[8px] px-2 py-0.5 bg-[#C9A84C]/10 text-[#C9A84C] uppercase">{t.niche}</span>
                        <span className="text-[8px] px-2 py-0.5 bg-[#333] text-[#8A6E2F]">{t.useCount} uses</span>
                      </div>
                    </div>
                    <pre className="text-[9px] text-[#8A6E2F] whitespace-pre-wrap leading-relaxed">{t.body}</pre>
                  </div>
                ))}
                {(!templates || templates.length === 0) && (
                  <p className="text-xs text-[#8A6E2F] text-center py-4">No templates yet. Generate your first one above.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── TRAFFIC TAB ─── */}
        {tab === "traffic" && (
          <div className="space-y-6">
            <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <h3 className="font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase mb-4 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" /> Website Traffic — thevaultdfw.win
              </h3>
              <p className="text-[10px] text-[#8A6E2F] mb-4">
                Full analytics integration coming. Connect Cloudflare Analytics or Google Analytics 4 to populate live data.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <StatCard label="Page Views" value="—" icon={<Eye className="w-4 h-4" />} sub="Connect CF Analytics" />
                <StatCard label="Unique Visitors" value="—" icon={<Users className="w-4 h-4" />} sub="Connect CF Analytics" />
                <StatCard label="Avg Session" value="—" icon={<Clock className="w-4 h-4" />} color="text-blue-400" sub="Connect CF Analytics" />
                <StatCard label="Bounce Rate" value="—" icon={<Percent className="w-4 h-4" />} color="text-amber-400" sub="Connect CF Analytics" />
              </div>
              <div className="border-t border-[#C9A84C]/10 pt-4">
                <h4 className="text-[10px] tracking-[2px] uppercase text-[#C9A84C] mb-3">Integration Instructions</h4>
                <div className="space-y-2 text-[9px] text-[#8A6E2F]">
                  <p>1. Add your Cloudflare Analytics Token to environment variables as CF_ANALYTICS_TOKEN</p>
                  <p>2. Or add GA4 Measurement ID as GA4_MEASUREMENT_ID for Google Analytics</p>
                  <p>3. The dashboard will auto-populate with live traffic data</p>
                  <p>4. All events are also tracked in the marketing_analytics table for custom queries</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
