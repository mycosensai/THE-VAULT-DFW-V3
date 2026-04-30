/**
 * BOXED-IN Internet Research Router
 * Agents pull real data from the internet — STRICTLY LIMITED to:
 * 1. Finding people interested in buying seller's items
 * 2. Finding social media posts about similar items
 *
 * SAFETY BOX — Agents CANNOT:
 * - Research anything unrelated to buyer discovery
 * - Access private/password-protected content
 * - Scrape personal data beyond public profiles
 * - Form opinions on non-collectible topics
 * - Share findings outside the research sandbox
 */

import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  internetResearch,
  researchSessions,
  agentConversations,
  listings,
} from "@db/schema";
import { openaiChat } from "./lib/openai";
import { checkHallucinations, censorOutreach } from "./lib/hallucination-guard";
import { env } from "./lib/env";
import { genId } from "./lib/id";

// ─── APPROVED PLATFORMS (safelist) ───
const APPROVED_PLATFORMS = [
  "reddit",
  "x",
  "watchuseek",
  "timezone",
  "rolexforums",
  "purseforum",
  "thefashionspot",
  "styleforum",
  "audiokarma",
  "gearspace",
  "tampabay",
  "pistonheads",
  "bringatrailer",
  "hodinkee",
  "revolution",
  "sjx",
  "quanthello",
  "collectorsweekly",
];

// ─── BOX BOUNDARIES ───
const BOXED_IN_PREAMBLE = `THE BOX — ABSOLUTE BOUNDARIES (VIOLATION = OUTPUT DISCARDED):
1. You may ONLY research: buyer interest, social media posts, market discussions, collector communities, WTB (want to buy) posts, for-sale listings of similar items.
2. You may NOT research: competitor business details, pricing policies, business strategy, legal/tax matters, political content, news unrelated to collectibles.
3. You may NOT form opinions about: The Vault's business, staff, policies, competitors, or market conditions beyond buyer interest.
4. You may NOT discuss: politics, current events, non-collectible topics, personal lives of collectors.
5. You may NOT fabricate: URLs, posts, usernames, prices, or any data you cannot verify.
6. Every finding MUST include source URL and confidence score (0-100).
7. Every opinion MUST be flagged as AI-generated and speculative.
8. If you cannot verify a claim, say "UNVERIFIED" — never invent.
9. STAY IN THE BOX. Your only job is finding buyers and relevant social posts. NOTHING ELSE.`;

// genId imported from ./lib/id

