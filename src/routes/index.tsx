import { createFileRoute, Link } from "@tanstack/react-router";
import { AGENT_LIST } from "@/lib/agents";
import { Button } from "@/components/ui/button";
import { ArrowRight, Scale, Shield, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border/60 backdrop-blur sticky top-0 z-50 bg-background/80">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display text-lg">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">L</span>
            <span>lex<span className="text-primary">.</span>workforce</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/app"><Button variant="ghost" size="sm">Workspace</Button></Link>
            <Link to="/app"><Button size="sm">Get started</Button></Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative surface-hero overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-xs text-muted-foreground font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Four specialized agents · one workspace
            </div>
            <h1 className="mt-6 font-display text-5xl md:text-7xl font-bold tracking-tight">
              Your AI <span className="text-primary">paralegal</span><br/>workforce.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl">
              Lex augments small firms, corporate legal teams, and startups with four
              dedicated agents — research, drafting, compliance, and case summary —
              working in one collaborative console.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/app">
                <Button size="lg" className="glow-emerald">
                  Open the workspace <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/app">
                <Button size="lg" variant="outline">Open console</Button>
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-6 text-xs text-muted-foreground font-mono">
              <span className="flex items-center gap-2"><Shield className="h-3.5 w-3.5" /> Session-local demo data</span>
              <span className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5" /> Streaming responses</span>
              <span className="flex items-center gap-2"><Scale className="h-3.5 w-3.5" /> Cite-aware research</span>
            </div>
          </div>
        </div>
      </section>

      {/* Agents grid */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-12">
          <p className="font-mono text-xs uppercase tracking-widest text-primary">// the workforce</p>
          <h2 className="mt-3 font-display text-3xl md:text-4xl font-bold">Four agents. One brief.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {AGENT_LIST.map((a) => (
            <div
              key={a.id}
              className="group relative rounded-xl border border-border/60 bg-card p-6 surface-card transition hover:border-border"
            >
              <div
                className="absolute inset-x-0 top-0 h-px"
                style={{ background: `linear-gradient(90deg, transparent, var(${a.colorVar}), transparent)` }}
              />
              <div
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-xl mb-4"
                style={{ background: `color-mix(in oklab, var(${a.colorVar}) 15%, transparent)`, color: `var(${a.colorVar})` }}
              >
                {a.emoji}
              </div>
              <h3 className="font-display text-lg font-semibold">{a.name}</h3>
              <p className="mt-1 text-xs font-mono text-muted-foreground">{a.tagline}</p>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{a.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Audience */}
      <section className="border-t border-border/60 bg-card/30">
        <div className="mx-auto max-w-7xl px-6 py-20 grid gap-8 md:grid-cols-3">
          {[
            { t: "Small law firms", d: "Punch above your weight without expanding headcount." },
            { t: "Corporate legal teams", d: "Faster turnaround on contracts, compliance, and memos." },
            { t: "Startups", d: "Get general-counsel-grade output before you have a GC." },
          ].map((c) => (
            <div key={c.t}>
              <h3 className="font-display text-xl">{c.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-7xl px-6 py-8 text-xs font-mono text-muted-foreground flex flex-wrap items-center justify-between gap-4">
          <span>© Lex Workforce. Informational use only — not legal advice.</span>
          <span>v0.1 · powered by Lovable AI</span>
        </div>
      </footer>
    </div>
  );
}
