export type AgentId = "research" | "drafting" | "compliance" | "summary";

export interface AgentMeta {
  id: AgentId;
  name: string;
  short: string;
  emoji: string;
  tagline: string;
  colorVar: string; // CSS var name
  description: string;
}

export const AGENTS: Record<AgentId, AgentMeta> = {
  research: {
    id: "research",
    name: "Research Agent",
    short: "Research",
    emoji: "📚",
    tagline: "Finds case law & precedents",
    colorVar: "--agent-research",
    description: "Searches for case law, statutes, and binding authority across jurisdictions.",
  },
  drafting: {
    id: "drafting",
    name: "Drafting Agent",
    short: "Drafting",
    emoji: "🧾",
    tagline: "Creates legal documents",
    colorVar: "--agent-drafting",
    description: "Drafts contracts, NDAs, motions, demand letters, and memos.",
  },
  compliance: {
    id: "compliance",
    name: "Compliance Agent",
    short: "Compliance",
    emoji: "🔍",
    tagline: "Checks regulatory rules",
    colorVar: "--agent-compliance",
    description: "Reviews against GDPR, HIPAA, SOC 2, CCPA, SOX and other frameworks.",
  },
  summary: {
    id: "summary",
    name: "Case Summary Agent",
    short: "Summary",
    emoji: "📊",
    tagline: "Simplifies judgments",
    colorVar: "--agent-summary",
    description: "Distills opinions and judgments into plain-language briefs.",
  },
};

export const AGENT_LIST: AgentMeta[] = [
  AGENTS.research,
  AGENTS.drafting,
  AGENTS.compliance,
  AGENTS.summary,
];
