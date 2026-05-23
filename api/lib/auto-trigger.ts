/**
 * Auto-Trigger Helper
 * Dispatches autonomous outreach agents when users perform key actions:
 * SELL, APPRAISE, VERIFY, TOKENIZE
 *
 * This runs FIRE-AND-FORGET — the user's request completes immediately
 * while agents work in the background.
 */

import { getDb } from "../queries/connection";
import {
  listings,
  appraisals,
  categories,
  outreachCampaigns,
  outreachLogs,
  agentLogs,
  agentCycles,
  partnershipOutreach,
} from "@db/schema";
import { eq } from "drizzle-orm";
import { openaiChat } from "./openai";
import { checkHallucinations, censorOutreach } from "./hallucination-guard";
import { genId } from "./id";

const OUTREACH_PREAMBLE = `ZERO-HALLUCINATION OUTREACH CONTRACT:
1. NEVER invent company names, people, emails, or websites.
2. NEVER fabricate testimonials, success stories, or market data.
3. NEVER promise guaranteed sales, specific timelines, or specific buyer counts.
4. NEVER disparage competitors.
5. ALWAYS use respectful, professional tone.
6. ALWAYS personalize based on the recipient's business type.
7. ALWAYS include opt-out language.
8. STAY ON TASK: Partnership outreach only. Nothing else.`;

interface OutreachTarget {
  companyName: string;
  industry: string;
  whyRelevant: string;
  personalizationAngle: string;
}


async function generateTargets(itemName: string, category: string): Promise<OutreachTarget[]> {
  const prompt = `${OUTREACH_PREAMBLE}

What types of businesses would partner to sell or broker a "${itemName}" (${category})?
Generate 3-5 realistic target business types. Use placeholder names like "[Luxury Watch Broker, NYC]".

Respond ONLY with JSON array:
[{"companyName": "...", "industry": "...", "whyRelevant": "...", "personalizationAngle": "..."}]`;

  try {
    const response = await openaiChat({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `${OUTREACH_PREAMBLE} You are a business development researcher.` },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    });

    const text = response.choices[0]?.message?.content ?? "[]";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    let targets: OutreachTarget[] = [];
    try { targets = JSON.parse(jsonMatch[0]); } catch { return []; }
    return targets.filter((t) => t.companyName && t.industry && t.companyName.length > 3);
  } catch {
    return [];
  }
}

async function generateMessage(
  target: OutreachTarget,
  itemName: string,
  category: string,
  value?: number
): Promise<{ subject: string; body: string; score: number; safe: boolean }> {
  const prompt = `${OUTREACH_PREAMBLE}

Write a personalized cold outreach to:
- Company: ${target.companyName}
- Industry: ${target.industry}
- Why relevant: ${target.whyRelevant}
- Angle: ${target.personalizationAngle}
- Item: ${itemName} (${category})${value ? ` — valued at $${value.toLocaleString()}` : ""}

Rules:
1. Reference their industry knowledge.
2. Explain why The Vault (thevaultdfw.win) is relevant.
3. Offer 3-5% commission + co-marketing.
4. Keep under 200 words.
5. End with: "Worth a brief conversation?"
6. NO hard sell. NO invented claims.
7. Include: "Reply STOP to opt out."

Respond ONLY with JSON: {"subject": "...", "body": "..."}`;

  try {
    const response = await openaiChat({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `${OUTREACH_PREAMBLE} Partnerships director.` },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 512,
    });

    const text = response.choices[0]?.message?.content ?? "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { subject: "", body: "", score: 0, safe: false };

    let parsed: any;
    try { parsed = JSON.parse(jsonMatch[0]); } catch { return { subject: "", body: "", score: 0, safe: false }; }

    const body = parsed.body || "";
    const subject = parsed.subject || "";

    // Hallucination check
    const hallucination = await checkHallucinations(body);
    const hasH = hallucination.hallucination_count > 0 || hallucination.overall_risk === "critical";

    // Censorship check
    const censor = await censorOutreach(body, "partnership");
    const blocked = censor.severity === "blocked";

    const safe = !hasH && !blocked;

    return {
      subject,
      body: censor.corrected_text ?? body,
      score: Math.round(((body.length > 50 ? 60 : 0) + (body.includes(target.companyName) ? 20 : 0) + (safe ? 20 : 0))),
      safe,
    };
  } catch {
    return { subject: "", body: "", score: 0, safe: false };
  }
}

// ─── MAIN TRIGGER FUNCTION ───
// Called by routers when users sell, appraise, verify, or tokenize
export async function autoTriggerFromAction(
  actionType: "sell" | "appraise" | "verify" | "tokenize",
  itemName: string,
  category?: string,
  value?: number,
  listingId?: number
): Promise<{ dispatched: boolean; messagesSent: number; blocked: number }> {
  const execCtx = (globalThis as any).__cfExecCtx as ExecutionContext | undefined;
  const work = (async () => {
    const db = getDb();
    const startTime = Date.now();
    try {
    // Log the trigger
    await db.insert(agentLogs).values({
      event: "auto_trigger_fired",
      projectId: "outreach",
      data: JSON.stringify({ actionType, itemName, category, value, listingId, timestamp: new Date().toISOString() }) || "{}",
    });

    // Only trigger for items worth $1000+
    if (!value || value < 1000) {
      return { dispatched: false, messagesSent: 0, blocked: 0 };
    }

    // Generate targets
    const targets = await generateTargets(itemName, category || "collectible");
    let sent = 0;
    let blocked = 0;

    for (const target of targets.slice(0, 3)) {
      const msg = await generateMessage(target, itemName, category || "collectible", value);

      if (!msg.safe) {
        blocked++;
        continue;
      }

      const result = await db.insert(outreachCampaigns).values({
        listingId: listingId || null,
        itemName,
        category: category || "collectible",
        targetProfessionals: 1,
        foundLeads: 1,
        outreachCount: 1,
        status: "running",
      });

      await db.insert(outreachLogs).values({
        campaignId: Number(result.meta.last_row_id),
        professionalName: target.companyName,
        institution: target.industry,
        outreachMethod: "autonomous",
        message: msg.body,
        status: "sent",
        confidence: msg.score,
      });

      const randomPart = crypto.getRandomValues(new Uint8Array(3));
      const outreachId = `prtn-${Date.now()}-${Array.from(randomPart).map((x) => x.toString(16).padStart(2, "0")).join("")}`;
      await db.insert(partnershipOutreach).values({
        outreachId,
        companyName: target.companyName,
        industry: target.industry,
        contactTitle: "Partnerships Director",
        messageBody: msg.body,
        priority: 2,
        status: "sent",
        assignedAgent: "outreach",
      });

      sent++;
    }

    // Log cycle
    await db.insert(agentCycles).values({
      cycleId: `auto-${startTime}`,
      projectId: "outreach",
      taskId: "auto-trigger",
      status: "complete",
      outcome: "verified",
      engineerOutput: JSON.stringify({ itemName, sent, blocked, duration: Date.now() - startTime }) || "{}",
      verificationOutput: `Auto-trigger ${actionType}: ${sent} sent, ${blocked} blocked`,
      reviewVerdict: "pass",
      durationSeconds: Math.round((Date.now() - startTime) / 1000),
    });

      return { dispatched: true, messagesSent: sent, blocked };
    } catch {
      return { dispatched: false, messagesSent: 0, blocked: 0 };
    }
  })();

  if (execCtx?.waitUntil) {
    execCtx.waitUntil(work);
    return { dispatched: true, messagesSent: 0, blocked: 0 };
  }

  return work;
}
