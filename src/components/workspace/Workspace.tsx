import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { MatterList } from "./MatterList";
import { ChatConsole } from "./ChatConsole";
import { DocumentsPanel } from "./DocumentsPanel";
import { Button } from "@/components/ui/button";
import { LogOut, FileText, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export type Matter = Tables<"matters">;

export function Workspace() {
  const { user, signOut } = useAuth();
  const [matters, setMatters] = useState<Matter[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [rightPane, setRightPane] = useState<"chat" | "docs">("chat");
  const [loadingMatters, setLoadingMatters] = useState(true);

  const fetchMatters = async () => {
    const { data, error } = await supabase
      .from("matters")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) { toast.error(error.message); return; }
    setMatters(data ?? []);
    setLoadingMatters(false);
    if (!activeId && data && data.length > 0) setActiveId(data[0].id);
  };

  useEffect(() => { fetchMatters(); }, []);

  const createMatter = async (input: { title: string; client?: string; description?: string }) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("matters")
      .insert({ user_id: user.id, title: input.title, client: input.client, description: input.description })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setMatters((m) => [data, ...m]);
    setActiveId(data.id);
    toast.success("Matter created");
  };

  const deleteMatter = async (id: string) => {
    const { error } = await supabase.from("matters").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setMatters((m) => m.filter((x) => x.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const active = matters.find((m) => m.id === activeId) ?? null;

  return (
    <div className="h-screen w-full flex bg-background text-foreground overflow-hidden">
      {/* Left: matter list */}
      <aside className="w-72 lg:w-80 shrink-0 border-r border-border/60 bg-card/40 flex flex-col">
        <div className="h-14 px-4 flex items-center justify-between border-b border-border/60">
          <div className="flex items-center gap-2 font-display text-sm">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">L</span>
            <span>lex<span className="text-primary">.</span>workforce</span>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} title="Sign out" className="h-8 w-8">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <MatterList
          matters={matters}
          activeId={activeId}
          loading={loadingMatters}
          onSelect={setActiveId}
          onCreate={createMatter}
          onDelete={deleteMatter}
        />
        <div className="px-4 py-3 border-t border-border/60 text-[10px] font-mono text-muted-foreground truncate">
          {user?.email}
        </div>
      </aside>

      {/* Right: chat or docs */}
      <main className="flex-1 flex flex-col min-w-0">
        {!active ? (
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
                  onClick={() => setRightPane("chat")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition ${rightPane === "chat" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Console
                </button>
                <button
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
