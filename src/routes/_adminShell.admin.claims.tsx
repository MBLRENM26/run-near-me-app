import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  adminCheckSession,
  listSubmissions,
  updateSubmission,
  bulkUpdateSubmissions,
  type SubmissionRow,
} from "@/lib/admin.functions";
import { SubmissionRowCard } from "@/components/admin/SubmissionRow";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

const STATUSES = ["new", "in_review", "actioned", "rejected", "spam"] as const;
const KINDS = ["all", "claim", "listing"] as const;
type Status = (typeof STATUSES)[number];
type KindFilter = (typeof KINDS)[number];

const searchSchema = z.object({
  kind: z.enum(KINDS).optional(),
  status: z.enum(STATUSES).optional(),
});

export const Route = createFileRoute("/_adminShell/admin/claims")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Submissions — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminClaimsPage,
});

function AdminClaimsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/claims" });
  const queryClient = useQueryClient();

  const fetchList = useServerFn(listSubmissions);
  const updateOne = useServerFn(updateSubmission);
  const bulkUpdate = useServerFn(bulkUpdateSubmissions);
  const checkSession = useServerFn(adminCheckSession);

  // Gate the page on a valid session
  const [authChecked, setAuthChecked] = useState(false);
  useEffect(() => {
    checkSession()
      .then((res) => {
        if (!res.authenticated) {
          navigate({ to: "/admin/login" });
        } else {
          setAuthChecked(true);
        }
      })
      .catch(() => navigate({ to: "/admin/login" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kindFilter: KindFilter = search.kind ?? "all";
  const statusFilter: Status = search.status ?? "new";

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-submissions", kindFilter, statusFilter],
    queryFn: () =>
      fetchList({
        data: {
          kind: kindFilter === "all" ? undefined : kindFilter,
          status: statusFilter,
          limit: 100,
          offset: 0,
        },
      }),
    enabled: authChecked,
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const counts = data?.counts;

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-submissions"] });

  const handleSelect = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(rows.map((r) => r.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const handleSave = async (
    id: string,
    patch: { status?: SubmissionRow["status"]; admin_note?: string | null },
  ) => {
    try {
      await updateOne({ data: { id, ...patch } });
      toast.success("Saved");
      refresh();
    } catch (e) {
      toast.error("Save failed");
      console.error(e);
    }
  };

  const handleBulk = async (status: Status) => {
    if (selectedIds.size === 0) return;
    try {
      await bulkUpdate({ data: { ids: Array.from(selectedIds), status } });
      toast.success(`Marked ${selectedIds.size} as ${status.replace("_", " ")}`);
      clearSelection();
      refresh();
    } catch (e) {
      toast.error("Bulk update failed");
      console.error(e);
    }
  };

  const setKind = (k: KindFilter) =>
    navigate({ search: { ...search, kind: k === "all" ? undefined : k } });
  const setStatus = (s: Status) =>
    navigate({ search: { ...search, status: s === "new" ? undefined : s } });

  if (!authChecked) {
    return <p className="text-sm text-muted-foreground">Checking session…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Submissions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review new listings and claim requests.
        </p>
      </div>

      {/* Kind tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {KINDS.map((k) => {
          const active = kindFilter === k;
          const count =
            k === "all"
              ? counts?.total ?? 0
              : k === "claim"
                ? counts?.by_kind.claim ?? 0
                : counts?.by_kind.listing ?? 0;
          return (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {k === "all" ? "All" : k === "claim" ? "Claims" : "Listings"}
              <span className="ml-1.5 opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => {
          const active = statusFilter === s;
          const count = counts?.by_status[s] ?? 0;
          return (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.replace("_", " ")} ({count})
            </button>
          );
        })}
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
          <span className="text-foreground">{selectedIds.size} selected</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => handleBulk("actioned")}>
              Mark actioned
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBulk("rejected")}>
              Reject
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBulk("spam")}>
              Spam
            </Button>
            <Button size="sm" variant="ghost" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Select all */}
      {rows.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <button onClick={selectAll} className="hover:text-foreground">
            Select all on this page
          </button>
          {isFetching && <span>Refreshing…</span>}
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Nothing in this view. Try a different filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <SubmissionRowCard
              key={row.id}
              row={row}
              selected={selectedIds.has(row.id)}
              onSelectChange={handleSelect}
              onSave={handleSave}
            />
          ))}
        </div>
      )}

      <Toaster position="top-center" />
    </div>
  );
}
