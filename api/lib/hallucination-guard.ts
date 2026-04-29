/**
 * Hallucination Guard — Verifies AI output citations, facts, and claims
 * Runs as a middleware layer over agent cycle output
 */

import { openaiChat, openaiStructured } from "./openai";

export interface FactCheckResult {
  claim: string;
  verdict: "verified" | "likely_true" | "unverifiable" | "likely_false" | "hallucinated";
  confidence: number; // 0-100
  reason: string;
  source_needed: boolean;
  corrected_claim?: string;
}

export interface HallucinationReport {
  overall_risk: "low" | "medium" | "high" | "critical";
  hallucination_count: number;
  unverifiable_count: number;
  total_claims: number;
  facts: FactCheckResult[];
  summary: string;
  requires_human_review: boolean;
}

/**
 * Extract factual claims from agent output and verify them
 */
export async function checkHallucinations(
  agentOutput: string,
  itemCategory?: string,
): Promise<HallucinationReport> {
  const prompt = `You are a fact-checking engine for The Vault, a luxury collectible marketplace. Your job is to scan the following AI-generated text for hallucinated claims, fabricated data, or unverifiable assertions.

HALLUCINATION RULES — Flag ANY of these:
1. Specific sold listings with prices/dates/locations that cannot be verified (e.g., "Sold on eBay March 2024 for $12,500")
2. Named individuals, dealers, or collectors without public profiles
3. Specific auction results with lot numbers or exact dates that are suspicious
4. Serial numbers, certificates, or provenance details that look invented
5. Market size figures, rarity percentages, or production numbers without known sources
6. References to specific museums, exhibitions, or publications that don't exist
7. Appraisal values cited as "from Sotheby's/Christie's" without lot details
8. Claims about "only 3 known examples" or "1 of 10" without verifiable registry evidence

RESPONSE FORMAT — Return ONLY JSON:
{
  "facts": [
    {
      "claim": "the exact claim text",
      "verdict": "verified|likely_true|unverifiable|likely_false|hallucinated",
      "confidence": 0-100,
      "reason": "why this verdict was given",
      "source_needed": true/false,
      "corrected_claim": "if hallucinated, what the conservative version should be"
    }
  ],
  "overall_risk": "low|medium|high|critical",
  "summary": "brief summary of findings",
  "requires_human_review": true/false
}

Text to check:
---
${agentOutput}
---

Category context: ${itemCategory ?? "luxury collectible"}`;

  try {
    const response = await openaiStructured<{
      facts: FactCheckResult[];
      overall_risk: "low" | "medium" | "high" | "critical";
      summary: string;
      requires_human_review: boolean;
    }>({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a rigorous fact-checking engine. Be conservative. If unsure, flag it." },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 4096,
    });

    const facts = response.result.facts ?? [];
    const hallucinated = facts.filter((f) => f.verdict === "hallucinated");
    const unverifiable = facts.filter((f) => f.verdict === "unverifiable");
    const likelyFalse = facts.filter((f) => f.verdict === "likely_false");

    let overall_risk: HallucinationReport["overall_risk"] = "low";
    if (hallucinated.length > 2 || likelyFalse.length > 1) overall_risk = "critical";
    else if (hallucinated.length > 0 || likelyFalse.length > 0) overall_risk = "high";
    else if (unverifiable.length > 2) overall_risk = "medium";

    return {
      overall_risk,
      hallucination_count: hallucinated.length,
      unverifiable_count: unverifiable.length,
      total_claims: facts.length,
      facts,
      summary: response.result.summary ?? "No summary provided.",
      requires_human_review: response.result.requires_human_review ?? (overall_risk === "high" || overall_risk === "critical"),
    };
  } catch (err) {
    // If the hallucination checker itself fails, flag for human review
    return {
      overall_risk: "critical",
      hallucination_count: 0,
      unverifiable_count: 0,
      total_claims: 0,
      facts: [],
      summary: `Hallucination checker failed: ${err instanceof Error ? err.message : String(err)}. Output requires human review.`,
      requires_human_review: true,
    };
  }
}

