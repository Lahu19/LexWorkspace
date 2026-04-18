import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";

const signInSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "At least 6 characters").max(128),
});
const signUpSchema = signInSchema.extend({
  fullName: z.string().trim().min(1, "Required").max(100),
  firmName: z.string().trim().max(100).optional(),
  role: z.string().trim().max(60).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: (s.mode as string) === "signup" ? "signup" : "signin",
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(mode === "signup");
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [firmName, setFirmName] = useState("");
  const [role, setRole] = useState("Attorney");

  useEffect(() => { setIsSignup(mode === "signup"); }, [mode]);
  useEffect(() => { if (!loading && user) navigate({ to: "/app" }); }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (isSignup) {
        const parsed = signUpSchema.safeParse({ email, password, fullName, firmName, role });
        if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
            data: {
              full_name: parsed.data.fullName,
              firm_name: parsed.data.firmName ?? "",
              role: parsed.data.role ?? "Attorney",
            },
          },
        });
        if (error) {
          if (error.message.includes("registered")) toast.error("Email already registered. Sign in instead.");
          else toast.error(error.message);
          return;
        }
        toast.success("Account created! Check your inbox if email confirmation is required.");
      } else {
        const parsed = signInSchema.safeParse({ email, password });
        if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) { toast.error(error.message); return; }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 grid-bg">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8 font-display text-lg">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">L</span>
          <span>lex<span className="text-primary">.</span>workforce</span>
        </Link>
        <div className="rounded-2xl border border-border bg-card p-8 surface-card">
          <h1 className="font-display text-2xl font-bold">
            {isSignup ? "Create your workspace" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignup ? "Spin up your AI legal workforce in seconds." : "Sign in to your workspace."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {isSignup && (
              <>
                <div>
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={100} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="firmName">Firm / company</Label>
                    <Input id="firmName" value={firmName} onChange={(e) => setFirmName(e.target.value)} maxLength={100} placeholder="Optional" />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Input id="role" value={role} onChange={(e) => setRole(e.target.value)} maxLength={60} />
                  </div>
                </div>
              </>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} maxLength={128} />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "..." : isSignup ? "Create account" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignup ? "Already have an account? " : "Need an account? "}
            <button
              type="button"
              onClick={() => navigate({ to: "/auth", search: { mode: isSignup ? "signin" : "signup" } })}
              className="text-primary hover:underline font-medium"
            >
              {isSignup ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
