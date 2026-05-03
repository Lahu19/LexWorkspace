import { useEffect, useRef, useState } from "react";
import type { Matter } from "./Workspace";
import { apiFetch, API_BASE } from "@/lib/api";
import { AGENT_LIST, AGENTS, type AgentId } from "@/lib/agents";
import { streamAgent, type ChatMsg } from "@/lib/agent-stream";
import { MARKDOWN_PROSE } from "@/lib/markdown-prose";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, Send, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

interface DBMessage {
  id: string;
  agent: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

const SAMPLE_PROMPTS: Record<AgentId, string[]> = {
  research: [
    "Find leading US cases on the enforceability of non-compete clauses for software engineers.",
    "Summarize key precedents on GDPR's right-to-be-forgotten in employment contexts.",
  ],
  drafting: [
    "Draft a one-way NDA for a SaaS company sharing financial projections with an investor.",
    "Write a demand letter for unpaid invoices totaling $24,500.",
  ],
  compliance: [
    "Review our user data flow against GDPR. We collect email, IP, and behavioral analytics.",
    "Check our SOC 2 readiness for access-control policies in a small startup.",
  ],
  summary: [
    "Summarize the holding and reasoning of Brown v. Board of Education.",
    "Explain *Carpenter v. United States* in plain language.",
  ],
};

export function ChatConsole({ matter }: { matter: Matter }) {
  const [agent, setAgent] = useState<AgentId>("research");
  const [messages, setMessages] = useState<DBMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamBuf, setStreamBuf] = useState("");
  const targetBuf = useRef("");
  const displayInterval = useRef<NodeJS.Timeout>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* ── Typewriter Effect ── */
  useEffect(() => {
    if (streaming) {
      displayInterval.current = setInterval(() => {
        setStreamBuf((current) => {
          if (current.length < targetBuf.current.length) {
            const diff = targetBuf.current.length - current.length;
            const step = Math.max(1, Math.ceil(diff / 8));
            return targetBuf.current.slice(0, current.length + step);
          }
          return current;
        });
      }, 20);
    } else {
      clearInterval(displayInterval.current);
    }
    return () => clearInterval(displayInterval.current);
  }, [streaming]);

