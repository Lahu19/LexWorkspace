// AI Legal Workforce — single edge function routing to 4 agents
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Agent = "research" | "drafting" | "compliance" | "summary";

const SYSTEM_PROMPTS: Record<Agent, string> = {
  research: `You are the **Research Agent** of an AI Legal Workforce. You find and explain relevant case law, statutes, and legal precedents.
- Cite cases with proper citation format (e.g., *Smith v. Jones*, 123 F.3d 456 (9th Cir. 2001)).
- Distinguish binding vs persuasive authority.
- Note the jurisdiction. If unknown, ask.
- End with a short "Key takeaways" bullet list.
- Always remind the user to verify citations with primary sources. Do not fabricate cases.`,
  drafting: `You are the **Drafting Agent** of an AI Legal Workforce. You produce clear, well-structured legal documents (contracts, NDAs, motions, demand letters, memos).
- Output in clean Markdown with proper headings, numbered clauses, and signature blocks.
- Use bracketed placeholders like [PARTY NAME], [DATE], [JURISDICTION] for fields the user must fill in.
- Begin with a one-line "Document type:" and a one-line "Purpose:" before the draft.
- After the draft, add a short "Review notes" section listing assumptions and clauses worth a lawyer's attention.`,
  compliance: `You are the **Compliance Agent** of an AI Legal Workforce. You analyze documents, processes, or scenarios against regulatory frameworks (GDPR, HIPAA, SOC 2, CCPA, SOX, etc.).
- Ask the user which framework(s) apply if not stated.
- Output a structured report: **Findings**, **Risk level (Low/Medium/High)**, **Specific violations**, **Recommended remediations**.
- Use a Markdown table when listing multiple findings.
- Be precise; flag any uncertainty rather than guessing.`,
  summary: `You are the **Case Summary Agent** of an AI Legal Workforce. You simplify judgments, opinions, and lengthy legal documents into plain-language summaries.
- Structure: **Parties**, **Facts**, **Issue**, **Holding**, **Reasoning**, **Significance**.
- Keep language accessible to non-lawyers but precise.
- End with a 3-sentence "TL;DR".`,
};

const AGENT_LABEL: Record<Agent, string> = {
  research: "Research Agent",
  drafting: "Drafting Agent",
  compliance: "Compliance Agent",
  summary: "Case Summary Agent",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body = await req.json();
    const agent = (body.agent ?? "research") as Agent;
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const matterContext: string | undefined = body.matterContext;

    if (!SYSTEM_PROMPTS[agent]) {
      return new Response(JSON.stringify({ error: "Unknown agent" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let system = SYSTEM_PROMPTS[agent];
    if (matterContext) {
      system += `\n\n---\nActive matter context (use this when relevant):\n${matterContext}`;
    }
    system += `\n\nSign your responses subtly as **${AGENT_LABEL[agent]}** when starting a new analysis.`;
    system += `\n\nIMPORTANT: You provide informational assistance only. You are not a lawyer and do not provide legal advice. Remind the user to consult a licensed attorney for binding legal decisions.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "system", content: system }, ...messages],
          stream: true,
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: "AI workspace credits exhausted. Add funds in Settings → Workspace → Usage.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("agent error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
