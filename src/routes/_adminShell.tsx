import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminLogout } from "@/lib/admin.functions";
import { getUnseenCounts } from "@/lib/admin-notify.functions";
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

function Badge({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span className="ml-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
      {n > 99 ? "99+" : n}
    </span>
  );
}

function AdminLayout() {
  const navigate = useNavigate();
  const logout = useServerFn(adminLogout);
  const fetchCounts = useServerFn(getUnseenCounts);

  const { data: counts } = useQuery({
    queryKey: ["admin-unseen-counts"],
    queryFn: () => fetchCounts(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/admin/login" });
  };

  const subs = counts?.submissions ?? 0;
  const claims = counts?.clubClaims ?? 0;

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
              Submissions<Badge n={subs} />
            </Link>
            <Link
              to="/admin/club-claims"
              className="text-sm font-medium text-foreground hover:text-primary"
            >
              Club claims<Badge n={claims} />
            </Link>
            <Link
              to="/admin/clubs"
              className="text-sm font-medium text-foreground hover:text-primary"
            >
              Clubs
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

