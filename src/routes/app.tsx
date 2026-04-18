import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Workspace } from "@/components/workspace/Workspace";

export const Route = createFileRoute("/app")({
  component: AppRoute,
});

function AppRoute() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-sm font-mono text-muted-foreground animate-pulse">loading workspace…</div>
      </div>
    );
  }

  return <Workspace />;
}
