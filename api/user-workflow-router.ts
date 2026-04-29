/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  USER EMAIL WORKFLOW SYSTEM                                     ║
 * ║  • Users receive guided next-step emails after actions          ║
 * ║  • Each email includes an agent prompt button                   ║
 * ║  • Users can tell the agent to perform suggested tasks          ║
 * ║  • Agents track workflow progress automatically                 ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { createRouter, publicQuery, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  userWorkflows,
  listings,
  appraisals,
  orders,
  agentLogs,
} from "@db/schema";
import { openaiChat } from "./lib/openai";
import { logFinancialEntry } from "./accounting-router";
import { genId } from "./lib/id";


// ─── WORKFLOW TEMPLATES ───
const WORKFLOW_TEMPLATES: Record<string, { steps: string[]; agentSuggestions: string[] }> = {
  sell: {
    steps: [
      "Submit item details and photos",
      "Get AI appraisal (optional)",
      "Receive appraisal report with market analysis",
      "Pay $20 listing fee",
      "Agents begin buyer outreach automatically",
      "Receive qualified buyer leads",
      "Complete sale with escrow protection",
      "Receive payout minus commission",
    ],
    agentSuggestions: [
      "Run internet research to find buyers for this item",
      "Generate personalized outreach to luxury brokers",
      "Create social media content showcasing the item",
      "Verify the item's condition and authenticity",
      "Analyze comparable sales and suggest pricing",
    ],
  },
  appraise: {
    steps: [
      "Submit item for AI appraisal",
      "AI analyzes item details and market data",
      "Receive detailed appraisal report",
      "Review comparable sales and market trends",
      "Get commission estimate if you choose to sell",
    ],
    agentSuggestions: [
      "Get a second opinion from the expert panel",
      "Run market research on recent comparable sales",
      "Connect with specialist appraisers",
      "List the item for sale based on this appraisal",
    ],
  },
  verify: {
    steps: [
      "Submit item for professional verification",
      "AI runs preliminary checks",
      "Expert review team assesses item",
      "Receive verification certificate",
      "Blockchain certification issued (optional)",
    ],
    agentSuggestions: [
      "Get a full authentication report",
      "Tokenize the item as an NFT",
      "List the verified item on the marketplace",
      "Run security audit on item documentation",
    ],
  },
  tokenize: {
    steps: [
      "Submit item for tokenization",
      "Item verified and authenticated",
      "Digital certificate created",
      "Token minted on blockchain",
      "Token listed in gallery",
    ],
    agentSuggestions: [
      "Create marketing content for the token",
      "Find collectors interested in tokenized items",
      "Run blockchain security verification",
      "List the physical item alongside the token",
    ],
  },
  purchase: {
    steps: [
      "Browse and select item",
      "Complete secure checkout",
      "Payment processed with escrow",
      "Item shipped with insurance",
      "Receive and confirm item",
      "Funds released to seller",
    ],
    agentSuggestions: [
      "Get item verified before shipping",
      "Request condition report from seller",
      "Research the item's provenance",
      "Set up alerts for similar items",
    ],
  },
  register: {
    steps: [
      "Create your Vault account",
      "Set up your collector profile",
      "Add items to your wishlist",
      "Enable notifications for new listings",
      "Get personalized recommendations",
    ],
    agentSuggestions: [
      "Get a free portfolio valuation",
      "Set up alerts for your favorite categories",
      "Connect with other collectors",
      "Learn about our verification services",
    ],
  },
};

// ─── GENERATE NEXT-STEP EMAIL CONTENT ───
async function generateWorkflowEmail(
  triggerType: string,
  itemName?: string,
  currentStep: number = 1
): Promise<{ subject: string; body: string; nextActions: string[]; agentPrompt: string }> {
  const template = WORKFLOW_TEMPLATES[triggerType] || WORKFLOW_TEMPLATES.register;
  const totalSteps = template.steps.length;
  const remainingSteps = template.steps.slice(currentStep - 1);

  const prompt = `Write a professional, warm email for a luxury collectible marketplace called "The Vault" (thevaultdfw.win).

CONTEXT:
- User just completed: ${triggerType}${itemName ? ` for "${itemName}"` : ""}
- Current step: ${currentStep} of ${totalSteps}
- Remaining steps: ${remainingSteps.join(", ")}
- Available agent actions: ${template.agentSuggestions.join(", ")}

Write:
1. A warm, professional email subject line (max 60 chars)
2. Email body (max 200 words) that:
   - Congratulates them on completing the current step
   - Lists the remaining steps clearly
   - Suggests one agent action they can trigger by replying
   - Includes a call-to-action button text
3. The suggested next agent action

Respond ONLY with JSON:
{"subject": "...", "body": "...", "nextActions": ["..."], "agentPrompt": "..."}`;

  try {
    const response = await openaiChat({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You write professional, warm emails for a luxury marketplace. Only respond with valid JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 1024,
    });

    const text = response.choices[0]?.message?.content ?? "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallbackEmail(triggerType, itemName, currentStep);

    let parsed: any;
    try { parsed = JSON.parse(jsonMatch[0]); } catch { return fallbackEmail(triggerType, itemName, currentStep); }

    return {
      subject: parsed.subject || `Your ${triggerType} update — The Vault`,
      body: parsed.body || "Thank you for using The Vault.",
      nextActions: Array.isArray(parsed.nextActions) ? parsed.nextActions : remainingSteps,
      agentPrompt: parsed.agentPrompt || template.agentSuggestions[0],
    };
  } catch {
    return fallbackEmail(triggerType, itemName, currentStep);
  }
}

