import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { adminCheckSession } from "@/lib/admin.functions";
import { listChangeReports, reviewChangeReport } from "@/lib/admin-change-reports.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { CHANGE_FEED_ACCEPTANCE_ENABLED } from "@/lib/change-feed-release";

const STATUSES = ["pending", "accepted", "rejected", "unknown"] as const;

export const Route = createFileRoute("/_adminShell/admin/change-reports")({
  validateSearch: z.object({ status: z.enum(STATUSES).optional() }),
  head: () => ({
    meta: [
      { title: "Change reports — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ChangeReportsPage,
});

function ChangeReportsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const qc = useQueryClient();
  const checkSession = useServerFn(adminCheckSession);
  const fetchList = useServerFn(listChangeReports);
  const review = useServerFn(reviewChangeReport);
  const [authed, setAuthed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const status = search.status ?? "pending";

  useEffect(() => {
    checkSession()
      .then((r) => (r.authenticated ? setAuthed(true) : navigate({ to: "/admin/login" })))
      .catch(() => navigate({ to: "/admin/login" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-change-reports", status],
    queryFn: () => fetchList({ data: { status } }),
    enabled: authed,
  });

  async function decide(id: string, decision: "accepted" | "rejected" | "unknown") {
    setBusy(id);
    try {
      await review({ data: { id, decision } });
      toast.success(`Marked ${decision}`);
      await qc.invalidateQueries({ queryKey: ["admin-change-reports"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <Toaster />
      <h1 className="text-2xl font-bold text-foreground">Race change reports</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Changes spotted on official race pages by the homelab checker. Reports are collected for
        review. Applying changes is temporarily unavailable; keep reports pending until that work
        is complete. Rejecting or marking a report unknown does not change the race listing.
      </p>
      <div className="mt-4 flex gap-2">
        {STATUSES.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={s === status ? "default" : "outline"}
            onClick={() => navigate({ search: { status: s } })}
          >
            {s}
          </Button>
        ))}
      </div>
      {isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}
      {data && data.rows.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">No {status} reports.</p>
      )}
      <ul className="mt-6 space-y-3">
        {data?.rows.map((r) => (
          <li key={r.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <a
                href={r.event?.slug ? `/events/${r.event.slug}` : "#"}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-foreground hover:text-primary"
              >
                {r.event?.name ?? r.event_id}
              </a>
              <span className="text-xs text-muted-foreground">
                checked {new Date(r.observed_at).toLocaleString("en-GB")}
              </span>
            </div>
            <p className="mt-2 text-sm text-foreground">
              <span className="font-mono">{r.field}</span>: {r.old_value ?? "—"} →{" "}
              <strong>{r.new_value ?? "—"}</strong>
            </p>
            <a
              href={r.source_url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block break-all text-xs text-primary underline"
            >
              {r.source_url}
            </a>
            {status === "pending" && (
              <div className="mt-3 flex gap-2">
                <Button size="sm" disabled={!CHANGE_FEED_ACCEPTANCE_ENABLED || busy === r.id} onClick={() => decide(r.id, "accepted")}>
                  Accept
                </Button>
                <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => decide(r.id, "rejected")}>
                  Reject
                </Button>
                <Button size="sm" variant="ghost" disabled={busy === r.id} onClick={() => decide(r.id, "unknown")}>
                  Mark unknown
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
