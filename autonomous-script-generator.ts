/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║           THE VAULT — AUTONOMOUS SCRIPT GENERATOR                           ║
 * ║           Command Reference for ratchetkrewelabs@gmail.com                  ║
 * ║           Only the admin can execute these commands.                        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * This file contains the complete command vocabulary for The Vault's
 * autonomous agent fleet. Each command triggers specific agent behavior.
 * Type these in the Command Center prompt interface.
 *
 * ─── COMMAND SYNTAX ───
 *   COMMAND [target] [parameters]
 *
 * ─── ACTIVE COMMANDS ───
 */

export const COMMAND_VOCABULARY = {
  // ─── OUTREACH COMMANDS ───
  OUTREACH: {
    description: "Cold outreach engine control",
    subcommands: {
      "OUTREACH RUN NOW": "Immediately execute a full outreach round for all high-value items",
      "OUTREACH RUN [itemName]": "Run outreach for a specific item (e.g., OUTREACH RUN Rolex Submariner)",
      "OUTREACH STATUS": "Show current outreach engine status — last run, next run, campaigns",
      "OUTREACH STATS": "Display aggregate outreach statistics (sent, blocked, confidence)",
      "OUTREACH BLOCKED": "Show messages blocked by the hallucination/censorship guard",
      "OUTREACH PERSONALIZE [company] [industry]": "Generate a personalized outreach message for a specific business",
      "OUTREACH SCHEDULE 24H": "Set outreach to run every 24 hours (default)",
      "OUTREACH SCHEDULE 12H": "Set outreach to run every 12 hours",
      "OUTREACH SCHEDULE OFF": "Disable scheduled outreach",
      "OUTREACH PAUSE": "Pause all outreach immediately",
      "OUTREACH RESUME": "Resume outreach operations",
    },
  },

  // ─── RESEARCH COMMANDS ───
  RESEARCH: {
    description: "Internet research and buyer discovery",
    subcommands: {
      "RESEARCH START [itemName]": "Begin internet research for buyer signals on an item",
      "RESEARCH FINDINGS [itemName]": "Display all research findings for an item",
      "RESEARCH BUYERS [itemName]": "Show only buying-signal findings (WTB posts)",
      "RESEARCH REDDIT [itemName]": "Search Reddit only for discussions about an item",
      "RESEARCH X [itemName]": "Search X/Twitter only for posts about an item",
      "RESEARCH COMMUNITIES [category]": "Find collector communities for a category",
    },
  },

  // ─── AGENT COMMANDS ───
  AGENT: {
    description: "Individual agent control",
    subcommands: {
      "AGENT STATUS": "Show all 10 agents' current status and health scores",
      "AGENT STATUS [name]": "Show status for a specific agent (e.g., AGENT STATUS appraiser)",
      "AGENT TOGGLE [name] [on/off]": "Activate or deactivate an agent",
      "AGENT PROMPT [name] [message]": "Send a direct prompt to any agent",
      "AGENT HEALTH": "Run health check on all agents — hallucination rate, feedback",
      "AGENT FEEDBACK [name]": "Show recent feedback and corrections for an agent",
    },
  },

  // ─── FLEET COMMANDS ───
  FLEET: {
    description: "Fleet-wide operations",
    subcommands: {
      "FLEET OVERVIEW": "Display complete fleet dashboard with all agents",
      "FLEET CYCLES": "Show recent agent execution cycles",
      "FLEET SESSIONS": "List active and completed sessions",
      "FLEET STATS": "Aggregate statistics across all agents",
    },
  },

  // ─── WORKFLOW COMMANDS ───
  WORKFLOW: {
    description: "Inter-agent workflow management",
    subcommands: {
      "WORKFLOW CREATE [description]": "Create a new AI-generated workflow",
      "WORKFLOW LIST": "Show all active and completed workflows",
      "WORKFLOW ADVANCE [id]": "Manually advance a workflow to the next step",
      "WORKFLOW PAUSE [id]": "Pause a running workflow",
      "WORKFLOW CANCEL [id]": "Cancel an active workflow",
    },
  },

  // ─── PARTNERSHIP COMMANDS ───
  PARTNER: {
    description: "Partnership and B2B outreach",
    subcommands: {
      "PARTNER LIST": "Show all partnership targets and their status",
      "PARTNER ADD [company] [industry]": "Add a new partnership target",
      "PARTNER GENERATE [industry] [count]": "AI-generate partnership targets for an industry",
      "PARTNER STATS": "Partnership pipeline statistics",
    },
  },

  // ─── SAMSON COMMANDS (KILL SWITCH) ───
  SAMSON: {
    description: "Emergency kill switch control",
    subcommands: {
      "SAMSON ARM": "FREEZE all agent activity immediately — emergency stop",
      "SAMSON DISARM": "Resume all agent operations",
      "SAMSON STATUS": "Check if Samson is armed or disarmed",
    },
  },

  // ─── AUDIT COMMANDS ───
  AUDIT: {
    description: "Quality and legitimacy audits",
    subcommands: {
      "AUDIT APPRAISAL": "Run legitimacy audit on all appraisal outputs",
      "AUDIT OUTREACH": "Check outreach messages for hallucinations",
      "AUDIT HALLUCINATION": "Run full hallucination test across all agents",
      "AUDIT FULL": "Run complete quality audit on the entire system",
    },
  },

  // ─── TRIGGER COMMANDS ───
  TRIGGER: {
    description: "Manual action triggers",
    subcommands: {
      "TRIGGER SELL [itemName] [category] [value]": "Simulate a sell action — dispatch outreach agents",
      "TRIGGER APPRAISE [itemName] [category] [value]": "Simulate an appraisal — dispatch outreach agents",
      "TRIGGER VERIFY [itemName] [category]": "Simulate a verification — dispatch agents",
      "TRIGGER TOKENIZE [itemName] [category] [value]": "Simulate tokenization — dispatch agents",
    },
  },

  // ─── CHAT COMMANDS ───
  CHAT: {
    description: "Inter-agent communication",
    subcommands: {
      "CHAT [agent] [message]": "Send a message from one agent to the fleet",
      "CHAT LOGS": "Show recent agent conversation history",
    },
  },

  // ─── HELP ───
  HELP: {
    description: "Get help",
    subcommands: {
      "HELP": "Show all available commands",
      "HELP [command]": "Show help for a specific command (e.g., HELP OUTREACH)",
    },
  },
} as const;

