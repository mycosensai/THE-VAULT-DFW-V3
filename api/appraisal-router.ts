import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { appraisals } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { openaiChat, openaiVision } from "./lib/openai";
import { autoTriggerFromAction } from "./lib/auto-trigger";
import { getCommissionRateFromTiers } from "./lib/commission";

/**
 * Build a strict anti-hallucination appraisal prompt.
 * The AI must ONLY state what it knows from training data.
 * It must NEVER invent specific eBay listings, auction results, or sales that it cannot verify.
 */
function buildAppraisalPrompt(
  itemName: string,
  category: string,
  condition: string,
  description: string,
  imageUrl?: string
): string {
  return `You are a senior appraiser at a major auction house. A client has submitted an item for valuation.

YOUR RULES — VIOLATING THESE WILL INVALIDATE YOUR APPRAISAL:
1. NEVER invent specific sold listings, auction results, or prices from eBay, Christie's, Sotheby's, or any marketplace you cannot verify live.
2. NEVER provide URLs, listing IDs, or specific dates for sales you cannot confirm.
3. If you do not have enough information to value the item confidently, state that explicitly and provide a very wide range or refuse to estimate.
4. Only cite general market knowledge — e.g., "Patek Philippe Nautilus 5711s in stainless steel typically trade between $X and $Y in the secondary market based on condition" — NOT "Sold on eBay March 2024 for $Z."
5. Condition must materially affect your estimate. Mint = top of range. Fair/poor = bottom of range.
6. If an image URL is provided, describe what you observe and factor it into condition assessment.
7. Always include a confidence level: HIGH (you have strong training data on this exact item), MEDIUM (similar items exist but this is specialized), or LOW (insufficient data — estimate is speculative).
8. The comparable sales section must ONLY contain items you are genuinely aware of from your training knowledge. If unsure, leave the array empty rather than invent.

ITEM DETAILS:
- Name: ${itemName}
- Category: ${category}
- Condition (as reported by owner): ${condition}
- Description: ${description || "None provided"}
${imageUrl ? `- Image provided: ${imageUrl}` : "- No image provided"}

Respond ONLY with this JSON structure. Do not add markdown, commentary, or explanation outside the JSON:

{
  "estimatedValue": number,
  "valueRangeLow": number,
  "valueRangeHigh": number,
  "confidence": "high" | "medium" | "low",
  "conditionAssessment": "string describing what condition the item appears to be in based on description/image",
  "marketAnalysis": "1-2 paragraph analysis using ONLY general market knowledge. No fake specific sales.",
  "comparableSales": [
    {
      "itemDescription": "general description of a comparable type — NOT a specific fake listing",
      "typicalRangeLow": number,
      "typicalRangeHigh": number,
      "basis": "general market knowledge" | "training data" | "public auction records"
    }
  ],
  "factorsIncreasingValue": ["factor 1", "factor 2"],
  "factorsDecreasingValue": ["factor 1", "factor 2"],
  "disclaimer": "This is an AI-generated estimate for informational purposes only. It is NOT a certified appraisal. For insurance, legal, or sale purposes, consult a licensed professional appraiser who can physically inspect the item."
}

If you cannot produce a meaningful estimate, set estimatedValue to 0, confidence to "low", and explain why in marketAnalysis.`;
}

