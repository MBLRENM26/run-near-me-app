import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  getSyncRuns,
  triggerSyncRun,
  SYNC_SOURCES,
  type SyncRun,
  type SyncSource,
} from "@/lib/admin-sync.functions";

export const Route = createFileRoute("/_adminShell/admin/sync-runs")({
  component: AdminSyncRunsPage,
});

const SOURCE_LABEL: Record<SyncSource, string> = {
  "england-athletics": "England Athletics",
  "scottish-athletics": "Scottish Athletics",
};

const STALE_AFTER_MS = 10 * 60 * 1000; // 10 minutes

function isStale(run: SyncRun): boolean {
  if (run.status !== "running") return false;
  return Date.now() - new Date(run.started_at).getTime() > STALE_AFTER_MS;
}

function displayStatus(run: SyncRun): string {
  if (run.status === "running" && isStale(run)) return "stale";
  return run.status;
}

function AdminSyncRunsPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "sync-runs"],
    queryFn: () => getSyncRuns(),
    // Poll while any row is actively running (not yet stale). Stops when
    // all rows have finalised so we're not hammering the API forever.
    refetchInterval: (q) => {
      const rows = q.state.data as SyncRun[] | undefined;
      if (!rows) return false;
      const live = rows.some((r) => r.status === "running" && !isStale(r));
      return live ? 3000 : false;
    },
  });

  const trigger = useServerFn(triggerSyncRun);

  const runMutation = useMutation({
    mutationFn: (source: SyncSource) => trigger({ data: { source } }),
    onMutate: async () => {
      // Surface the freshly-inserted `running` row asap
      await qc.invalidateQueries({ queryKey: ["admin", "sync-runs"] });
    },
    onSettled: () => {
      // Always refetch — even when the client fetch timed out, the server
      // may have written a finished row by now.
      qc.invalidateQueries({ queryKey: ["admin", "sync-runs"] });
    },
    onSuccess: (res, source) => {
      if (res.started) {
        toast.message(
          `${SOURCE_LABEL[source]} sync started — table will update when it finishes`,
        );
      } else {
        toast.success(
          `${SOURCE_LABEL[source]} sync finished: ${res.newEvents} new, ${res.updatedExisting} updated`,
        );
      }
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    },
  });

  // A source is "busy" if a mutation is in flight, OR its most recent row is
  // still actively running (not yet stale).
  function isSourceBusy(source: SyncSource): boolean {
    if (runMutation.isPending) return true;
    const latest = data?.find((r) => r.source === source);
    if (!latest) return false;
    return latest.status === "running" && !isStale(latest);
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Sync runs</h1>
        <p className="text-sm text-muted-foreground">
          Last 50 runs of the weekly event-source imports.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {SYNC_SOURCES.map((s) => {
          const busy = isSourceBusy(s);
          return (
            <Button
              key={s}
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => runMutation.mutate(s)}
            >
              {busy ? "Running…" : `Run ${SOURCE_LABEL[s]} now`}
            </Button>
          );
        })}
      </div>

      {isLoading && <p className="mt-8 text-muted-foreground">Loading…</p>}
      {error && (
        <p className="mt-8 text-destructive">
          {error instanceof Error ? error.message : "Failed to load"}
        </p>
      )}

      {data && data.length === 0 && (
        <p className="mt-8 text-muted-foreground">
          No sync runs recorded yet. Trigger one above, or wait for the next
          weekly cron (Mondays 03:00 UTC).
        </p>
      )}

      {data && data.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Started</th>
                <th className="px-3 py-2 font-medium">Duration</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium text-right">New</th>
                <th className="px-3 py-2 font-medium text-right">Updated</th>
                <th className="px-3 py-2 font-medium text-right">Fetched</th>
                <th className="px-3 py-2 font-medium text-right">Skipped</th>
                <th className="px-3 py-2 font-medium text-right">Failed pages</th>
                <th className="px-3 py-2 font-medium">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((r) => (
                <Row key={r.id} r={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Row({ r }: { r: SyncRun }) {
  const skipped = (r.skipped_dupes ?? 0) + (r.skipped_no_date ?? 0);
  return (
    <tr>
      <td className="px-3 py-2 font-mono text-foreground">{r.source}</td>
      <td className="px-3 py-2 text-muted-foreground">{formatDate(r.started_at)}</td>
      <td className="px-3 py-2 text-muted-foreground">{formatDuration(r.duration_ms)}</td>
      <td className="px-3 py-2">
        <StatusPill status={displayStatus(r)} />
      </td>
      <td className="px-3 py-2 text-right font-semibold text-foreground">{fmt(r.new_events)}</td>
      <td className="px-3 py-2 text-right text-muted-foreground">{fmt(r.updated_existing)}</td>
      <td className="px-3 py-2 text-right text-muted-foreground">{fmt(r.fetched)}</td>
      <td className="px-3 py-2 text-right text-muted-foreground">
        {skipped > 0 ? skipped.toLocaleString() : "—"}
      </td>
      <td className="px-3 py-2 text-right text-muted-foreground">{fmt(r.failed_pages)}</td>
      <td className="px-3 py-2 text-xs text-destructive max-w-[280px] truncate">
        {r.error_message ?? ""}
      </td>
    </tr>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "success"
      ? "bg-green-500/10 text-green-700 dark:text-green-400"
      : status === "running"
        ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
        : status === "partial" || status === "stale"
          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
          : "bg-destructive/10 text-destructive";
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(ms: number | null): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s - m * 60);
  return `${m}m ${rem}s`;
}
