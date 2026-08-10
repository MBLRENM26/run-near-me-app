import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Checkbox } from "@/components/ui/checkbox";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminCheckSession } from "@/lib/admin.functions";
import {
  findPotentialDuplicates,
  mergeDuplicateEvents,
  mergeDuplicateCluster,
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
    meta: [{ title: "Duplicates — Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminDuplicatesPage,
});

const TIER_LABEL: Record<DuplicateConfidence, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence — review manually",
};

const TIER_DESC: Record<DuplicateConfidence, string> = {
  high: "Strong matching signals. Candidate only: review IDs and survivor rationale before correction.",
  medium: "Likely related but some signals are missing. Review every row.",
  low: "Conflicting dates or towns. These are probably distinct events — hand-review only.",
};

function AdminDuplicatesPage() {
  const navigate = useNavigate();
  const checkSession = useServerFn(adminCheckSession);
  const fetchDuplicates = useServerFn(findPotentialDuplicates);
  const mergeFn = useServerFn(mergeDuplicateEvents);
  const mergeClusterFn = useServerFn(mergeDuplicateCluster);
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

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-duplicates"] });

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

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const clusters = useMemo(() => data?.clusters ?? [], [data?.clusters]);
  const seriesClusters = clusters.filter((c) => c.kind === "series");
  const dupeClusters = clusters.filter((c) => c.kind === "duplicate");
  const reviewClusters = clusters.filter((c) => c.kind === "review");
  const byTier: Record<DuplicateConfidence, DuplicateCluster[]> = {
    high: dupeClusters.filter((c) => c.confidence === "high"),
    medium: dupeClusters.filter((c) => c.confidence === "medium"),
    low: dupeClusters.filter((c) => c.confidence === "low"),
  };

  // Prune selected keys that no longer exist after a refetch.
  const allKeys = useMemo(() => new Set(clusters.map((c) => c.key)), [clusters]);
  useEffect(() => {
    setSelected((prev) => {
      let changed = false;
      const next = new Set<string>();
      prev.forEach((k) => {
        if (allKeys.has(k)) next.add(k);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [allKeys]);

  const toggleCluster = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const setTierSelection = (tierClusters: DuplicateCluster[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      tierClusters.forEach((c) => {
        if (on) next.add(c.key);
        else next.delete(c.key);
      });
      return next;
    });

  const selectedClusters = seriesClusters.filter((c) => selected.has(c.key));
  const selectedRowCount = selectedClusters.reduce((n, c) => n + c.rows.length, 0);

  const handleMarkSelectedAsSeries = async () => {
    if (!selectedClusters.length) return;
    if (
      !confirm(
        `Mark ${selectedClusters.length} cluster${selectedClusters.length === 1 ? "" : "s"} (${selectedRowCount} rows) as recurring series? Each cluster gets its own series_key.`,
      )
    )
      return;
    setBusy(true);
    let marked = 0;
    let failed = 0;
    let firstError: string | null = null;
    for (const cluster of selectedClusters) {
      try {
        const res = await markSeriesFn({
          data: { ids: cluster.rows.map((r) => r.id) },
        });
        marked += res.marked;
      } catch (e) {
        failed += 1;
        if (!firstError) firstError = e instanceof Error ? e.message : String(e);
      }
    }
    setBusy(false);
    setSelected(new Set());
    if (failed) {
      toast.warning(
        `Marked ${marked} rows; ${failed} cluster${failed === 1 ? "" : "s"} failed. ${firstError ?? ""}`,
      );
    } else {
      toast.success(
        `Marked ${marked} row${marked === 1 ? "" : "s"} across ${selectedClusters.length} cluster${selectedClusters.length === 1 ? "" : "s"} as series.`,
      );
    }
    invalidate();
  };

  if (!authChecked) {
    return <p className="text-sm text-muted-foreground">Checking session…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Potential duplicates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Grouped by tier. Recurring series are surfaced separately — don't merge those, mark them
            as a series so they're shown as scheduled fixtures instead.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-sm text-muted-foreground">
          <Link to="/admin/events" className="text-primary hover:underline">
            ← Back to all events
          </Link>
          <div>
            {clusters.length} cluster{clusters.length === 1 ? "" : "s"} · {seriesClusters.length}{" "}
            series · {byTier.high.length} merge candidates · {reviewClusters.length} manual review
            {isFetching && " · refreshing…"}
          </div>
        </div>
      </div>

      {data?.inventory && (
        <section className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div>
            <h2 className="font-semibold text-foreground">Existing-schema inventory</h2>
            <p className="text-xs text-muted-foreground">
              Read-only snapshot for {data.inventory.generatedForDate}. Candidate reporting makes no
              event changes.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <InventoryStat label="All rows" value={data.inventory.total} />
            <InventoryStat label="Active" value={data.inventory.active} />
            <InventoryStat label="Future active" value={data.inventory.futureActive} />
            <InventoryStat label="Undated" value={data.inventory.undated} />
            <InventoryStat label="Estimated" value={data.inventory.estimated} />
            <InventoryStat label="Duplicate-linked" value={data.inventory.duplicateLinked} />
            <InventoryStat label="Recurring flags" value={data.inventory.recurring} />
            <InventoryStat label="Series-linked" value={data.inventory.seriesLinked} />
            <InventoryStat label="No destination" value={data.inventory.destinations.none} />
          </div>
          <p className="text-xs text-muted-foreground">
            Sources:{" "}
            {data.inventory.bySource.map((item) => `${item.value} ${item.count}`).join(" · ")}
          </p>
        </section>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Scanning…</p>
      ) : clusters.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">No obvious duplicates found.</p>
        </div>
      ) : (
        <>
          {seriesClusters.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-end justify-between gap-3 border-b border-border pb-1">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Recurring series ({seriesClusters.length})
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Looks like a recurring series (e.g. RunThrough fortnightly, Grand Prix). Don't
                    merge — mark as a series so they're flagged as recurring on listings.
                  </p>
                </div>
                <TierSelectAll
                  list={seriesClusters}
                  selected={selected}
                  onChange={(on) => setTierSelection(seriesClusters, on)}
                />
              </div>
              {seriesClusters.map((cluster) => (
                <ClusterCard
                  key={cluster.key}
                  cluster={cluster}
                  busy={busy}
                  selected={selected.has(cluster.key)}
                  onToggleSelect={() => toggleCluster(cluster.key)}
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
                <div className="flex items-end justify-between gap-3 border-b border-border pb-1">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {TIER_LABEL[tier]} ({list.length})
                    </h2>
                    <p className="text-xs text-muted-foreground">{TIER_DESC[tier]}</p>
                  </div>
                </div>
                {list.map((cluster) => (
                  <ClusterCard
                    key={cluster.key}
                    cluster={cluster}
                    busy={busy}
                    selected={false}
                    onToggleSelect={() => undefined}
                    onMergeAll={tier !== "low" ? () => handleClusterMerge(cluster) : null}
                    onMergeOne={handleMerge}
                    onMarkSeries={null}
                  />
                ))}
              </section>
            );
          })}
          {reviewClusters.length > 0 && (
            <section className="space-y-3">
              <div className="border-b border-border pb-1">
                <h2 className="text-lg font-semibold text-foreground">
                  Manual evidence review ({reviewClusters.length})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Conflicting years, components, sources, places or mixed duplicate/series signals.
                  No survivor is chosen automatically and no automatic or bulk merge runs here — a
                  controlled manual override is available after you have reviewed the evidence.
                </p>
              </div>
              {reviewClusters.map((cluster) => (
                <ManualMergeCluster
                  key={cluster.key}
                  cluster={cluster}
                  busy={busy}
                  onMergeOne={handleMerge}
                  onSubmit={handleManualMerge}
                />
              ))}
            </section>
          )}
        </>
      )}

      {selectedClusters.length > 0 && (
        <div className="sticky bottom-4 z-20 mx-auto flex w-fit items-center gap-3 rounded-full border border-primary/40 bg-background/95 px-4 py-2 shadow-lg backdrop-blur">
          <span className="text-sm font-medium text-foreground">
            {selectedClusters.length} cluster
            {selectedClusters.length === 1 ? "" : "s"} selected ({selectedRowCount} rows)
          </span>
          <Button size="sm" disabled={busy} onClick={handleMarkSelectedAsSeries}>
            Mark selected as series
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      <Toaster position="top-center" />
    </div>
  );
}

function InventoryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-border bg-muted/20 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold text-foreground">{value}</div>
    </div>
  );
}

function TierSelectAll({
  list,
  selected,
  onChange,
}: {
  list: DuplicateCluster[];
  selected: Set<string>;
  onChange: (on: boolean) => void;
}) {
  const allSelected = list.length > 0 && list.every((c) => selected.has(c.key));
  return (
    <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-muted-foreground">
      <Checkbox checked={allSelected} onCheckedChange={(v) => onChange(v === true)} />
      Select all
    </label>
  );
}

function ClusterCard({
  cluster,
  busy,
  selected,
  onToggleSelect,
  onMergeAll,
  onMergeOne,
  onMarkSeries,
}: {
  cluster: DuplicateCluster;
  busy: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onMergeAll: (() => void) | null;
  onMergeOne: (survivor: DuplicateRow, dupe: DuplicateRow) => void;
  onMarkSeries?: (() => void) | null;
}) {
  const survivor = cluster.survivorId
    ? (cluster.rows.find((row) => row.id === cluster.survivorId) ?? null)
    : null;
  const tierColor: Record<DuplicateConfidence, string> = {
    high: "bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-200",
    medium: "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-200",
    low: "bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200",
  };
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2 text-xs">
        <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
          {cluster.kind === "series" && (
            <Checkbox
              checked={selected}
              onCheckedChange={() => onToggleSelect()}
              aria-label="Select cluster"
            />
          )}

          {cluster.kind === "series" ? (
            <span className="rounded bg-blue-100 px-1.5 py-0.5 font-medium uppercase text-blue-900 dark:bg-blue-900/30 dark:text-blue-200">
              series
            </span>
          ) : cluster.kind === "review" ? (
            <span className="rounded bg-orange-100 px-1.5 py-0.5 font-medium uppercase text-orange-900 dark:bg-orange-900/30 dark:text-orange-200">
              manual review
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
          {survivor && (
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
          <span>·</span>
          <span>{cluster.survivorReason}</span>
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
            <Button size="sm" variant="outline" disabled={busy} onClick={onMergeAll}>
              Merge all in cluster
            </Button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Name / slug / ID</th>
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
            {cluster.rows.map((row) => {
              const isSurvivor = row.id === cluster.survivorId;
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
                    <div className="text-xs text-muted-foreground">{row.slug ?? "—"}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{row.id}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      source ID: {row.norm_id ?? "—"}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.sort_date ?? row.date_raw ?? "—"}
                    {row.date_is_estimated && (
                      <div className="text-xs text-orange-700 dark:text-orange-300">estimated</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{row.town ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.distances ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.discipline ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {[...row.distance_tags, ...row.terrain_tags].join(", ") || "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    <div>{row.source ?? "—"}</div>
                    {row.source_url && (
                      <a
                        href={row.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all text-primary hover:underline"
                      >
                        source
                      </a>
                    )}
                    {row.entry_url && (
                      <a
                        href={row.entry_url}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-2 break-all text-primary hover:underline"
                      >
                        entry
                      </a>
                    )}
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
                      {survivor && !isSurvivor && cluster.kind === "duplicate" && (
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