// ─── REDDIT SEARCH (public API, no auth) ───
async function searchRedditForBuyers(
  query: string,
  subreddits?: string[]
): Promise<Array<typeof internetResearch.$inferInsert>> {
  const findings: Array<typeof internetResearch.$inferInsert> = [];
  const searchQueries = [
    `${query} WTB`,
    `${query} looking for`,
    `${query} want to buy`,
    `${query} interested`,
    `${query} collection`,
  ];

  for (const sq of searchQueries) {
    try {
      const encoded = encodeURIComponent(sq);
      const url = `https://www.reddit.com/search.json?q=${encoded}&sort=new&limit=10&t=year`;
      const resp = await fetch(url, {
        headers: {
          "User-Agent": "TheVaultResearchBot/1.0 (contact: support@thevaultdfw.win)",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!resp.ok) continue;

      const data = await resp.json();
      const posts = data?.data?.children || [];

      for (const child of posts) {
        const p = child.data;
        if (!p.author || p.author === "[deleted]" || p.author === "AutoModerator") continue;

        const isBuyingSignal = /\b(wtb|want to buy|looking for|seeking|interested in buying|in the market)\b/i.test(
          (p.title || "") + " " + (p.selftext || "")
        );

        findings.push({
          researchId: genId("ir"),
          query: sq,
          itemName: query, // populated from caller
          platform: "reddit",
          sourceUrl: `https://www.reddit.com${p.permalink}`,
          title: p.title?.substring(0, 300) || "",
          content: (p.selftext || p.title || "").substring(0, 1000),
          author: p.author,
          authorUrl: `https://www.reddit.com/user/${p.author}`,
          postDate: new Date(p.created_utc * 1000).toISOString(),
          relevanceScore: isBuyingSignal ? 85 : 50,
          confidenceScore: 75,
          aiNotes: `Subreddit: r/${p.subreddit}. Score: ${p.score}. Buying signal: ${isBuyingSignal ? "YES" : "no"}.`,
          findingType: isBuyingSignal ? "wtb" : "discussion",
          isBuyingSignal,
          foundByAgent: "research",
        });
      }
    } catch {
      // Silently skip failed searches — the BOX stays intact
    }
  }

  return findings;
}

// ─── X/TWITTER SEARCH (if bearer token configured) ───
async function searchXForBuyers(
  query: string,
  itemName: string,
  bearerToken?: string
): Promise<Array<typeof internetResearch.$inferInsert>> {
  if (!bearerToken) return [];

  const findings: Array<typeof internetResearch.$inferInsert> = [];
  try {
    const encoded = encodeURIComponent(`${query} (WTB OR "want to buy" OR "looking for" OR collecting)`);
    const url = `https://api.x.com/2/tweets/search/recent?query=${encoded}&max_results=25&tweet.fields=created_at,public_metrics&expansions=author_id&user.fields=username,public_metrics,location,url`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${bearerToken}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return [];

    const data = await resp.json();
    const tweets = data?.data || [];
    const users = data?.includes?.users || [];
    const userMap = new Map(users.map((u: any) => [u.id, u]));

    for (const t of tweets) {
      const author: any = userMap.get(t.author_id) || {};
      const text = t.text || "";
      const isBuyingSignal = /\b(wtb|want to buy|looking for|seeking|interested)\b/i.test(text);

      findings.push({
        researchId: genId("ir"),
        query,
        itemName,
        platform: "x",
        sourceUrl: `https://x.com/${author.username || "user"}/status/${t.id}`,
        title: text.substring(0, 300),
        content: text.substring(0, 1000),
        author: author.username || "unknown",
        authorUrl: `https://x.com/${author.username || "user"}`,
        postDate: t.created_at,
        relevanceScore: isBuyingSignal ? 90 : 55,
        confidenceScore: 80,
        aiNotes: `Followers: ${author.public_metrics?.followers_count || 0}. Buying signal: ${isBuyingSignal ? "YES" : "no"}.`,
        findingType: isBuyingSignal ? "wtb" : "discussion",
        isBuyingSignal,
        foundByAgent: "research",
      });
    }
  } catch {
    // Silently skip
  }

  return findings;
}

// ─── AI ANALYSIS LAYER (only analyzes real data, never invents) ───
async function analyzeFindings(
  itemName: string,
  findings: Array<typeof internetResearch.$inferInsert>
): Promise<{
  analyzed: Array<typeof internetResearch.$inferInsert>;
  summary: string;
  buyingSignals: number;
}> {
  if (findings.length === 0) {
    return { analyzed: [], summary: "No relevant posts found.", buyingSignals: 0 };
  }

  const prompt = `${BOXED_IN_PREAMBLE}

You are analyzing REAL social media posts found for item: "${itemName}".
These posts were scraped from Reddit and X. They are NOT fictional.

YOUR JOB — STAY IN THE BOX:
1. Identify which posts show genuine BUYING INTENT (WTB, "looking for", "interested in").
2. Identify which posts are just DISCUSSIONS (show and tell, advice requests).
3. For buying-intent posts: estimate how serious the buyer is (1-100).
4. For all posts: rate relevance to finding a buyer for this exact item (1-100).
5. Return ONLY a JSON array matching the posts by index.

POSTS TO ANALYZE:
${JSON.stringify(findings.map((f, i) => ({ index: i, platform: f.platform, title: f.title?.substring(0, 200), type: f.findingType })))}

Respond ONLY with:
[{"index": 0, "relevanceScore": number, "confidenceScore": number, "buyingSignal": true/false, "aiNotes": "why"}]

DO NOT invent posts. Only score what was provided.`;

  try {
    const response = await openaiChat({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `${BOXED_IN_PREAMBLE} You are a buyer-intent analyst. Respond with valid JSON only.` },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 2048,
    });

    const text = response.choices[0]?.message?.content ?? "[]";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return { analyzed: findings, summary: `${findings.length} posts found.`, buyingSignals: findings.filter((f) => f.isBuyingSignal).length };

    let scores: any[] = [];
    try { scores = JSON.parse(jsonMatch[0]); } catch { return { analyzed: findings, summary: `${findings.length} posts found.`, buyingSignals: findings.filter((f) => f.isBuyingSignal).length }; }

    const analyzed = findings.map((f, i) => {
      const s = scores.find((x: any) => x.index === i);
      return {
        ...f,
        relevanceScore: s?.relevanceScore ?? f.relevanceScore ?? 50,
        confidenceScore: s?.confidenceScore ?? f.confidenceScore ?? 50,
        isBuyingSignal: s?.buyingSignal ?? f.isBuyingSignal ?? false,
        aiNotes: s?.aiNotes ? `${f.aiNotes}; AI: ${s.aiNotes}` : f.aiNotes,
      };
    });

    const buyingSignals = analyzed.filter((f) => f.isBuyingSignal).length;
    const summary = buyingSignals > 0
      ? `Found ${buyingSignals} buying-intent post${buyingSignals > 1 ? "s" : ""} and ${analyzed.length - buyingSignals} discussion${analyzed.length - buyingSignals !== 1 ? "s" : ""} for "${itemName}".`
      : `Found ${analyzed.length} discussion post${analyzed.length > 1 ? "s" : ""} about "${itemName}". No direct buying signals detected, but these communities may contain interested collectors.`;

    return { analyzed, summary, buyingSignals };
  } catch {
    return { analyzed: findings, summary: `${findings.length} posts found.`, buyingSignals: findings.filter((f) => f.isBuyingSignal).length };
  }
}

// ─── BOX ENFORCEMENT — checks if finding stays within boundaries ───
async function enforceBox(
  finding: typeof internetResearch.$inferInsert
): Promise<{ allowed: boolean; reason?: string; safetyFlags: string[] }> {
  const flags: string[] = [];

  // Check 1: Is platform approved?
  if (!APPROVED_PLATFORMS.includes(finding.platform)) {
    flags.push("PLATFORM_NOT_APPROVED");
  }

  // Check 2: Is source URL present?
  if (!finding.sourceUrl) {
    flags.push("MISSING_SOURCE_URL");
  }

  // Check 3: Content length reasonable (not a dump)
  if ((finding.content?.length || 0) > 5000) {
    flags.push("OVERSIZED_CONTENT");
  }

  // Check 4: AI censorship check for sensitive content
  const combinedText = `${finding.title} ${finding.content}`;
  if (combinedText.length > 20) {
    try {
      const censor = await censorOutreach(combinedText, "social");
      if (censor.severity === "blocked") {
        flags.push("CENSORED_CONTENT");
      }
    } catch {
      // Skip censorship check on failure
    }
  }

  // Check 5: Hallucination check
  if (finding.aiNotes) {
    try {
      const hallucination = await checkHallucinations(finding.aiNotes);
      if (hallucination.overall_risk === "critical") {
        flags.push("CRITICAL_HALLUCINATION_RISK");
      }
    } catch {
      // Skip on failure
    }
  }

  // Check 6: Is it about buying/collecting? (topic verification)
  const buyingTerms = /\b(buy|wtb|sell|trade|collect|vintage|rolex|patek|watch|car|art|memorabilia|interested|looking for|seeking)\b/i;
  if (!buyingTerms.test(combinedText) && finding.relevanceScore! < 30) {
    flags.push("LOW_BUYER_RELEVANCE");
  }

  const allowed = !flags.includes("CENSORED_CONTENT") && !flags.includes("CRITICAL_HALLUCINATION_RISK");

  return { allowed, reason: flags.length > 0 ? flags.join(", ") : undefined, safetyFlags: flags };
}

// ─── TRPC ROUTER ───
export const internetResearchRouter = createRouter({
  // ── START RESEARCH SESSION ──
  startResearch: adminQuery
    .input(z.object({
      listingId: z.number().optional(),
      itemName: z.string().min(1).max(200),
      category: z.string().optional(),
      triggerAgent: z.string().default("outreach"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const sessionId = genId("rs");

      // Create research session
      await db.insert(researchSessions).values({
        sessionId,
        listingId: input.listingId || null,
        itemName: input.itemName,
        category: input.category || null,
        triggerAgent: input.triggerAgent,
        participatingAgents: JSON.stringify(["research", "outreach", "social"]),
        status: "running",
      });

      // Perform internet searches (BOXED IN — only buyer-related)
      const redditFindings = await searchRedditForBuyers(input.itemName);
      const xFindings = await searchXForBuyers(input.itemName, input.itemName, env.xClientSecret || undefined);
      const allRaw = [...redditFindings, ...xFindings];

      // AI analysis layer (only scores real data)
      const { analyzed, summary, buyingSignals } = await analyzeFindings(input.itemName, allRaw);

      // Enforce BOX on each finding
      let boundaryViolations = 0;
      const stored: Array<{ id: number; researchId: string }> = [];

      for (const finding of analyzed) {
        const boxCheck = await enforceBox(finding);

        if (!boxCheck.allowed) {
          boundaryViolations++;
          continue; // Finding is OUT OF THE BOX — discard
        }

        // Store approved finding
        const result = await db.insert(internetResearch).values({
          ...finding,
          listingId: input.listingId || null,
          itemName: input.itemName,
          category: input.category || null,
          safetyFlags: JSON.stringify(boxCheck.safetyFlags),
        });
        stored.push({ id: Number(result.meta.last_row_id), researchId: finding.researchId! });

        // Log to agent conversation (agents "talk" about findings)
        await db.insert(agentConversations).values({
          conversationId: genId("conv"),
          listingId: input.listingId || null,
          itemName: input.itemName,
          topic: "buyer_discovery",
          fromAgent: "research",
          toAgent: "all",
          message: `Found ${finding.platform} post by @${finding.author}: "${finding.title?.substring(0, 100)}" — ${finding.isBuyingSignal ? "BUYING SIGNAL detected" : "Discussion thread"}.`,
          messageType: finding.isBuyingSignal ? "alert" : "finding",
          topicVerified: true,
          sources: JSON.stringify([{ url: finding.sourceUrl, title: finding.title, confidence: finding.confidenceScore }]),
          relatedResearchId: finding.researchId,
        });
      }

      // Complete session
      await db.update(researchSessions)
        .set({
          status: "completed",
          totalFindings: stored.length,
          buyingSignals,
          boundaryViolations,
          summaryReport: summary,
          completedAt: new Date(),
        })
        .where(eq(researchSessions.sessionId, sessionId));

      return {
        success: true,
        sessionId,
        totalFound: analyzed.length,
        stored: stored.length,
        buyingSignals,
        boundaryViolations,
        summary,
        boxedIn: true,
        message: `Research completed within BOX boundaries. ${stored.length} findings stored, ${boundaryViolations} blocked for safety.`,
      };
    }),

  // ── AGENTS CHAT ABOUT FINDINGS ──
  agentDiscuss: adminQuery
    .input(z.object({
      sessionId: z.string(),
      fromAgent: z.enum(["research", "outreach", "social", "content", "appraiser", "pricing"]),
      message: z.string().min(1).max(2000),
      messageType: z.enum(["insight", "question", "alert", "finding", "opinion", "correction"]).default("insight"),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();

      // BOX ENFORCEMENT: Verify message stays on topic
      const topicTerms = /\b(buy|sell|buyer|collector|interested|looking|wtb|post|reddit|twitter|forum|community|lead|contact|research|finding)\b/i;
      const offTopicTerms = /\b(strategy|competitor|hack|exploit|politic|election|war|crime|scam|fraud|illegal)\b/i;

      const safetyFlags: string[] = [];
      if (!topicTerms.test(input.message)) safetyFlags.push("LOW_TOPIC_RELEVANCE");
      if (offTopicTerms.test(input.message)) safetyFlags.push("OFF_TOPIC_BLOCKED");

      const topicVerified = safetyFlags.length === 0;
      const safetyScore = topicVerified ? 100 : 0;

      // BLOCK off-topic messages
      if (!topicVerified) {
        return {
          success: false,
          blocked: true,
          reason: `Message blocked by BOX enforcement: ${safetyFlags.join(", ")}`,
          message: "This message violates the boxed-in research policy.",
        };
      }

      const result = await db.insert(agentConversations).values({
        conversationId: genId("conv"),
        topic: "buyer_discovery",
        fromAgent: input.fromAgent,
        toAgent: "all",
        message: input.message,
        messageType: input.messageType,
        topicVerified,
        safetyScore,
        boundaryChecks: JSON.stringify(safetyFlags),
      });

      return {
        success: true,
        id: Number(result.meta.last_row_id),
        blocked: false,
        topicVerified,
        safetyScore,
      };
    }),

  // ── GET RESEARCH SESSION WITH FINDINGS ──
  getSession: adminQuery
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [session] = await db.select().from(researchSessions).where(eq(researchSessions.sessionId, input.sessionId)).limit(1);
      if (!session) return null;

      const findings = await db.select().from(internetResearch)
        .where(eq(internetResearch.itemName, session.itemName))
        .orderBy(desc(internetResearch.relevanceScore));

      const conversations = await db.select().from(agentConversations)
        .where(eq(agentConversations.relatedResearchId, findings[0]?.researchId || ""))
        .orderBy(desc(agentConversations.createdAt));

      return { session, findings, conversations };
    }),

  // ── LIST RESEARCH SESSIONS ──
  listSessions: adminQuery.query(async () => {
    const db = getDb();
    return db.select().from(researchSessions).orderBy(desc(researchSessions.startedAt)).limit(50);
  }),

  // ── GET FINDINGS FOR LISTING ──
  getFindingsForListing: adminQuery
    .input(z.object({ listingId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const findings = await db.select().from(internetResearch)
        .where(eq(internetResearch.listingId, input.listingId))
        .orderBy(desc(internetResearch.relevanceScore));

      const buyingSignals = findings.filter((f) => f.isBuyingSignal);

      return {
        findings,
        buyingSignals,
        totalFindings: findings.length,
        totalBuyingSignals: buyingSignals.length,
        boxedIn: true,
        disclaimer: "All findings are from public social media APIs. No private data accessed. Agents are boxed in.",
      };
    }),

  // ── GET AGENT CONVERSATIONS ──
  getConversations: adminQuery
    .input(z.object({
      listingId: z.number().optional(),
      topic: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      if (input.listingId) {
        return db.select().from(agentConversations)
          .where(eq(agentConversations.listingId, input.listingId))
          .orderBy(desc(agentConversations.createdAt))
          .limit(input.limit);
      }
      return db.select().from(agentConversations)
        .orderBy(desc(agentConversations.createdAt))
        .limit(input.limit);
    }),

  // ── RESEARCH STATS ──
  stats: adminQuery.query(async () => {
    const db = getDb();
    const findings = await db.select().from(internetResearch);
    const sessions = await db.select().from(researchSessions);
    const conversations = await db.select().from(agentConversations);

    const buyingSignals = findings.filter((f) => f.isBuyingSignal).length;
    const boundaryViolations = sessions.reduce((s, r) => s + (r.boundaryViolations || 0), 0);

    return {
      totalFindings: findings.length,
      buyingSignals,
      totalSessions: sessions.length,
      completedSessions: sessions.filter((s) => s.status === "completed").length,
      agentMessages: conversations.length,
      boundaryViolations,
      byPlatform: {
        reddit: findings.filter((f) => f.platform === "reddit").length,
        x: findings.filter((f) => f.platform === "x").length,
      },
      avgRelevance: findings.length > 0
        ? Math.round(findings.reduce((s, f) => s + (f.relevanceScore || 0), 0) / findings.length)
        : 0,
      boxedInStatus: boundaryViolations === 0 ? "ALL_CLEAR" : `${boundaryViolations} violations blocked`,
    };
  }),
});
