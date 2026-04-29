/**
 * Partnership Outreach Router
 * Cold outreach to competitors and complementary businesses for partnership deals.
 * Agents reach out with respectful tone, competitive pay structure offers.
 */

import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { partnershipOutreach, agentLogs } from "@db/schema";
import { openaiChat } from "./lib/openai";
import { logAudit, getClientIP } from "./security";

export const partnershipRouter = createRouter({
  // ── LIST ALL OUTREACH ──
  list: adminQuery
    .input(z.object({
      status: z.string().optional(),
      industry: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      if (input.status && input.industry) {
        return db
          .select()
          .from(partnershipOutreach)
          .where(and(
            eq(partnershipOutreach.status, input.status),
            eq(partnershipOutreach.industry, input.industry),
          ))
          .orderBy(desc(partnershipOutreach.priority), desc(partnershipOutreach.createdAt))
          .limit(input.limit);
      }
      if (input.status) {
        return db
          .select()
          .from(partnershipOutreach)
          .where(eq(partnershipOutreach.status, input.status))
          .orderBy(desc(partnershipOutreach.priority), desc(partnershipOutreach.createdAt))
          .limit(input.limit);
      }
      return db
        .select()
        .from(partnershipOutreach)
        .orderBy(desc(partnershipOutreach.priority), desc(partnershipOutreach.createdAt))
        .limit(input.limit);
    }),

  // ── GET SINGLE ──
  getById: adminQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [outreach] = await db
        .select()
        .from(partnershipOutreach)
        .where(eq(partnershipOutreach.id, input.id))
        .limit(1);
      return outreach ?? null;
    }),

  // ── ADD TARGET COMPANY ──
  addTarget: adminQuery
    .input(z.object({
      companyName: z.string().min(1).max(200),
      website: z.string().url().optional(),
      industry: z.string().min(1).max(100),
      contactName: z.string().optional(),
      contactEmail: z.string().email().optional(),
      contactTitle: z.string().optional(),
      outreachMethod: z.enum(["email", "linkedin", "form"]).default("email"),
      priority: z.number().min(1).max(5).default(2),
      customMessage: z.string().max(5000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const outreachId = `prtn-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;

      // Generate respectful partnership message if not provided
      let messageBody = input.customMessage ?? "";
      if (!messageBody) {
        const prompt = `Write a respectful, professional cold outreach email from The Vault (thevaultdfw.win), a luxury collector exchange marketplace, to ${input.companyName} in the ${input.industry} industry.

TONE RULES:
- Never disparage their business
- Acknowledge their reputation and expertise
- Propose a mutually beneficial partnership
- Offer our competitive pay structure: 3-5% referral commission, co-marketing opportunities, cross-listing privileges
- Keep under 250 words
- End with a soft call-to-action ("Would you be open to a brief conversation?")
- No hard sell. No pressure.

Write the complete email body only. No subject line.`;

        const response = await openaiChat({
          model: "gpt-4o",
          messages: [
            { role: "system", content: "You are a senior partnerships director at The Vault." },
            { role: "user", content: prompt },
          ],
          temperature: 0.4,
          max_tokens: 800,
        });
        messageBody = response.choices[0]?.message?.content ?? "Partnership inquiry from The Vault.";
      }

      const result = await db.insert(partnershipOutreach).values({
        outreachId,
        companyName: input.companyName,
        website: input.website ?? null,
        industry: input.industry,
        contactName: input.contactName ?? null,
        contactEmail: input.contactEmail ?? null,
        contactTitle: input.contactTitle ?? null,
        outreachMethod: input.outreachMethod,
        messageBody,
        priority: input.priority,
        status: "draft",
      });

      await db.insert(agentLogs).values({
        event: "partnership_target_added",
        projectId: "outreach",
        data: JSON.stringify({
          outreachId,
          companyName: input.companyName,
          industry: input.industry,
          addedBy: ctx.user?.id,
        }),
      });

      return { id: Number(result.meta.last_row_id), outreachId, success: true };
    }),

  // ── AI GENERATE BATCH TARGETS ──
  generateTargets: adminQuery
    .input(z.object({
      industry: z.string().min(1),
      count: z.number().min(1).max(20).default(5),
      targetRegion: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const prompt = `Research ${input.industry} companies that would make good partnership candidates for a luxury collectible exchange marketplace (watches, jewelry, art, cars, memorabilia).

Return ONLY a JSON array of objects with these fields:
- companyName: real or realistic company name
- website: realistic domain (use example.com placeholder if unsure)
- industry: the industry
- contactTitle: realistic title of partnerships/contact person
- reason: why they would be a good partner

Generate ${input.count} candidates.${input.targetRegion ? ` Focus on ${input.targetRegion} region.` : ""}

IMPORTANT: Use respectful, realistic placeholder information. Never use real personal email addresses. Use "partnerships@example.com" style placeholders.`;

      const response = await openaiChat({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a business development researcher. Respond with valid JSON array only." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 2048,
      });

      const text = response.choices[0]?.message?.content ?? "[]";
      let targets: any[] = [];
      try {
        const parsed = JSON.parse(text);
        targets = Array.isArray(parsed) ? parsed : parsed.companies ?? parsed.targets ?? [];
      } catch {
        targets = [];
      }

      const created: Array<{ id: number; outreachId: string; companyName: string }> = [];
      for (const t of targets.slice(0, input.count)) {
        const outreachId = `prtn-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
        const msg = `Dear ${t.companyName} Team,

I hope this message finds you well. I am reaching out from The Vault (thevaultdfw.win), a curated marketplace for luxury collectibles.

We have been following ${t.companyName}'s work in the ${t.industry} space with great interest. ${t.reason}

We are exploring partnerships with respected companies like yours to create mutual value. Our partnership structure includes:

- 3-5% referral commission on closed sales
- Co-marketing opportunities across our platforms
- Cross-listing privileges for authenticated items
- Priority placement for partner-referred inventory

Would you be open to a brief conversation to explore how we might collaborate?

Respectfully,
The Vault Partnerships Team
https://thevaultdfw.win`;

        const result = await db.insert(partnershipOutreach).values({
          outreachId,
          companyName: t.companyName,
          website: t.website ?? null,
          industry: t.industry ?? input.industry,
          contactTitle: t.contactTitle ?? "Partnerships Director",
          messageBody: msg,
          priority: 2,
          status: "draft",
          assignedAgent: "outreach",
        });
        created.push({ id: Number(result.meta.last_row_id), outreachId, companyName: t.companyName });
      }

      logAudit({
        ip: getClientIP(ctx.req),
        method: "POST",
        path: "partnership.generateTargets",
        userId: ctx.user?.id,
        action: "partnership_targets_generated",
        details: `industry:${input.industry} count:${created.length}`,
      });

      return { generated: created.length, targets: created };
    }),

  // ── UPDATE STATUS ──
  updateStatus: adminQuery
    .input(z.object({
      id: z.number(),
      status: z.enum(["draft", "sent", "responded", "meeting_scheduled", "declined", "partner"]),
      responseNotes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const updates: any = { status: input.status };
      if (input.responseNotes) updates.responseNotes = input.responseNotes;
      if (input.status === "sent") updates.sentAt = new Date();

      await db
        .update(partnershipOutreach)
        .set(updates)
        .where(eq(partnershipOutreach.id, input.id));

      return { success: true, status: input.status };
    }),

  // ── DELETE TARGET ──
  removeTarget: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(partnershipOutreach).where(eq(partnershipOutreach.id, input.id));
      return { success: true };
    }),

  // ── STATS ──
  stats: adminQuery.query(async () => {
    const db = getDb();
    const all = await db.select().from(partnershipOutreach);
    return {
      total: all.length,
      draft: all.filter((o) => o.status === "draft").length,
      sent: all.filter((o) => o.status === "sent").length,
      responded: all.filter((o) => o.status === "responded").length,
      meetingScheduled: all.filter((o) => o.status === "meeting_scheduled").length,
      declined: all.filter((o) => o.status === "declined").length,
      partners: all.filter((o) => o.status === "partner").length,
    };
  }),
});
