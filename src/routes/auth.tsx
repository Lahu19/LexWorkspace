import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

/** Legacy route: sign-in UI removed; send users straight to the workspace. */
export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: (s.mode as string) === "signup" ? "signup" : "signin",
  }),
  component: AuthRedirect,
});

function AuthRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/app", replace: true });
  }, [navigate]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-sm font-mono text-muted-foreground animate-pulse">Opening workspace…</p>
    </div>
  );
}
