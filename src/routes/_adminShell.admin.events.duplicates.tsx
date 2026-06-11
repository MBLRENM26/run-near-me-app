import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminCheckSession } from "@/lib/admin.functions";
import {
  findPotentialDuplicates,
  mergeDuplicateEvents,
  mergeDuplicateCluster,
  mergeAllHighConfidenceClusters,
  markClusterAsSeries,
  type DuplicateCluster,
  type DuplicateConfidence,
  type DuplicateRow,
} from "@/lib/admin-events.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_adminShell/admin/events/duplicates")({
  head: () => ({
    meta: [
      { title: "Duplicates — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminDuplicatesPage,
});

const TIER_LABEL: Record<DuplicateConfidence, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence — review manually",
};

const TIER_DESC: Record<DuplicateConfidence, string> = {
  high: "Same race based on date/town/source. Safe to bulk-merge.",
  medium: "Likely the same race but some signals are missing. Review per cluster.",
  low: "Conflicting dates or towns. These are probably distinct events — hand-review only.",
};

function AdminDuplicatesPage() {
  const navigate = useNavigate();
  const checkSession = useServerFn(adminCheckSession);
  const fetchDuplicates = useServerFn(findPotentialDuplicates);
  const mergeFn = useServerFn(mergeDuplicateEvents);
  const mergeClusterFn = useServerFn(mergeDuplicateCluster);
  const mergeAllHighFn = useServerFn(mergeAllHighConfidenceClusters);
  const markSeriesFn = useServerFn(markClusterAsSeries);
  const queryClient = useQueryClient();

  const [authChecked, setAuthChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    checkSession()
      .then((res) => {
        if (!res.authenticated) navigate({ to: "/admin/login" });
        else setAuthChecked(true);
      })
      .catch(() => navigate({ to: "/admin/login" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-duplicates"],
    queryFn: () => fetchDuplicates(),
    enabled: authChecked,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-duplicates"] });

  const handleMerge = async (survivor: DuplicateRow, dupe: DuplicateRow) => {
    if (
      !confirm(
        `Mark "${dupe.name}" (${dupe.slug ?? "no slug"}) as a duplicate of "${survivor.name}" (${survivor.slug ?? "no slug"})?`,
      )
    )
      return;
    try {
      const res = await mergeFn({
        data: { survivorId: survivor.id, duplicateId: dupe.id },
      });
      toast.success(res.copied_tags ? "Merged. Tags copied." : "Merged.");
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Merge failed");
    }
  };

  const handleClusterMerge = async (cluster: DuplicateCluster) => {
    const [survivor, ...rest] = cluster.rows;
    if (!rest.length) return;
    if (
      !confirm(
        `Merge ${rest.length} row${rest.length === 1 ? "" : "s"} into "${survivor.name}" (${survivor.slug ?? "no slug"})?`,
      )
    )
      return;
    setBusy(true);
    try {
      const res = await mergeClusterFn({
        data: {
          survivorId: survivor.id,
          duplicateIds: rest.map((r) => r.id),
        },
      });
      if (res.failed.length) {
        toast.warning(
          `Merged ${res.merged}; ${res.failed.length} failed. ${res.failed[0]?.error ?? ""}`,
        );
      } else {
        toast.success(`Merged ${res.merged} row${res.merged === 1 ? "" : "s"}.`);
      }
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk merge failed");
    } finally {
      setBusy(false);
    }
  };

  const handleMergeAllHigh = async () => {
    const highClusters = (data?.clusters ?? []).filter(
      (c) => c.confidence === "high",
    );
    const totalRows = highClusters.reduce((n, c) => n + (c.rows.length - 1), 0);
    if (!totalRows) {
      toast.info("No high-confidence duplicates to merge.");
      return;
    }
    const sample = highClusters
      .slice(0, 10)
      .map((c) => `• ${c.rows[0]?.name ?? "?"} (${c.rows.length} rows)`)
      .join("\n");
    if (
      !confirm(
        `Merge ${totalRows} duplicate row${totalRows === 1 ? "" : "s"} across ${highClusters.length} high-confidence cluster${highClusters.length === 1 ? "" : "s"}?\n\nSample:\n${sample}`,
      )
    )
      return;
    setBusy(true);
    try {
      const res = await mergeAllHighFn();
      if (res.failed.length) {
        toast.warning(
          `Merged ${res.merged} across ${res.clusters_processed} clusters; ${res.failed.length} failed.`,
        );
      } else {
        toast.success(
          `Merged ${res.merged} rows across ${res.clusters_processed} clusters.`,
        );
      }
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk merge failed");
    } finally {
      setBusy(false);
    }
  };

  const handleMarkSeries = async (cluster: DuplicateCluster) => {
    if (
      !confirm(
        `Mark all ${cluster.rows.length} rows of "${cluster.rows[0]?.name}" as a recurring series? They'll be flagged is_recurring=true, grouped by a shared series_key, and removed from this duplicates view.`,
      )
    )
      return;
    setBusy(true);
    try {
      const res = await markSeriesFn({
        data: { ids: cluster.rows.map((r) => r.id) },
      });
      toast.success(
        `Marked ${res.marked} row${res.marked === 1 ? "" : "s"} as series (${res.series_key}).`,
      );
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Mark as series failed");
    } finally {
      setBusy(false);
    }
  };

  if (!authChecked) {
    return <p className="text-sm text-muted-foreground">Checking session…</p>;
  }

  const clusters = data?.clusters ?? [];
  const seriesClusters = clusters.filter((c) => c.kind === "series");
  const dupeClusters = clusters.filter((c) => c.kind === "duplicate");
  const byTier: Record<DuplicateConfidence, DuplicateCluster[]> = {
    high: dupeClusters.filter((c) => c.confidence === "high"),
    medium: dupeClusters.filter((c) => c.confidence === "medium"),
    low: dupeClusters.filter((c) => c.confidence === "low"),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Potential duplicates
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Grouped by tier. Recurring series are surfaced separately —
            don't merge those, mark them as a series so they're shown as
            scheduled fixtures instead.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-sm text-muted-foreground">
          <Link to="/admin/events" className="text-primary hover:underline">
            ← Back to all events
          </Link>
          <div>
            {clusters.length} cluster{clusters.length === 1 ? "" : "s"} ·{" "}
            {seriesClusters.length} series · {byTier.high.length} high ·{" "}
            {byTier.medium.length} medium · {byTier.low.length} low
            {isFetching && " · refreshing…"}
          </div>
        </div>
      </div>

      {byTier.high.length > 0 && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-medium text-foreground">
                Merge all high-confidence clusters
              </div>
              <div className="text-sm text-muted-foreground">
                {byTier.high.reduce((n, c) => n + (c.rows.length - 1), 0)} rows
                across {byTier.high.length} clusters will be marked as
                duplicates of their auto-picked survivor.
              </div>
            </div>
            <Button disabled={busy} onClick={handleMergeAllHigh}>
              Merge all high
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Scanning…</p>
      ) : clusters.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No obvious duplicates found.
          </p>
        </div>
      ) : (
        <>
          {seriesClusters.length > 0 && (
            <section className="space-y-3">
              <div className="border-b border-border pb-1">
                <h2 className="text-lg font-semibold text-foreground">
                  Recurring series ({seriesClusters.length})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Looks like a recurring series (e.g. RunThrough fortnightly,
                  Grand Prix). Don't merge — mark as a series so they're
                  flagged as recurring on listings.
                </p>
              </div>
              {seriesClusters.map((cluster) => (
                <ClusterCard
                  key={cluster.key}
                  cluster={cluster}
                  busy={busy}
                  onMergeAll={null}
                  onMergeOne={handleMerge}
                  onMarkSeries={() => handleMarkSeries(cluster)}
                />
              ))}
            </section>
          )}
          {(["high", "medium", "low"] as DuplicateConfidence[]).map((tier) => {
            const list = byTier[tier];
            if (!list.length) return null;
            return (
              <section key={tier} className="space-y-3">
                <div className="border-b border-border pb-1">
                  <h2 className="text-lg font-semibold text-foreground">
                    {TIER_LABEL[tier]} ({list.length})
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {TIER_DESC[tier]}
                  </p>
                </div>
                {list.map((cluster) => (
                  <ClusterCard
                    key={cluster.key}
                    cluster={cluster}
                    busy={busy}
                    onMergeAll={
                      tier !== "low" ? () => handleClusterMerge(cluster) : null
                    }
                    onMergeOne={handleMerge}
                    onMarkSeries={
                      tier === "low"
                        ? () => handleMarkSeries(cluster)
                        : null
                    }
                  />
                ))}
              </section>
            );
          })}
        </>
      )}

      <Toaster position="top-center" />
    </div>
  );
}

function ClusterCard({
  cluster,
  busy,
  onMergeAll,
  onMergeOne,
  onMarkSeries,
}: {
  cluster: DuplicateCluster;
  busy: boolean;
  onMergeAll: (() => void) | null;
  onMergeOne: (survivor: DuplicateRow, dupe: DuplicateRow) => void;
  onMarkSeries?: (() => void) | null;
}) {
  const survivor = cluster.rows[0];
  const tierColor: Record<DuplicateConfidence, string> = {
    high: "bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-200",
    medium:
      "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-200",
    low: "bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200",
  };
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2 text-xs">
        <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
          {cluster.kind === "series" ? (
            <span className="rounded bg-blue-100 px-1.5 py-0.5 font-medium uppercase text-blue-900 dark:bg-blue-900/30 dark:text-blue-200">
              series
            </span>
          ) : (
            <span
              className={`rounded px-1.5 py-0.5 font-medium uppercase ${tierColor[cluster.confidence]}`}
            >
              {cluster.confidence}
            </span>
          )}
          <span>{cluster.reason}</span>
          <span>·</span>
          <span>{cluster.rows.length} rows</span>
          {cluster.kind !== "series" && (
            <>
              <span>·</span>
              <span>
                survivor:{" "}
                <span className="font-mono text-foreground">
                  {survivor.slug ?? survivor.id.slice(0, 8)}
                </span>
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onMarkSeries && (
            <Button
              size="sm"
              variant={cluster.kind === "series" ? "default" : "outline"}
              disabled={busy}
              onClick={onMarkSeries}
            >
              Mark as series
            </Button>
          )}
          {onMergeAll && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={onMergeAll}
            >
              Merge all in cluster
            </Button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Name / slug</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Town</th>
              <th className="px-3 py-2">Distances</th>
              <th className="px-3 py-2">Discipline</th>
              <th className="px-3 py-2">Tags</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {cluster.rows.map((row, i) => {
              const isSurvivor = i === 0 && cluster.kind !== "series";
              return (
                <tr
                  key={row.id}
                  className={
                    "border-t border-border " +
                    (isSurvivor ? "bg-green-50/40 dark:bg-green-900/10" : "")
                  }
                >
                  <td className="px-3 py-2">
                    <div className="font-medium text-foreground">
                      {row.name}
                      {isSurvivor && (
                        <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-900 dark:bg-green-900/30 dark:text-green-200">
                          survivor
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {row.slug ?? "—"}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.sort_date ?? row.date_raw ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.town ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.distances ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.discipline ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {[...row.distance_tags, ...row.terrain_tags].join(", ") ||
                      "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {row.source ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        to="/admin/events/$id"
                        params={{ id: row.id }}
                        className="text-primary hover:underline"
                      >
                        Edit
                      </Link>
                      {!isSurvivor && cluster.kind !== "series" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => onMergeOne(survivor, row)}
                        >
                          Merge
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
