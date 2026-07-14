import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  adminCheckSession,
} from "@/lib/admin.functions";
import {
  listAdminEvents,
  listAdminEventSources,
  backfillEventTags,
} from "@/lib/admin-events.functions";
import { REGIONS } from "@/lib/regions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

const STATUSES = ["ACTIVE", "DUPLICATE", "EXPIRED", "ANY"] as const;

const searchSchema = z.object({
  q: z.string().optional(),
  region: z.string().optional(),
  status: z.enum(STATUSES).optional(),
  source: z.string().optional(),
  missing_coords: z.boolean().optional(),
  missing_town: z.boolean().optional(),
  missing_distances: z.boolean().optional(),
  missing_date: z.boolean().optional(),
  missing_terrain_tags: z.boolean().optional(),
  incomplete_any: z.boolean().optional(),
  upcoming_only: z.boolean().optional(),
  region_invalid: z.boolean().optional(),
  page: z.number().int().min(0).optional(),
});

const PAGE_SIZE = 50;

export const Route = createFileRoute("/_adminShell/admin/events/")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Events — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminEventsPage,
});

function AdminEventsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/events" });
  const fetchList = useServerFn(listAdminEvents);
  const fetchSources = useServerFn(listAdminEventSources);
  const runBackfill = useServerFn(backfillEventTags);
  const checkSession = useServerFn(adminCheckSession);
  const queryClient = useQueryClient();
  const [backfilling, setBackfilling] = useState(false);

  const handleBackfill = async (force: boolean) => {
    if (
      !confirm(
        force
          ? "Re-parse ALL non-curated rows? (cursor walk visits every row)"
          : "Backfill tags for non-curated rows?",
      )
    )
      return;
    setBackfilling(true);
    try {
      let totalUpdated = 0;
      let totalScanned = 0;
      let cursor: string | null = null;
      // Cursor-based loop: terminates exactly when the server returns
      // next_cursor: null. No fixed iteration cap, because each call moves
      // strictly forward through `id` and the dataset is bounded (~5k rows).
      for (;;) {
        const res: {
          scanned: number;
          updated: number;
          next_cursor: string | null;
        } = await runBackfill({ data: { force, limit: 1000, cursor } });
        totalUpdated += res.updated;
        totalScanned += res.scanned;
        if (!res.next_cursor) break;
        cursor = res.next_cursor;
      }
      toast.success(
        `Backfill done — scanned ${totalScanned}, updated ${totalUpdated}.`,
      );
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Backfill failed");
    } finally {
      setBackfilling(false);
    }
  };

  const [authChecked, setAuthChecked] = useState(false);
  useEffect(() => {
    checkSession()
      .then((res) => {
        if (!res.authenticated) navigate({ to: "/admin/login" });
        else setAuthChecked(true);
      })
      .catch(() => navigate({ to: "/admin/login" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [qDraft, setQDraft] = useState(search.q ?? "");
  useEffect(() => setQDraft(search.q ?? ""), [search.q]);

  const page = search.page ?? 0;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-events", search, page],
    queryFn: () =>
      fetchList({
        data: {
          q: search.q,
          region: search.region,
          status: search.status,
          source: search.source,
          missing_coords: search.missing_coords,
          missing_town: search.missing_town,
          missing_distances: search.missing_distances,
          missing_date: search.missing_date,
          missing_terrain_tags: search.missing_terrain_tags,
          incomplete_any: search.incomplete_any,
          upcoming_only: search.upcoming_only,
          region_invalid: search.region_invalid,
          sort: "sort_date",
          sort_dir: "asc",
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        },
      }),
    enabled: authChecked,
  });

  const { data: sourceData } = useQuery({
    queryKey: ["admin-event-sources"],
    queryFn: () => fetchSources(),
    enabled: authChecked,
    staleTime: 5 * 60 * 1000,
  });

  const update = (patch: Partial<typeof search>) =>
    navigate({ search: { ...search, ...patch, page: undefined } });

  if (!authChecked) {
    return <p className="text-sm text-muted-foreground">Checking session…</p>;
  }

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Events</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse and edit any event in the database.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="text-sm text-muted-foreground">
            {total.toLocaleString()} match{total === 1 ? "" : "es"}
            {isFetching && " · refreshing…"}
          </div>
          <div className="flex gap-2">
            <Link
              to="/admin/events/new"
              className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              New event
            </Link>
            <Link
              to="/admin/events/duplicates"
              className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm hover:bg-accent"
            >
              Find duplicates
            </Link>
            <Link
              to="/admin/events/enrich-dates"
              className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm hover:bg-accent"
            >
              Enrich dates
            </Link>

            <Button
              size="sm"
              variant="outline"
              disabled={backfilling}
              onClick={() => handleBackfill(false)}
              title="Parse distances/discipline into distance_tags + terrain_tags for any rows missing tags"
            >
              {backfilling ? "Backfilling…" : "Backfill missing tags"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={backfilling}
              onClick={() => handleBackfill(true)}
              title="Re-parse every non-curated row (preserves human edits)"
            >
              Re-parse all
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: qDraft || undefined });
        }}
        className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-4"
      >
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">
            Search (name, slug, town)
          </label>
          <Input
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            placeholder="e.g. big half, vitality, cardiff"
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Region</label>
          <select
            value={search.region ?? ""}
            onChange={(e) => update({ region: e.target.value || undefined })}
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Any region</option>
            {REGIONS.map((r) => (
              <option key={r.slug} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Status</label>
          <select
            value={search.status ?? ""}
            onChange={(e) =>
              update({
                status: (e.target.value || undefined) as
                  | (typeof STATUSES)[number]
                  | undefined,
              })
            }
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">ACTIVE (default)</option>
            <option value="ANY">Any status</option>
            <option value="DUPLICATE">DUPLICATE</option>
            <option value="EXPIRED">EXPIRED</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Source</label>
          <select
            value={search.source ?? ""}
            onChange={(e) => update({ source: e.target.value || undefined })}
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Any source</option>
            {(sourceData?.sources ?? []).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!search.incomplete_any}
              onChange={(e) =>
                update({ incomplete_any: e.target.checked || undefined })
              }
            />
            <span className="font-medium">Any incomplete data</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!search.missing_town}
              onChange={(e) =>
                update({ missing_town: e.target.checked || undefined })
              }
            />
            Missing town
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!search.missing_distances}
              onChange={(e) =>
                update({ missing_distances: e.target.checked || undefined })
              }
            />
            Missing distances
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!search.missing_date}
              onChange={(e) =>
                update({ missing_date: e.target.checked || undefined })
              }
            />
            Missing/TBC date
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!search.missing_coords}
              onChange={(e) =>
                update({ missing_coords: e.target.checked || undefined })
              }
            />
            Missing lat/lng
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!search.missing_terrain_tags}
              onChange={(e) =>
                update({ missing_terrain_tags: e.target.checked || undefined })
              }
            />
            Untagged terrain
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!search.upcoming_only}
              onChange={(e) =>
                update({ upcoming_only: e.target.checked || undefined })
              }
            />
            Upcoming only
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!search.region_invalid}
              onChange={(e) =>
                update({ region_invalid: e.target.checked || undefined })
              }
            />
            Invalid region (audit)
          </label>
          <Button type="submit" size="sm" className="ml-auto">
            Apply search
          </Button>
        </div>
      </form>


      {/* Table */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">No events match these filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Town</th>
                <th className="px-3 py-2">Region</th>
                <th className="px-3 py-2">Distances</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Flags</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium text-foreground">
                    {r.name}
                    <div className="text-xs text-muted-foreground">{r.slug}</div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {r.sort_date ?? r.date_raw ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{r.town ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {r.region ?? <span className="text-destructive">—</span>}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {r.distances ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        r.status === "ACTIVE"
                          ? "rounded bg-green-100 px-2 py-0.5 text-xs text-green-900 dark:bg-green-900/30 dark:text-green-200"
                          : "rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      }
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {r.source ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {r.is_featured && <span title="featured">★</span>}
                    {!r.lat && <span title="no coords"> 📍?</span>}
                    {r.date_is_estimated && <span title="date estimated"> ~</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      to="/admin/events/$id"
                      params={{ id: r.id }}
                      className="text-primary hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <Button
            size="sm"
            variant="outline"
            disabled={page === 0}
            onClick={() => navigate({ search: { ...search, page: page - 1 } })}
          >
            ← Prev
          </Button>
          <span className="text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page + 1 >= totalPages}
            onClick={() => navigate({ search: { ...search, page: page + 1 } })}
          >
            Next →
          </Button>
        </div>
      )}
      <Toaster position="top-center" />
    </div>
  );
}
