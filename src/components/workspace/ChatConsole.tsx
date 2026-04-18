import { useEffect, useRef, useState } from "react";
import type { Matter } from "./Workspace";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AGENT_LIST, AGENTS, type AgentId } from "@/lib/agents";
import { streamAgent, type ChatMsg } from "@/lib/agent-stream";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, Send, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface DBMessage {
  id: string;
  agent: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export function ChatConsole({ matter }: { matter: Matter }) {
  const { user } = useAuth();
  const [agent, setAgent] = useState<AgentId>("research");
  const [messages, setMessages] = useState<DBMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamBuf, setStreamBuf] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load history on matter change
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, agent, role, content, created_at")
        .eq("matter_id", matter.id)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) { toast.error(error.message); return; }
      setMessages((data as DBMessage[]) ?? []);
    })();
    return () => { cancelled = true; abortRef.current?.abort(); };
  }, [matter.id]);

  // Autoscroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, streamBuf]);

  const send = async () => {
    if (!user || !input.trim() || streaming) return;
    const userText = input.trim();
    setInput("");

    // Persist user message
    const { data: userRow, error: insErr } = await supabase
      .from("messages")
      .insert({ matter_id: matter.id, user_id: user.id, agent, role: "user", content: userText })
      .select("id, agent, role, content, created_at")
      .single();
    if (insErr) { toast.error(insErr.message); return; }
    const newMsgs = [...messages, userRow as DBMessage];
    setMessages(newMsgs);

    setStreaming(true);
    setStreamBuf("");

    const ctx = `Matter title: ${matter.title}${matter.client ? `\nClient: ${matter.client}` : ""}${matter.description ? `\nBackground: ${matter.description}` : ""}`;

    // Build chat history (last 20 turns, only same-agent + user msgs)
    const history: ChatMsg[] = newMsgs
      .slice(-40)
      .map((m) => ({ role: m.role, content: m.content }));

    abortRef.current = new AbortController();
    let acc = "";

    await streamAgent({
      agent,
      messages: history,
      matterContext: ctx,
      signal: abortRef.current.signal,
      onDelta: (c) => {
        acc += c;
        setStreamBuf(acc);
      },
      onError: (m) => toast.error(m),
      onDone: () => {},
    });

    if (acc) {
      const { data: aiRow, error: aiErr } = await supabase
        .from("messages")
        .insert({ matter_id: matter.id, user_id: user.id, agent, role: "assistant", content: acc })
        .select("id, agent, role, content, created_at")
        .single();
      if (aiErr) toast.error(aiErr.message);
      else setMessages((m) => [...m, aiRow as DBMessage]);
    }

    setStreamBuf("");
    setStreaming(false);
  };

  const saveAsDocument = async (content: string) => {
    if (!user) return;
    const firstLine = content.split("\n").find((l) => l.trim()) ?? "Untitled draft";
    const title = firstLine.replace(/^#+\s*/, "").slice(0, 120);
    const { error } = await supabase.from("documents").insert({
      matter_id: matter.id,
      user_id: user.id,
      title,
      doc_type: agent,
      content,
    });
    if (error) toast.error(error.message);
    else toast.success("Saved to documents");
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const activeMeta = AGENTS[agent];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Agent switcher */}
      <div className="px-6 pt-4 pb-3 border-b border-border/60 shrink-0">
        <div className="flex flex-wrap gap-2">
          {AGENT_LIST.map((a) => {
            const active = a.id === agent;
            return (
              <button
                key={a.id}
                onClick={() => setAgent(a.id)}
                className={`group flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                  active ? "bg-card text-foreground" : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-card/50"
                }`}
                style={active ? { borderColor: `var(${a.colorVar})`, boxShadow: `0 0 0 1px var(${a.colorVar})` } : { borderColor: "var(--border)" }}
              >
                <span style={{ color: `var(${a.colorVar})` }}>{a.emoji}</span>
                <span className="font-medium">{a.short}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs font-mono text-muted-foreground">
          <span style={{ color: `var(${activeMeta.colorVar})` }}>●</span> {activeMeta.name} — {activeMeta.tagline}
        </p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6">
        {messages.length === 0 && !streaming && (
          <div className="max-w-2xl mx-auto text-center py-12">
            <Sparkles className="mx-auto h-8 w-8 text-primary mb-3" />
            <h3 className="font-display text-lg">Brief the {activeMeta.short.toLowerCase()} agent</h3>
            <p className="mt-2 text-sm text-muted-foreground">{activeMeta.description}</p>
            <div className="mt-6 grid gap-2 text-left max-w-md mx-auto">
              {sampleFor(agent).map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-xs text-left px-3 py-2 rounded-md border border-border bg-card/60 hover:bg-card text-muted-foreground hover:text-foreground transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((m) => <MessageBubble key={m.id} msg={m} onSaveDoc={saveAsDocument} />)}
          {streaming && (
            <MessageBubble
              msg={{ id: "streaming", agent, role: "assistant", content: streamBuf || "…" }}
              streaming
            />
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-border/60 p-4 shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-xl border border-border bg-card focus-within:border-primary/60 transition">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder={`Message the ${activeMeta.short} Agent…  (⏎ to send · ⇧⏎ for newline)`}
              rows={2}
              maxLength={4000}
              className="border-0 bg-transparent focus-visible:ring-0 resize-none min-h-[60px]"
              disabled={streaming}
            />
            <div className="flex items-center justify-between px-3 py-2 border-t border-border/60">
              <span className="text-[10px] font-mono text-muted-foreground">
                {input.length}/4000
              </span>
              <Button onClick={send} disabled={!input.trim() || streaming} size="sm" className="gap-1.5">
                <Send className="h-3.5 w-3.5" />
                {streaming ? "Streaming…" : "Send"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  msg,
  streaming,
  onSaveDoc,
}: {
  msg: { id: string; agent: string; role: string; content: string };
  streaming?: boolean;
  onSaveDoc?: (content: string) => void;
}) {
  const meta = AGENTS[msg.agent as AgentId];
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary/15 border border-primary/20 px-4 py-3 text-sm">
          {msg.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <div
        className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-sm"
        style={{ background: `color-mix(in oklab, var(${meta.colorVar}) 18%, transparent)`, color: `var(${meta.colorVar})` }}
      >
        {meta.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium" style={{ color: `var(${meta.colorVar})` }}>{meta.name}</span>
          {streaming && <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
        </div>
        <div className="prose prose-sm prose-invert max-w-none prose-headings:font-display prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-a:text-primary prose-table:text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
        </div>
        {!streaming && onSaveDoc && (msg.agent === "drafting" || msg.content.length > 600) && (
          <div className="mt-2">
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => onSaveDoc(msg.content)}>
              <Save className="h-3 w-3" /> Save as document
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function sampleFor(a: AgentId): string[] {
  switch (a) {
    case "research":
      return [
        "Find leading US cases on the enforceability of non-compete clauses for software engineers.",
        "Summarize key precedents on GDPR's right-to-be-forgotten in employment contexts.",
      ];
    case "drafting":
      return [
        "Draft a one-way NDA for a SaaS company sharing financial projections with an investor.",
        "Write a demand letter for unpaid invoices totaling $24,500.",
      ];
    case "compliance":
      return [
        "Review our user data flow against GDPR. We collect email, IP, and behavioral analytics.",
        "Check our SOC 2 readiness for access-control policies in a small startup.",
      ];
    case "summary":
      return [
        "Summarize the holding and reasoning of Brown v. Board of Education.",
        "Explain *Carpenter v. United States* in plain language.",
      ];
  }
}
