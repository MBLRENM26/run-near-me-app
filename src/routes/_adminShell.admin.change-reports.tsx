import { createFileRoute, redirect } from "@tanstack/react-router";

// Preserve bookmarked URLs; all evidence and reports now use one review screen.
export const Route = createFileRoute("/_adminShell/admin/change-reports")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/source-research" });
  },
});