function fallbackEmail(triggerType: string, itemName?: string, currentStep: number = 1): {
  subject: string; body: string; nextActions: string[]; agentPrompt: string;
} {
  const template = WORKFLOW_TEMPLATES[triggerType] || WORKFLOW_TEMPLATES.register;
  return {
    subject: `Your ${triggerType} update — The Vault`,
    body: `Thank you for ${triggerType}ing${itemName ? ` "${itemName}"` : ""} with The Vault. You're on step ${currentStep} of ${template.steps.length}. Our agents are standing by to assist you.`,
    nextActions: template.steps.slice(currentStep - 1),
    agentPrompt: template.agentSuggestions[0],
  };
}

// ─── TRPC ROUTER ───
export const userWorkflowRouter = createRouter({
  // ── CREATE WORKFLOW (called by other routers on user actions) ──
  create: authedQuery
    .input(z.object({
      triggerType: z.enum(["sell", "appraise", "verify", "tokenize", "purchase", "register"]),
      itemName: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const template = WORKFLOW_TEMPLATES[input.triggerType];

      const workflowId = genId("wf");
      const stepData = {
        steps: template.steps,
        suggestions: template.agentSuggestions,
        current: 1,
      };

      // Generate email content
      const email = await generateWorkflowEmail(input.triggerType, input.itemName, 1);

      const result = await db.insert(userWorkflows).values({
        workflowId,
        userEmail: ctx.user?.email || null,
        userId: ctx.user?.id || null,
        triggerType: input.triggerType,
        itemName: input.itemName || null,
        currentStep: 1,
        totalSteps: template.steps.length,
        stepData: JSON.stringify(stepData),
        emailSent: true,
      });

      return {
        success: true,
        workflowId,
        id: Number(result.meta.last_row_id),
        email,
        steps: template.steps,
        currentStep: 1,
      };
    }),

  // ── ADVANCE WORKFLOW ──
  advance: authedQuery
    .input(z.object({ workflowId: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [wf] = await db.select().from(userWorkflows).where(eq(userWorkflows.workflowId, input.workflowId)).limit(1);
      if (!wf) return { success: false, error: "Workflow not found" };

      const newStep = (wf.currentStep || 1) + 1;
      if (newStep > (wf.totalSteps || 5)) {
        await db.update(userWorkflows).set({ status: "completed", completedAt: new Date() }).where(eq(userWorkflows.id, wf.id));
        return { success: true, completed: true };
      }

      // Generate next email
      const email = await generateWorkflowEmail(wf.triggerType, wf.itemName || undefined, newStep);

      await db.update(userWorkflows).set({
        currentStep: newStep,
        stepData: JSON.stringify({
          steps: (JSON.parse(wf.stepData || "{}").steps || []),
          current: newStep,
        }),
        emailSent: true,
      }).where(eq(userWorkflows.id, wf.id));

      return { success: true, completed: false, newStep, email };
    }),

  // ── USER PROMPTS AGENT ──
  promptAgent: authedQuery
    .input(z.object({
      workflowId: z.string(),
      promptText: z.string().min(1).max(1000),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [wf] = await db.select().from(userWorkflows).where(eq(userWorkflows.workflowId, input.workflowId)).limit(1);
      if (!wf) return { success: false, error: "Workflow not found" };

      // Log the user's prompt
      await db.update(userWorkflows).set({
        userPromptedAgent: true,
        userPromptText: input.promptText,
      }).where(eq(userWorkflows.id, wf.id));

      // Log to agent logs
      await db.insert(agentLogs).values({
        event: "user_prompted_agent",
        projectId: "support",
        data: JSON.stringify({ workflowId: input.workflowId, prompt: input.promptText, user: wf.userEmail }) || "{}",
      });

      return { success: true, message: "Your request has been sent to the agents. They will respond shortly." };
    }),

  // ── GET MY WORKFLOWS ──
  myWorkflows: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.select().from(userWorkflows)
      .where(eq(userWorkflows.userId, ctx.user!.id))
      .orderBy(desc(userWorkflows.createdAt))
      .limit(20);
  }),

  // ── GET WORKFLOW DETAIL ──
  getById: publicQuery
    .input(z.object({ workflowId: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [wf] = await db.select().from(userWorkflows).where(eq(userWorkflows.workflowId, input.workflowId)).limit(1);
      if (!wf) return null;

      const stepData = JSON.parse(wf.stepData || "{}");
      return { ...wf, steps: stepData.steps || [], suggestions: stepData.suggestions || [] };
    }),

  // ── ADMIN: LIST ALL WORKFLOWS ──
  listAll: adminQuery
    .input(z.object({
      status: z.string().optional(),
      limit: z.number().default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      if (input?.status) {
        return db.select().from(userWorkflows)
          .where(eq(userWorkflows.status, input.status as any))
          .orderBy(desc(userWorkflows.createdAt))
          .limit(input?.limit ?? 50);
      }
      return db.select().from(userWorkflows)
        .orderBy(desc(userWorkflows.createdAt))
        .limit(input?.limit ?? 50);
    }),

  // ── ADMIN: RESPOND TO USER PROMPT ──
  respondToPrompt: adminQuery
    .input(z.object({
      workflowId: z.string(),
      response: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(userWorkflows)
        .set({ agentResponse: input.response })
        .where(eq(userWorkflows.workflowId, input.workflowId));
      return { success: true };
    }),
});
