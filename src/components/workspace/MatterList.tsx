import { useState } from "react";
import type { Matter } from "./Workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, FolderOpen } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props {
  matters: Matter[];
  activeId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onCreate: (m: { title: string; client?: string; description?: string }) => void;
  onDelete: (id: string) => void;
}

export function MatterList({ matters, activeId, loading, onSelect, onCreate, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [description, setDescription] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate({ title: title.trim(), client: client.trim() || undefined, description: description.trim() || undefined });
    setTitle(""); setClient(""); setDescription("");
    setOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-3 pt-3">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full justify-start gap-2" variant="secondary">
              <Plus className="h-4 w-4" /> New matter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a matter</DialogTitle>
              <DialogDescription>A matter groups all chats and documents for one case or engagement.</DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="t">Title</Label>
                <Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} placeholder="e.g. Acme NDA review" />
              </div>
              <div>
                <Label htmlFor="c">Client</Label>
                <Input id="c" value={client} onChange={(e) => setClient(e.target.value)} maxLength={120} placeholder="Optional" />
              </div>
              <div>
                <Label htmlFor="d">Brief / context</Label>
                <Textarea id="d" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={4} placeholder="Background the agents should know about this matter…" />
              </div>
              <DialogFooter>
                <Button type="submit">Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="px-4 pt-5 pb-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Matters</p>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-2">
        {loading ? (
          <div className="px-3 py-2 text-xs font-mono text-muted-foreground">loading…</div>
        ) : matters.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <FolderOpen className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">No matters yet.</p>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {matters.map((m) => (
              <li key={m.id}>
                <div
                  className={`group flex items-center gap-2 rounded-md px-3 py-2 cursor-pointer transition ${
                    activeId === m.id ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-card hover:text-foreground"
                  }`}
                  onClick={() => onSelect(m.id)}
                >
                  <div
                    className={`h-1.5 w-1.5 rounded-full shrink-0 ${activeId === m.id ? "bg-primary" : "bg-muted-foreground/40"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{m.title}</div>
                    {m.client && <div className="text-[10px] font-mono truncate opacity-70">{m.client}</div>}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="opacity-0 group-hover:opacity-100 transition p-1 rounded hover:bg-destructive/20 hover:text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete matter?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the matter, all its chat history, and documents.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(m.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