  /* ── Load messages when matter changes ── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<DBMessage[]>(
          `/api/matters/${matter.id}/messages`,
        );
        if (!cancelled) setMessages(data);
      } catch (err) {
        if (!cancelled)
          toast.error(err instanceof Error ? err.message : "Failed to load messages");
      }
    })();
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, [matter.id]);

  /* ── Auto-scroll ── */
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, streamBuf]);

  const send = async () => {
    if (!input.trim() || streaming) return;
    const userText = input.trim();
    setInput("");

    /* 1. Save user message to DB */
    let userRow: DBMessage;
    try {
      userRow = await apiFetch<DBMessage>("/api/messages", {
        method: "POST",
        body: JSON.stringify({
          matter_id: matter.id,
          agent,
          role: "user",
          content: userText,
        }),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save message");
      setInput(userText); // restore
      return;
    }

    const newMsgs = [...messages, userRow];
    setMessages(newMsgs);
    setStreaming(true);
    setStreamBuf("");

    const ctx = `Matter title: ${matter.title}${matter.client ? `\nClient: ${matter.client}` : ""}${matter.description ? `\nBackground: ${matter.description}` : ""}`;

    const history: ChatMsg[] = newMsgs
      .filter((m) => m.agent === agent)
      .slice(-40)
      .map((m) => ({ role: m.role, content: m.content }));

    abortRef.current = new AbortController();
    targetBuf.current = "";

    await streamAgent({
      agent,
      messages: history,
      matterContext: ctx,
      signal: abortRef.current.signal,
      onDelta: (c) => {
        targetBuf.current += c;
      },
      onError: (m) => toast.error(m),
      onDone: () => {},
    });

    /* 2. Save AI response to DB */
    if (targetBuf.current) {
      try {
        const aiRow = await apiFetch<DBMessage>("/api/messages", {
          method: "POST",
          body: JSON.stringify({
            matter_id: matter.id,
            agent,
            role: "assistant",
            content: targetBuf.current,
          }),
        });
        setMessages((m) => [...m, aiRow]);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save AI response");
      }
    }

    setStreamBuf("");
    targetBuf.current = "";
    setStreaming(false);
  };

  const saveAsDocument = async (content: string) => {
    const firstLine = content.split("\n").find((l) => l.trim()) ?? "Untitled draft";
    const title = firstLine.replace(/^#+\s*/, "").replace(/\*\*|_|#+|`/g, "").trim().slice(0, 120);
    try {
      await apiFetch("/api/documents", {
        method: "POST",
        body: JSON.stringify({
          matter_id: matter.id,
          title,
          doc_type: agent,
          content,
        }),
      });
      toast.success("Saved to documents");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save document");
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const activeMeta = AGENTS[agent];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="px-6 pt-4 pb-3 border-b border-border/60 shrink-0">
        <AgentSwitcher agent={agent} onChange={setAgent} />
        <p className="mt-2 text-xs font-mono text-muted-foreground">
          <span style={{ color: `var(${activeMeta.colorVar})` }}>●</span>{" "}
          {activeMeta.name} — {activeMeta.tagline}
        </p>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-6 py-8 grid-bg bg-fixed">
        {messages.length === 0 && !streaming && (
          <EmptyThread agent={agent} onPickSample={setInput} />
        )}
        <div className="max-w-3xl mx-auto space-y-8 pb-12">
          {messages.map((m) => (
            <MessageBubble key={m.id} msg={m} onSaveDoc={saveAsDocument} />
          ))}
          {streaming && (
            <MessageBubble
              msg={{ id: "streaming", agent, role: "assistant", content: streamBuf || "…" }}
              streaming
            />
          )}
        </div>
      </div>

      <footer className="border-t border-border/60 p-4 shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-xl border border-border bg-card focus-within:border-primary/60 transition">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder={`Message the ${activeMeta.short} Agent…  (Enter to send · Shift+Enter for newline)`}
              rows={2}
              maxLength={4000}
              className="border-0 bg-transparent focus-visible:ring-0 resize-none min-h-[60px]"
              disabled={streaming}
            />
            <div className="flex items-center justify-between px-3 py-2 border-t border-border/60">
              <span className="text-[10px] font-mono text-muted-foreground">{input.length}/4000</span>
              <Button
                type="button"
                onClick={() => void send()}
                disabled={!input.trim() || streaming}
                size="sm"
                className="gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                {streaming ? "Streaming…" : "Send"}
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function AgentSwitcher({
  agent,
  onChange,
}: {
  agent: AgentId;
  onChange: (id: AgentId) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {AGENT_LIST.map((a) => {
        const active = a.id === agent;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onChange(a.id)}
            className={cn(
              "group flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition",
              active
                ? "bg-card text-foreground"
                : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-card/50",
            )}
            style={
              active
                ? { borderColor: `var(${a.colorVar})`, boxShadow: `0 0 0 1px var(${a.colorVar})` }
                : { borderColor: "var(--border)" }
            }
          >
            <span style={{ color: `var(${a.colorVar})` }}>{a.emoji}</span>
            <span className="font-medium">{a.short}</span>
          </button>
        );
      })}
    </div>
  );
}

function EmptyThread({ agent, onPickSample }: { agent: AgentId; onPickSample: (s: string) => void }) {
  const meta = AGENTS[agent];
  return (
    <div className="max-w-2xl mx-auto text-center py-12">
      <Sparkles className="mx-auto h-8 w-8 text-primary mb-3" />
      <h3 className="font-display text-lg">Brief the {meta.short.toLowerCase()} agent</h3>
      <p className="mt-2 text-sm text-muted-foreground">{meta.description}</p>
      <div className="mt-6 grid gap-2 text-left max-w-md mx-auto">
        {SAMPLE_PROMPTS[agent].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPickSample(s)}
            className="text-xs text-left px-3 py-2 rounded-md border border-border bg-card/60 hover:bg-card text-muted-foreground hover:text-foreground transition"
          >
            {s}
          </button>
        ))}
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
      <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-secondary/80 border border-border/40 px-4 py-3 text-[0.9375rem] leading-relaxed text-foreground/90 shadow-sm">
          {msg.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="flex flex-col items-center shrink-0">
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center text-lg shadow-inner relative overflow-hidden group"
          style={{
            background: `color-mix(in oklab, var(${meta.colorVar}) 15%, transparent)`,
            color: `var(${meta.colorVar})`,
            border: `1px solid color-mix(in oklab, var(${meta.colorVar}) 25%, transparent)`,
          }}
        >
          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          {meta.emoji}
        </div>
      </div>
      <div className="flex-1 min-w-0 pt-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[0.8125rem] font-display font-semibold uppercase tracking-wider opacity-80" style={{ color: `var(${meta.colorVar})` }}>
            {meta.name}
          </span>
          {streaming && (
            <div className="flex gap-1 items-center">
              <span className="h-1 w-1 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1 w-1 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1 w-1 rounded-full bg-primary animate-bounce" />
            </div>
          )}
        </div>
        <div className={MARKDOWN_PROSE}>
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{msg.content}</ReactMarkdown>
        </div>
        {!streaming && onSaveDoc && (msg.agent === "drafting" || msg.content.length > 600) && (
          <div className="mt-4 pt-4 border-t border-border/20">
            <Button
              variant="secondary"
              size="sm"
              className="h-8 gap-2 text-[0.8125rem] font-medium bg-secondary/40 border-border/40 hover:bg-secondary/80"
              type="button"
              onClick={() => void onSaveDoc(msg.content)}
            >
              <Save className="h-3.5 w-3.5" /> Save to Matter Documents
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
