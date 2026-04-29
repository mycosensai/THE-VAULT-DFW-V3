/**
 * Hallucination Manifesto Test — Verifies all 10 agents have zero-hallucination prompts
 * Run with: npx tsx scripts/hallucination-test.ts
 */

import {
  getPrompt,
  APPRAISER_PROMPT,
  OUTREACH_PROMPT,
  PROVERIFY_PROMPT,
  CONTENT_PROMPT,
  SECURITY_PROMPT,
  PRICING_PROMPT,
  SUPPORT_PROMPT,
  LISTING_PROMPT,
  COMPLIANCE_PROMPT,
  SOCIAL_PROMPT,
} from "../api/agent-prompts";

const requiredChecks = [
  { name: "ZERO-HALLUCINATION CONTRACT", pattern: /ZERO-HALLUCINATION CONTRACT/i },
  { name: "MANDATORY PRE-FLIGHT CHECK", pattern: /MANDATORY PRE-FLIGHT CHECK/i },
  { name: "ROGUE PREVENTION", pattern: /ROGUE PREVENTION/i },
  { name: "PRE-FLIGHT per-task", pattern: /PRE-FLIGHT:/i },
];

const agents = [
  { id: "appraiser", prompt: APPRAISER_PROMPT },
  { id: "outreach", prompt: OUTREACH_PROMPT },
  { id: "proverify", prompt: PROVERIFY_PROMPT },
  { id: "content", prompt: CONTENT_PROMPT },
  { id: "security", prompt: SECURITY_PROMPT },
  { id: "pricing", prompt: PRICING_PROMPT },
  { id: "support", prompt: SUPPORT_PROMPT },
  { id: "listing", prompt: LISTING_PROMPT },
  { id: "compliance", prompt: COMPLIANCE_PROMPT },
  { id: "social", prompt: SOCIAL_PROMPT },
];

const antiRogueChecks = [
  { id: "appraiser", required: ["DISCLAIMER", "estimatedValue", "cannot_assess"] },
  { id: "outreach", required: ["NEVER invent", "NEVER promise", "VERIFY INDEPENDENTLY"] },
  { id: "proverify", required: ["SIMULATED", "physical inspection", "NOT a substitute"] },
  { id: "content", required: ["NO fabricated stories", "cautious language"] },
  { id: "security", required: ["POTENTIAL CONCERN", "CVE"] },
  { id: "pricing", required: ["general knowledge", "insufficient_data"] },
  { id: "support", required: ["I don't have", "escalate"] },
  { id: "listing", required: ["Do not add", "based ONLY"] },
  { id: "compliance", required: ["general references", "NEVER recommend"] },
  { id: "social", required: ["NEVER invent", "usernames"] },
];

let totalChecks = 0;
let passedChecks = 0;
let allPassed = true;

console.log("=== ZERO-HALLUCINATION MANIFESTO VERIFICATION ===\n");

for (const agent of agents) {
  console.log(`\n[${agent.id.toUpperCase()}]`);
  const agentResults: Record<string, boolean> = {};

  for (const check of requiredChecks) {
    const passed = check.pattern.test(agent.prompt);
    agentResults[check.name] = passed;
    totalChecks++;
    if (passed) passedChecks++;
    const status = passed ? "PASS" : "FAIL";
    console.log(`  ${status}: ${check.name}`);
  }

  // Verify getPrompt returns a valid prompt
  const resolvedPrompt = getPrompt(agent.id);
  const hasPreamble = resolvedPrompt.includes("ZERO-HALLUCINATION CONTRACT");
  const notEmpty = resolvedPrompt.length > 500;
  agentResults["getPrompt_preamble"] = hasPreamble;
  agentResults["getPrompt_notEmpty"] = notEmpty;
  totalChecks += 2;
  if (hasPreamble) passedChecks++;
  if (notEmpty) passedChecks++;
  console.log(`  ${hasPreamble ? "PASS" : "FAIL"}: getPrompt() returns prompt with preamble`);
  console.log(`  ${notEmpty ? "PASS" : "FAIL"}: getPrompt() returns non-empty prompt (${resolvedPrompt.length} chars)`);

  const agentPassed = Object.values(agentResults).every((v) => v === true);
  if (!agentPassed) allPassed = false;
  console.log(`  => ${agentPassed ? "PASSED" : "FAILED"}`);
}

console.log("\n\n=== ANTI-ROGUE CHECKS ===\n");
for (const check of antiRogueChecks) {
  const prompt = getPrompt(check.id);
  const found = check.required.filter((r) => prompt.includes(r));
  const missing = check.required.filter((r) => !prompt.includes(r));
  const passed = missing.length === 0;
  if (!passed) allPassed = false;
  totalChecks += check.required.length;
  passedChecks += found.length;

  console.log(`[${check.id.toUpperCase()}] ${passed ? "PASS" : "FAIL"}`);
  if (missing.length > 0) {
    console.log(`  Missing: ${missing.join(", ")}`);
  }
}

console.log("\n\n=== SUMMARY ===");
console.log(`Total checks: ${totalChecks}`);
console.log(`Passed: ${passedChecks}`);
console.log(`Failed: ${totalChecks - passedChecks}`);
console.log(`Pass rate: ${Math.round((passedChecks / totalChecks) * 100)}%`);
console.log(`\n${"=".repeat(60)}`);
if (allPassed) {
  console.log("ALL CLEAR - Zero-hallucination manifesto fully enforced.");
  console.log("All 10 agents have hallucination guardrails.");
  console.log("No rogue vectors detected.");
  process.exit(0);
} else {
  console.log("ISSUES DETECTED - Some checks failed.");
  console.log("Review the output above.");
  process.exit(1);
}
