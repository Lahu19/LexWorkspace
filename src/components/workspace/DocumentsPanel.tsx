import { useEffect, useRef, useState } from "react";
import type { Matter } from "./Workspace";
import { apiFetch } from "@/lib/api";
import { AGENTS, type AgentId } from "@/lib/agents";
import { MARKDOWN_PROSE } from "@/lib/markdown-prose";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Trash2, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

interface Doc {
  id: string;
  matter_id: string;
  title: string;
  doc_type: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export function DocumentsPanel({ matter }: { matter: Matter }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const prevMatterId = useRef<string | null>(null);

  const fetchDocs = async () => {
    try {
      const data = await apiFetch<Doc[]>(`/api/matters/${matter.id}/documents`);
      setDocs(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setActiveId(null);
    void fetchDocs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matter.id]);

  useEffect(() => {
    if (loading) return;
    if (prevMatterId.current !== matter.id) {
      prevMatterId.current = matter.id;
      setActiveId(docs[0]?.id ?? null);
      return;
    }
    setActiveId((id) => (id != null ? id : (docs[0]?.id ?? null)));
  }, [matter.id, docs, loading]);

  const remove = async (id: string) => {
    try {
      await apiFetch(`/api/documents/${id}`, { method: "DELETE" });
      setDocs((d) => d.filter((x) => x.id !== id));
      if (activeId === id) setActiveId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete document");
    }
  };

  const download = (d: Doc) => {
    const blob = new Blob([d.content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${d.title.replace(/[^a-z0-9-_ ]/gi, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const active = docs.find((d) => d.id === activeId) ?? null;

  return (
    <div className="flex-1 flex min-h-0">
      <div className="w-72 border-r border-border/60 bg-card/30 flex flex-col">
        <div className="px-4 py-3 border-b border-border/60">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Documents</p>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="px-4 py-3 text-xs font-mono text-muted-foreground">loading…</div>
          ) : docs.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">No documents yet.</p>
              <p className="text-[10px] font-mono text-muted-foreground/60 mt-1">
                Save drafts from the chat console.
              </p>
            </div>
          ) : (
            <ul className="p-2 space-y-0.5">
              {docs.map((d) => {
                const meta = AGENTS[d.doc_type as AgentId] ?? AGENTS.drafting;
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(d.id)}
                      className={`w-full text-left px-3 py-2 rounded-md transition ${
                        activeId === d.id ? "bg-primary/10" : "hover:bg-card"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-sm shrink-0" style={{ color: `var(${meta.colorVar})` }}>
                          {meta.emoji}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {d.title.replace(/\*\*|_|#+|`/g, "").trim()}
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground truncate">
                            {new Date(d.updated_at).toLocaleDateString()} · {meta.short}
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {!active ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Select a document to view</p>
          </div>
        ) : (
          <>
            <div className="px-6 py-3 border-b border-border/60 flex items-center justify-between gap-3">
              <h3 className="font-display font-semibold truncate">
                {active.title.replace(/\*\*|_|#+|`/g, "").trim()}
              </h3>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => download(active)} className="gap-1.5 h-8">
                  <Download className="h-3.5 w-3.5" /> Download
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => void remove(active.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin px-8 py-8 grid-bg bg-fixed">
              <article className={cn(MARKDOWN_PROSE, "max-w-3xl mx-auto")}>
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{active.content}</ReactMarkdown>
              </article>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