// ─── COMMAND PARSER ───
// Parses natural language admin input into structured commands
export function parseCommand(input: string): {
  command: string;
  action: string;
  params: string[];
  valid: boolean;
} {
  const trimmed = input.trim().toUpperCase();
  const parts = trimmed.split(/\s+/);
  const command = parts[0] || "";
  const action = parts[1] || "";
  const params = parts.slice(2);

  // Check if command exists
  const valid = command in COMMAND_VOCABULARY;

  return { command, action, params, valid };
}

// ─── COMMAND HELP TEXT ───
export function getCommandHelp(command?: string): string {
  if (!command) {
    // Return all commands
    let help = "THE VAULT — AUTONOMOUS COMMAND CENTER\n";
    help += "Only ratchetkrewelabs@gmail.com can execute these commands.\n\n";
    help += "Available command categories:\n\n";

    for (const [key, val] of Object.entries(COMMAND_VOCABULARY)) {
      help += `  ${key} — ${val.description}\n`;
    }

    help += "\nType HELP [command] for details.\n";
    help += "Example: OUTREACH RUN NOW\n";
    return help;
  }

  const upper = command.toUpperCase();
  if (upper in COMMAND_VOCABULARY) {
    const cmd = COMMAND_VOCABULARY[upper as keyof typeof COMMAND_VOCABULARY];
    let help = `${upper} — ${cmd.description}\n\n`;
    for (const [sub, desc] of Object.entries(cmd.subcommands)) {
      help += `  ${sub}\n    ${desc}\n\n`;
    }
    return help;
  }

  return `Unknown command: ${command}. Type HELP for available commands.`;
}

// ─── BLANK PROMPT TEMPLATES ───
// The admin can copy these and fill in the blanks
export const BLANK_PROMPT_TEMPLATES = [
  {
    name: "Custom Outreach Campaign",
    template: `OUTREACH RUN [ITEM_NAME] --target=[INDUSTRY] --count=[NUMBER] --tone=[professional/friendly/urgent]`,
  },
  {
    name: "Deep Research Scan",
    template: `RESEARCH START [ITEM_NAME] --platforms=reddit,x,forums --depth=deep --buyers-only=true`,
  },
  {
    name: "Agent Collaboration",
    template: `WORKFLOW CREATE "[DESCRIPTION_OF_WHAT_NEEDS_TO_HAPPEN]" --agents=[AGENT1,AGENT2,AGENT3]`,
  },
  {
    name: "Partnership Blast",
    template: `PARTNER GENERATE [INDUSTRY] [COUNT] --region=[REGION] --message-style=[formal/casual]`,
  },
  {
    name: "Emergency Stop",
    template: `SAMSON ARM --reason="[REASON_FOR_EMERGENCY_STOP]"`,
  },
  {
    name: "Custom Agent Prompt",
    template: `AGENT PROMPT [AGENT_NAME] "[YOUR_CUSTOM_INSTRUCTIONS_HERE]"`,
  },
  {
    name: "Quality Audit",
    template: `AUDIT [TYPE] --scope=[all/recent] --severity=[minor/major/critical]`,
  },
  {
    name: "Trigger from Action",
    template: `TRIGGER [sell/appraise/verify/tokenize] "[ITEM_NAME]" [CATEGORY] [VALUE]`,
  },
];

// Export the full command list for the UI
export const ALL_COMMANDS = Object.entries(COMMAND_VOCABULARY).flatMap(
  ([category, data]) =>
    Object.entries(data.subcommands).map(([command, description]) => ({
      category,
      command,
      description,
    }))
);

export default {
  COMMAND_VOCABULARY,
  parseCommand,
  getCommandHelp,
  BLANK_PROMPT_TEMPLATES,
  ALL_COMMANDS,
};
