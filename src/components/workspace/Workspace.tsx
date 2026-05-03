import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { apiFetch } from "@/lib/api";
import { MatterList } from "./MatterList";
import { ChatConsole } from "./ChatConsole";
import { DocumentsPanel } from "./DocumentsPanel";
import { Button } from "@/components/ui/button";
import { Home, FileText, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export interface Matter {
  id: string;
  user_id: string;
  title: string;
  client: string | null;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export function Workspace() {
  const [matters, setMatters] = useState<Matter[]>([]);
  const [selectedMatterId, setSelectedMatterId] = useState<string | null>(null);
  const [rightPane, setRightPane] = useState<"chat" | "docs">("chat");
  const [loadingMatters, setLoadingMatters] = useState(true);

  const fetchMatters = useCallback(async () => {
    try {
      const data = await apiFetch<Matter[]>("/api/matters");
      setMatters(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load matters");
    } finally {
      setLoadingMatters(false);
    }
  }, []);

  useEffect(() => {
    void fetchMatters();
  }, [fetchMatters]);

  useEffect(() => {
    setSelectedMatterId((id) => {
      if (id != null && matters.some((m) => m.id === id)) return id;
      return matters[0]?.id ?? null;
    });
  }, [matters]);

  const createMatter = useCallback(
    async (input: { title: string; client?: string; description?: string }) => {
      try {
        const created = await apiFetch<Matter>("/api/matters", {
          method: "POST",
          body: JSON.stringify(input),
        });
        setMatters((m) => [created, ...m]);
        setSelectedMatterId(created.id);
        toast.success("Matter created");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create matter");
      }
    },
    [],
  );

  const deleteMatter = useCallback(
    async (id: string) => {
      try {
        await apiFetch(`/api/matters/${id}`, { method: "DELETE" });
        setMatters((m) => m.filter((x) => x.id !== id));
        if (selectedMatterId === id) setSelectedMatterId(null);
        toast.success("Matter removed");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete matter");
      }
    },
    [selectedMatterId],
  );

  const active = matters.find((m) => m.id === selectedMatterId) ?? null;

  return (
    <div className="h-screen w-full flex bg-background text-foreground overflow-hidden">
      <aside className="w-72 lg:w-80 shrink-0 border-r border-border/60 bg-card/40 flex flex-col">
        <div className="h-14 px-4 flex items-center justify-between border-b border-border/60">
          <div className="flex items-center gap-2 font-display text-sm">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">L</span>
            <span>
              lex<span className="text-primary">.</span>workforce
            </span>
          </div>
          <Button variant="ghost" size="icon" asChild title="Home" className="h-8 w-8">
            <Link to="/">
              <Home className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <MatterList
          matters={matters}
          activeId={selectedMatterId}
          loading={loadingMatters}
          onSelect={setSelectedMatterId}
          onCreate={(input) => void createMatter(input)}
          onDelete={(id) => void deleteMatter(id)}
        />
        <div className="px-4 py-3 border-t border-border/60 text-[10px] font-mono text-muted-foreground truncate">
          Local session · MongoDB backend
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        {active == null ? (
          <EmptyState />
        ) : (
          <>
            <div className="h-14 px-6 flex items-center justify-between border-b border-border/60 shrink-0">
              <div className="min-w-0">
                <h2 className="font-display font-semibold truncate">{active.title}</h2>
                {active.client && (
                  <p className="text-xs font-mono text-muted-foreground truncate">{active.client}</p>
                )}
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
                <button
                  type="button"
                  onClick={() => setRightPane("chat")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition ${rightPane === "chat" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Console
                </button>
                <button
                  type="button"
                  onClick={() => setRightPane("docs")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition ${rightPane === "docs" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <FileText className="h-3.5 w-3.5" /> Documents
                </button>
              </div>
            </div>
            {rightPane === "chat" ? (
              <ChatConsole matter={active} />
            ) : (
              <DocumentsPanel matter={active} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center grid-bg">
      <div className="text-center max-w-sm">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl mb-4">⚖️</div>
        <h3 className="font-display text-xl font-semibold">No matter selected</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Create a new matter from the sidebar to brief your AI workforce.
        </p>
      </div>
    </div>
  );
}
