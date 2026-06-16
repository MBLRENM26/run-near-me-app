import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { adminLogout } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_adminShell")({
  head: () => ({
    meta: [
      { title: "Admin — Running Events Near Me" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const logout = useServerFn(adminLogout);

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/admin/login" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="text-sm font-semibold text-foreground hover:text-primary"
            >
              Running Events Near Me
            </Link>
            <span className="text-sm text-muted-foreground">Admin</span>
            <Link
              to="/admin/claims"
              className="text-sm font-medium text-foreground hover:text-primary"
            >
              Submissions
            </Link>
            <Link
              to="/admin/events"
              className="text-sm font-medium text-foreground hover:text-primary"
            >
              Events
            </Link>
            <Link
              to="/admin/search"
              className="text-sm font-medium text-foreground hover:text-primary"
            >
              Search
            </Link>
            <Link
              to="/admin/sync-runs"
              className="text-sm font-medium text-foreground hover:text-primary"
            >
              Sync runs
            </Link>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Log out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
