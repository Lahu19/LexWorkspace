import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/workspace/Workspace";

export const Route = createFileRoute("/app")({
  component: AppRoute,
});

/**
 * The main app route. Supabase auth has been removed.
 * Renders the Workspace directly — all data lives in MongoDB via the Express API.
 */
function AppRoute() {
  return <Workspace />;
}
