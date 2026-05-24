import { getPrompt } from "./agent-prompts";

export type AgentDefinition = {
  projectId: string;
  name: string;
  description: string;
  mode: string;
  priority: number;
  cycleBudgetMinutes: number;
  verificationCommand: string;
  model: string;
  handsOff: string[];
};

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    projectId: "appraiser",
    name: "AI Appraiser",
    description: "Photo-based luxury item appraisal. Value ranges, authenticity, market analysis.",
    mode: "A",
    priority: 1,
    cycleBudgetMinutes: 5,
    verificationCommand: "Output must contain valid estimatedValue and valueRangeLow/High. Confidence must be one of high/medium/low.",
    model: "gpt-4o",
    handsOff: ["users", "payments", "auth"],
  },
  {
    projectId: "outreach",
    name: "Buyer Outreach",
    description: "Professional lead generation. Finds verified buyers, collectors, dealers.",
    mode: "A",
    priority: 1,
    cycleBudgetMinutes: 10,
    verificationCommand: "Each segment must be a professional type, not a fake individual. No invented names or emails.",
    model: "gpt-4o",
    handsOff: ["users", "payments", "stripe"],
  },
  {
    projectId: "proverify",
    name: "ProVerify Engine",
    description: "Multi-expert verification with consensus scoring for authenticity and value.",
    mode: "A",
    priority: 1,
    cycleBudgetMinutes: 8,
    verificationCommand: "Must have 3+ expert reviews with scores 0-100. All scores marked as simulated estimates.",
    model: "gpt-4o",
    handsOff: ["users", "payments"],
  },
  {
    projectId: "content",
    name: "Content & SEO",
    description: "Product descriptions, SEO copy, marketing content for listings.",
    mode: "B",
    priority: 2,
    cycleBudgetMinutes: 5,
    verificationCommand: "Must have exactly 3 variants with correct word counts. No fabricated provenance.",
    model: "gpt-4o-mini",
    handsOff: ["users", "payments", "auth"],
  },
  {
    projectId: "security",
    name: "Security Auditor",
    description: "Security monitoring, vulnerability audits, penetration testing.",
    mode: "A",
    priority: 1,
    cycleBudgetMinutes: 10,
    verificationCommand: "Each finding must have severity and remediation. No invented CVEs.",
    model: "gpt-4o",
    handsOff: ["users", "payments", "production_db"],
  },
  {
    projectId: "pricing",
    name: "Pricing Intelligence",
    description: "Market analysis and price recommendations based on real data only.",
    mode: "B",
    priority: 2,
    cycleBudgetMinutes: 7,
    verificationCommand: "Comparables must be general market knowledge only. No specific unverified sales.",
    model: "gpt-4o",
    handsOff: ["users", "payments", "stripe"],
  },
  {
    projectId: "support",
    name: "Support Assistant",
    description: "Customer support. Answers FAQs, routes complex issues to humans.",
    mode: "B",
    priority: 3,
    cycleBudgetMinutes: 3,
    verificationCommand: "Response must be based only on provided policies. Must not fabricate policy details.",
    model: "gpt-4o-mini",
    handsOff: ["users", "payments", "auth", "personal_data"],
  },
  {
    projectId: "listing",
    name: "Listing Optimizer",
    description: "Quality checks for photos, descriptions, pricing, compliance.",
    mode: "A",
    priority: 2,
    cycleBudgetMinutes: 5,
    verificationCommand: "Compliance flags must be specific. Scores 0-100 integers. No invented violations.",
    model: "gpt-4o",
    handsOff: ["users", "payments", "production_db"],
  },
  {
    projectId: "compliance",
    name: "Compliance Monitor",
    description: "Legal/regulatory compliance review. Terms, privacy, shipping, tax.",
    mode: "B",
    priority: 2,
    cycleBudgetMinutes: 10,
    verificationCommand: "Findings must reference general regulations only. No invented section numbers.",
    model: "gpt-4o",
    handsOff: ["users", "payments", "legal_contracts"],
  },
  {
    projectId: "social",
    name: "Social Lead Gen",
    description: "Social media intelligence. Community identification, engagement strategy.",
    mode: "A",
    priority: 3,
    cycleBudgetMinutes: 8,
    verificationCommand: "No fabricated usernames, follower counts, or metrics. Use placeholders only.",
    model: "gpt-4o",
    handsOff: ["users", "payments", "personal_data"],
  },
];

export function toAgentProject(def: AgentDefinition) {
  return {
    projectId: def.projectId,
    name: def.name,
    description: def.description,
    mode: def.mode,
    priority: def.priority,
    engineerCommand: getPrompt(def.projectId),
    verificationCommand: def.verificationCommand,
    cycleBudgetMinutes: def.cycleBudgetMinutes,
    handsOff: JSON.stringify(def.handsOff),
    providerId: "openai",
    model: def.model,
    active: true,
  };
}

export const REQUIRED_AGENT_IDS = AGENT_DEFINITIONS.map((agent) => agent.projectId);