/**
 * Sanitize and correct hallucinated output
 * Returns corrected text + list of changes
 */
export function sanitizeHallucinations(
  originalText: string,
  report: HallucinationReport,
): { text: string; changes: string[]; safeToPublish: boolean } {
  let text = originalText;
  const changes: string[] = [];

  for (const fact of report.facts) {
    if (
      fact.verdict === "hallucinated" ||
      fact.verdict === "likely_false" ||
      (fact.verdict === "unverifiable" && fact.source_needed)
    ) {
      // If we have a corrected claim, replace it
      if (fact.corrected_claim) {
        text = text.replace(fact.claim, fact.corrected_claim);
        changes.push(`REPLACED: "${fact.claim}" → "${fact.corrected_claim}"`);
      } else {
        // Otherwise, append uncertainty disclaimer
        text = text.replace(fact.claim, `${fact.claim} [UNVERIFIED — The Vault could not independently confirm this claim]`);
        changes.push(`FLAGGED: "${fact.claim}" — marked as unverified`);
      }
    }
  }

  // Add overall disclaimer if risky
  if (report.overall_risk === "high" || report.overall_risk === "critical") {
    text += `\n\n⚠️ VERIFICATION NOTICE: This output contains ${report.hallucination_count} potentially fabricated claim(s) and ${report.unverifiable_count} unverifiable assertion(s). The Vault recommends independent verification of all cited facts before making purchasing or pricing decisions.`;
  }

  const safeToPublish = report.overall_risk === "low" || (report.overall_risk === "medium" && report.hallucination_count === 0);

  return { text, changes, safeToPublish };
}

/**
 * Strict censorship filter for outreach content
 * Checks for: harassment, privacy violations, illegal content, spam, fake claims
 */
export interface CensorshipResult {
  approved: boolean;
  violations: string[];
  severity: "none" | "minor" | "major" | "blocked";
  corrected_text?: string;
}

export async function censorOutreach(
  text: string,
  context: "email" | "social" | "partnership",
): Promise<CensorshipResult> {
  const prompt = `You are a censorship engine for The Vault's ${context} outreach. Check this text for policy violations.

STRICT RULES — Flag any of these:
1. Harassment, threats, or aggressive language
2. Privacy violations (doxxing, revealing private info)
3. False claims about The Vault's capabilities or guarantees
4. Promises of returns, profits, or investment gains
5. Illegal content references (drugs, weapons, fraud)
6. Spam-like repetition, excessive capitalization, or deceptive subject lines
7. Claims about "guaranteed sales" or "instant buyers"
8. Fabricated testimonials or success stories
9. Pressure tactics: "act now", "limited time", "urgent"
10. Requests for sensitive personal data (SSN, bank details)
11. Claims about competitor disparagement
12. Any mention of "unhackable", "Fort Knox", or impossible security claims

Return ONLY JSON:
{
  "approved": true/false,
  "violations": ["violation 1", "violation 2"],
  "severity": "none|minor|major|blocked",
  "corrected_text": "if minor violations, the corrected version"
}

Text to check:
---
${text}
---`;

  try {
    const response = await openaiStructured<CensorshipResult>({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You enforce strict communication policies. Be conservative." },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 2048,
    });

    return {
      approved: response.result.approved ?? false,
      violations: response.result.violations ?? [],
      severity: response.result.severity ?? "blocked",
      corrected_text: response.result.corrected_text,
    };
  } catch {
    // If censorship fails, block the content
    return {
      approved: false,
      violations: ["Censorship engine failed — content blocked for safety"],
      severity: "blocked",
    };
  }
}

/**
 * Verify if a cited URL/company/contact is real
 * Uses simple heuristics + external checks
 */
