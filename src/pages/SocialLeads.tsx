/**
 * SocialLeads Page
 * Displays AI-found social media leads for a listing
 * Allows seller to track contact status with each lead
 */

import { Link, useParams } from 'react-router'
import { trpc } from '@/providers/trpc'
import {
  ArrowLeft, Loader2, ExternalLink, Mail, Globe, MapPin, Users,
  CheckCircle2, Send, XCircle, Star,
  AlertTriangle
} from 'lucide-react'

export default function SocialLeads() {
  const { listingId } = useParams()
  const id = Number(listingId)

  const { data, isLoading, error } = trpc.social.getSearchResults.useQuery(
    { listingId: id },
    { enabled: !!id && !isNaN(id) }
  )

  const utils = trpc.useUtils()
  const updateStatus = trpc.social.updateMentionStatus.useMutation({
    onSuccess: () => {
      utils.social.getSearchResults.invalidate({ listingId: id })
    },
  })

  const startSearch = trpc.social.startSearch.useMutation({
    onSuccess: () => {
      utils.social.getSearchResults.invalidate({ listingId: id })
    },
  })

  const handleStartSearch = () => {
    if (!id || isNaN(id)) return
    startSearch.mutate({ listingId: id })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#C9A84C] animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center text-red-400">
        <AlertTriangle className="w-6 h-6 mr-2" /> Error loading leads
      </div>
    )
  }

  const hasSearch = data && 'search' in data && data.search
  const mentions = (data && 'mentions' in data ? data.mentions : []) as any[]
  const searchStatus = hasSearch ? (data as any).search.status : null

  return (
    <div className="min-h-screen bg-[#080808] pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to={`/listing/${id}`} className="text-[#8A6E2F] hover:text-[#C9A84C] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-cinzel text-xl tracking-[6px] text-[#F5EED8] uppercase">
              AI Buyer Intelligence
            </h1>
            <p className="text-[10px] text-[#8A6E2F] tracking-[2px] uppercase mt-1">
              Social Media Lead Discovery
            </p>
          </div>
        </div>

        {/* Real Data Banner */}
        <div className="mb-6 p-4 border border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] text-emerald-400 tracking-[2px] uppercase font-semibold mb-1">Real Social Media Data</p>
              <p className="text-[10px] text-[#C8BC98] leading-relaxed">
                All leads below are REAL public posts scraped from Reddit and X (Twitter). We do NOT generate fake profiles. Each "View Post" link goes to the actual social media post. If fewer than 3 leads appear, it means no more relevant public posts were found — we do not invent leads to pad the count.
              </p>
            </div>
          </div>
        </div>

        {/* No Search Yet */}
        {!hasSearch && (
          <div className="text-center py-16 border border-[#C9A84C]/20 bg-[#161616]">
            <Users className="w-10 h-10 text-[#C9A84C] mx-auto mb-4" />
            <h2 className="font-cinzel text-sm tracking-[4px] text-[#F5EED8] uppercase mb-3">
              No Search Yet
            </h2>
            <p className="text-[10px] text-[#8A6E2F] max-w-md mx-auto mb-6 px-4">
              We will scan real public social media posts on Reddit and X (Twitter) to find people who have actually mentioned items like yours. We do not generate fake leads.
            </p>
            <button
              onClick={handleStartSearch}
              disabled={startSearch.isPending}
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-br from-[#C9A84C] to-[#8A6E2F] text-[#080808] font-cinzel text-[10px] tracking-[3px] uppercase font-bold hover:shadow-[0_0_30px_rgba(201,168,76,0.3)] transition-all disabled:opacity-50"
            >
              {startSearch.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Scanning Real Social Media...</>
              ) : (
                <><Users className="w-4 h-4" /> Search Real Social Media</>
              )}
            </button>
            {startSearch.data && (
              <p className="text-[10px] text-emerald-400 mt-4">
                Found {startSearch.data.mentionsFound} real leads from social media APIs.
                {startSearch.data.emailSent && " Check your email for the full report with links to actual posts."}
              </p>
            )}
          </div>
        )}

        {/* Search Running */}
        {hasSearch && searchStatus === 'running' && (
          <div className="text-center py-12 border border-[#C9A84C]/20 bg-[#161616]">
            <Loader2 className="w-8 h-8 text-[#C9A84C] animate-spin mx-auto mb-3" />
            <p className="text-[10px] text-[#C8BC98] tracking-[2px]">Scraping real public posts from Reddit and X...</p>
          </div>
        )}

        {/* Results */}
        {hasSearch && searchStatus === 'completed' && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="p-4 border border-[#C9A84C]/20 bg-[#161616] text-center">
                <p className="text-2xl font-cinzel text-[#C9A84C]">{mentions.length}</p>
                <p className="text-[9px] text-[#8A6E2F] tracking-[2px] uppercase">Leads Found</p>
              </div>
              <div className="p-4 border border-[#C9A84C]/20 bg-[#161616] text-center">
                <p className="text-2xl font-cinzel text-[#C9A84C]">
                  {mentions.filter((m: any) => !!m.publicEmail || !!m.publicWebsite).length}
                </p>
                <p className="text-[9px] text-[#8A6E2F] tracking-[2px] uppercase">With Contact Info</p>
              </div>
              <div className="p-4 border border-[#C9A84C]/20 bg-[#161616] text-center">
                <p className="text-2xl font-cinzel text-[#C9A84C]">
                  {mentions.length > 0
                    ? Math.round(mentions.reduce((s: number, m: any) => s + (m.relevanceScore || 0), 0) / mentions.length)
                    : 0}
                </p>
                <p className="text-[9px] text-[#8A6E2F] tracking-[2px] uppercase">Avg Relevance</p>
              </div>
            </div>

            {/* Platform breakdown */}
            <div className="flex gap-3 mb-8">
              {['x', 'reddit', 'instagram'].map((p) => {
                const count = mentions.filter((m: any) => m.platform === p).length
                if (count === 0) return null
                return (
                  <div key={p} className="px-3 py-1.5 bg-[#C9A84C]/10 border border-[#C9A84C]/20 text-[9px] text-[#C9A84C] tracking-[2px] uppercase">
                    {p}: {count}
                  </div>
                )
              })}
            </div>

            {/* Fewer Than 3 Leads Warning */}
            {mentions.length > 0 && mentions.length < 3 && (
              <div className="mb-6 p-4 border border-orange-500/20 bg-orange-500/5">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-orange-400 tracking-[2px] uppercase font-semibold mb-1">Only {mentions.length} Lead{mentions.length === 1 ? '' : 's'} Found</p>
                    <p className="text-[10px] text-orange-300/70 leading-relaxed">
                      We only found {mentions.length} relevant public post{mentions.length === 1 ? '' : 's'} for your item. We do not invent leads to reach a quota. These are the actual real posts that exist — there simply aren't many public mentions of this item right now. You may want to list the item and wait, or consider broader search terms.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Mentions List */}
            <div className="space-y-4">
              {mentions.map((mention: any) => (
                <div
                  key={mention.id}
                  className="border border-[#C9A84C]/15 bg-[#161616] hover:border-[#C9A84C]/30 transition-colors"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 bg-[#C9A84C]/15 text-[#C9A84C] text-[9px] tracking-[2px] uppercase">
                          {mention.platform}
                        </span>
                        <span className="text-[9px] text-[#8A6E2F]">
                          Relevance: {mention.relevanceScore}/100
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={mention.status} />
                      </div>
                    </div>

                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-8 h-8 bg-[#C9A84C]/10 flex items-center justify-center flex-shrink-0">
                        <Users className="w-4 h-4 text-[#C9A84C]" />
                      </div>
                      <div>
                        <p className="text-sm text-[#F5EED8] font-semibold">
                          @{mention.authorUsername}
                        </p>
                        <p className="text-[10px] text-[#8A6E2F]">
                          {mention.authorDisplayName}
                        </p>
                      </div>
                    </div>

                    <p className="text-[10px] text-[#C8BC98] italic mb-3 border-l-2 border-[#C9A84C]/30 pl-3">
                      "{mention.postContent?.substring(0, 200)}{mention.postContent?.length > 200 ? '...' : ''}"
                    </p>
                    <p className="text-[10px] text-[#C8BC98] mb-3">{mention.aiNotes}</p>

                    {/* Contact Info */}
                    <div className="flex flex-wrap gap-3 mb-3 text-[9px]">
                      {mention.publicEmail && (
                        <a
                          href={`mailto:${mention.publicEmail}`}
                          className="flex items-center gap-1 text-[#C9A84C] hover:underline"
                        >
                          <Mail className="w-3 h-3" /> {mention.publicEmail}
                        </a>
                      )}
                      {mention.publicWebsite && (
                        <a
                          href={mention.publicWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[#C9A84C] hover:underline"
                        >
                          <Globe className="w-3 h-3" /> Website
                        </a>
                      )}
                      {mention.publicLocation && (
                        <span className="flex items-center gap-1 text-[#8A6E2F]">
                          <MapPin className="w-3 h-3" /> {mention.publicLocation}
                        </span>
                      )}
                      <span className="text-[#8A6E2F]">
                        {mention.followersCount?.toLocaleString() || '0'} followers
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-3 border-t border-[#C9A84C]/10">
                      <a
                        href={mention.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[9px] text-[#C9A84C] hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" /> View Real Post
                      </a>
                      <a
                        href={mention.authorProfileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[9px] text-[#C9A84C] hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" /> View Profile
                      </a>

                      {/* Status Actions */}
                      <div className="ml-auto flex gap-1">
                        <button
                          onClick={() =>
                            updateStatus.mutate({
                              mentionId: mention.id,
                              status: "contacted",
                              contactMethod: "email",
                            })
                          }
                          className="px-2 py-1 text-[9px] bg-[#C9A84C]/10 text-[#C9A84C] hover:bg-[#C9A84C]/20 transition-colors"
                        >
                          <Send className="w-3 h-3 inline mr-1" /> Contacted
                        </button>
                        <button
                          onClick={() =>
                            updateStatus.mutate({
                              mentionId: mention.id,
                              status: "interested",
                            })
                          }
                          className="px-2 py-1 text-[9px] bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        >
                          <CheckCircle2 className="w-3 h-3 inline mr-1" /> Interested
                        </button>
                        <button
                          onClick={() =>
                            updateStatus.mutate({
                              mentionId: mention.id,
                              status: "not_interested",
                            })
                          }
                          className="px-2 py-1 text-[9px] bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                          <XCircle className="w-3 h-3 inline mr-1" /> Declined
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {mentions.length === 0 && (
              <div className="text-center py-12 border border-[#C9A84C]/20">
                <p className="text-[10px] text-[#8A6E2F]">No public social media mentions found for this item in the last year.</p>
                <p className="text-[9px] text-[#8A6E2F] mt-2 max-w-sm mx-auto">
                  We searched real Reddit and X APIs. There simply aren't many public posts about this item. We do not generate fake leads.
                </p>
                <button
                  onClick={handleStartSearch}
                  disabled={startSearch.isPending}
                  className="mt-4 px-6 py-2 bg-[#C9A84C]/10 text-[#C9A84C] text-[9px] tracking-[2px] uppercase hover:bg-[#C9A84C]/20 transition-colors"
                >
                  Re-run Search
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    new: "bg-[#C9A84C]/10 text-[#C9A84C]",
    contacted: "bg-blue-500/10 text-blue-400",
    responded: "bg-purple-500/10 text-purple-400",
    interested: "bg-emerald-500/10 text-emerald-400",
    not_interested: "bg-red-500/10 text-red-400",
  }
  return (
    <span className={`px-2 py-0.5 text-[9px] tracking-[2px] uppercase ${styles[status] || styles.new}`}>
      {status.replace("_", " ")}
    </span>
  )
}