export const appraisalRouter = createRouter({
  create: publicQuery
    .input(
      z.object({
        itemName: z.string().min(1).max(200),
        category: z.string().min(1).max(100),
        condition: z.string().optional(),
        description: z.string().max(2000).optional(),
        imageUrl: z.string().optional().refine(
          (v) => !v || v.startsWith("data:") || /^https?:\/\//.test(v),
          "Must be a URL or base64 data URI"
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      // Create pending appraisal
      const insertResult = await db.insert(appraisals).values({
        userId: ctx.user?.id || null,
        itemName: input.itemName,
        category: input.category,
        condition: input.condition || "good",
        description: input.description || "",
        imageUrl: input.imageUrl || null,
        status: "pending",
      });

      const appraisalId = Number(insertResult.meta.last_row_id);

      // Run AI analysis
      try {
        const prompt = buildAppraisalPrompt(
          input.itemName,
          input.category,
          input.condition || "good",
          input.description || "",
          input.imageUrl
        );

        const text = input.imageUrl
          ? await openaiVision(input.imageUrl, prompt, "gpt-4o")
          : (await openaiChat({
              model: "gpt-4o",
              messages: [
                { role: "system", content: "You are an expert luxury collectible appraiser." },
                { role: "user", content: prompt },
              ],
              temperature: 0.2,
              max_tokens: 4096,
            })).choices[0]?.message?.content ?? "";

        // Parse the AI response
        let analysis: any;
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            analysis = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error("No JSON found in response");
          }
        } catch {
          // Fallback: extract any dollar amount as rough estimate
          const valueMatch = text.match(/\$?([\d,]+(?:\.\d{2})?)\s/);
          const estimatedValue = valueMatch
            ? parseFloat(valueMatch[1].replace(/,/g, ""))
            : 0;
          analysis = {
            estimatedValue,
            valueRangeLow: estimatedValue > 0 ? estimatedValue * 0.5 : 0,
            valueRangeHigh: estimatedValue > 0 ? estimatedValue * 1.5 : 0,
            confidence: "low",
            conditionAssessment: "Unable to assess from provided information.",
            marketAnalysis: text.substring(0, 800),
            comparableSales: [],
            factorsIncreasingValue: [],
            factorsDecreasingValue: [],
            disclaimer: "This is an AI-generated estimate for informational purposes only. It is NOT a certified appraisal.",
          };
        }

        const ev = Number(analysis.estimatedValue) || 0;
        const commissionRate = await getCommissionRateFromTiers(db, ev);
        const commissionEstimate = ev * (parseFloat(commissionRate) / 100);

        // Update appraisal with results
        await db.update(appraisals).set({
          estimatedValue: String(ev),
          valueRangeLow: String(Number(analysis.valueRangeLow) || ev * 0.5),
          valueRangeHigh: String(Number(analysis.valueRangeHigh) || ev * 1.5),
          confidence: analysis.confidence || "low",
          marketAnalysis: analysis.marketAnalysis || "No market analysis available.",
          comparableSales: JSON.stringify(analysis.comparableSales || []),
          status: ev > 0 ? "completed" : "failed",
          commissionEstimate: String(commissionEstimate),
          commissionRate: commissionRate,
        }).where(eq(appraisals.id, appraisalId));

        // ─── AUTONOMOUS TRIGGER: Dispatch outreach agents on high-value appraisal ───
        if (ev >= 1000) {
          autoTriggerFromAction("appraise", input.itemName, input.category, ev);
        }

        return {
          id: appraisalId,
          status: ev > 0 ? "completed" : "failed",
          estimatedValue: ev,
          valueRangeLow: Number(analysis.valueRangeLow) || ev * 0.5,
          valueRangeHigh: Number(analysis.valueRangeHigh) || ev * 1.5,
          confidence: analysis.confidence || "low",
          conditionAssessment: analysis.conditionAssessment || "Not assessed.",
          marketAnalysis: analysis.marketAnalysis || "",
          comparableSales: analysis.comparableSales || [],
          factorsIncreasingValue: analysis.factorsIncreasingValue || [],
          factorsDecreasingValue: analysis.factorsDecreasingValue || [],
          disclaimer: analysis.disclaimer || "This is an AI-generated estimate for informational purposes only.",
          commissionRate,
          commissionEstimate,
        };
      } catch (error) {
        await db.update(appraisals).set({
          status: "failed",
          marketAnalysis: `Appraisal engine error: ${error instanceof Error ? error.message : "Unknown error"}`,
        }).where(eq(appraisals.id, appraisalId));

        return {
          id: appraisalId,
          status: "failed",
          error: error instanceof Error ? error.message : "Appraisal failed",
        };
      }
    }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [appraisal] = await db
        .select()
        .from(appraisals)
        .where(eq(appraisals.id, input.id))
        .limit(1);

      if (!appraisal) return null;

      // Parse comparableSales JSON safely
      let comparableSales: any[] = [];
      try {
        if (appraisal.comparableSales) {
          comparableSales = JSON.parse(appraisal.comparableSales as string);
        }
      } catch {
        comparableSales = [];
      }

      return {
        ...appraisal,
        comparableSales,
      };
    }),

  list: publicQuery.query(async ({ ctx }) => {
    const db = getDb();
    if (!ctx.user?.id) return [];
    const rows = await db
      .select()
      .from(appraisals)
      .where(eq(appraisals.userId, ctx.user.id))
      .orderBy(desc(appraisals.createdAt));

    return rows.map((row) => {
      let comparableSales: any[] = [];
      try {
        if (row.comparableSales) comparableSales = JSON.parse(row.comparableSales as string);
      } catch { /* ignore */ }
      return { ...row, comparableSales };
    });
  }),
});