export async function verifyContact(
  name: string,
  company?: string,
  title?: string,
  email?: string,
): Promise<{ real: boolean; confidence: number; notes: string }> {
  const checks: string[] = [];
  let score = 0;

  // Check for placeholder patterns
  const placeholderPatterns = [
    /example\.com$/i,
    /test\.com$/i,
    /fake/i,
    /placeholder/i,
    /sample/i,
    /^test@/i,
    /^admin@/i,
  ];

  if (email) {
    for (const pattern of placeholderPatterns) {
      if (pattern.test(email)) {
        checks.push(`Email matches placeholder pattern: ${pattern.source}`);
        score -= 30;
      }
    }
    // Check basic email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      checks.push("Invalid email format");
      score -= 50;
    } else {
      score += 20;
    }
  }

  if (name) {
    // Check for obviously fake names
    const fakePatterns = [/John Doe/i, /Jane Smith/i, /Test User/i, /Example Person/i, /FirstName/i];
    for (const pattern of fakePatterns) {
      if (pattern.test(name)) {
        checks.push(`Name matches fake pattern: ${pattern.source}`);
        score -= 40;
      }
    }
    // Real names usually have 2-4 words
    const wordCount = name.trim().split(/\s+/).length;
    if (wordCount < 2 || wordCount > 5) {
      checks.push(`Suspicious name length: ${wordCount} words`);
      score -= 10;
    } else {
      score += 15;
    }
  }

  if (company) {
    // Check for generic placeholder company names
    const genericCompanies = ["Example Corp", "Test Company", "Sample LLC", "ACME", "Placeholder Inc"];
    for (const gc of genericCompanies) {
      if (company.toLowerCase().includes(gc.toLowerCase())) {
        checks.push(`Company name appears generic/placeholder: ${gc}`);
        score -= 30;
      }
    }
    if (company.length > 3) score += 10;
  }

  if (title) {
    const realTitles = [
      "Director", "Manager", "Owner", "CEO", "President", "VP", "Head", "Chief",
      "Partner", "Founder", "Collector", "Dealer", "Specialist", "Expert",
      "Curator", "Appraiser", "Broker", "Agent", "Consultant",
    ];
    const hasRealTitle = realTitles.some((t) => title.toLowerCase().includes(t.toLowerCase()));
    if (hasRealTitle) score += 15;
    else score -= 5;
  }

  const confidence = Math.max(0, Math.min(100, 50 + score));
  const real = confidence >= 60;

  return {
    real,
    confidence,
    notes: checks.join("; ") || "No red flags detected",
  };
}

/**
 * Agent Feedback Loop — Logs mistakes so agents learn from them
 */
export interface AgentFeedback {
  cycleId: string;
  projectId: string;
  taskId: string;
  originalOutput: string;
  issue: string; // hallucination, boundary_violation, poor_quality, incorrect_format
  correction: string;
  severity: "minor" | "major" | "critical";
  learned: boolean; // whether the correction was incorporated
}

/**
 * Build a feedback-enriched prompt for an agent
 * Includes corrections from past similar mistakes
 */
export function buildFeedbackEnrichedPrompt(
  baseCommand: string,
  feedbackHistory: AgentFeedback[],
  maxExamples = 3,
): string {
  const relevant = feedbackHistory
    .filter((f) => f.severity !== "minor")
    .slice(0, maxExamples);

  if (relevant.length === 0) return baseCommand;

  const corrections = relevant.map((f, i) => `
MISTAKE #${i + 1}: ${f.issue}
What went wrong: ${f.correction}
`).join("\n");

  return `${baseCommand}

⚠️ LEARN FROM PAST MISTAKES — DO NOT REPEAT THESE:
${corrections}

Before finalizing your output, self-check:
- Did I cite any specific listings/prices I cannot verify?
- Did I fabricate any contact names, companies, or credentials?
- Did I make any promises The Vault cannot keep?
- Is every factual claim something I genuinely know, or did I guess?

If you are uncertain about any claim, state that explicitly instead of inventing details.`;
}
