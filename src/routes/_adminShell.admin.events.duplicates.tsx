import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminCheckSession } from "@/lib/admin.functions";
import {
  findPotentialDuplicates,
  mergeDuplicateEvents,
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

function AdminDuplicatesPage() {
  const navigate = useNavigate();
  const checkSession = useServerFn(adminCheckSession);
  const fetchDuplicates = useServerFn(findPotentialDuplicates);
  const mergeFn = useServerFn(mergeDuplicateEvents);
  const queryClient = useQueryClient();

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

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-duplicates"],
    queryFn: () => fetchDuplicates(),
    enabled: authChecked,
  });

  const handleMerge = async (survivor: DuplicateRow, dupe: DuplicateRow) => {
    if (
      !confirm(
        `Mark "${dupe.name}" (${dupe.slug ?? "no slug"}) as a duplicate of "${survivor.name}" (${survivor.slug ?? "no slug"})?\n\nThis will:\n• Set the duplicate's status to DUPLICATE\n• 301-redirect its event page to the survivor\n• Remove it from all filter/region/distance pages`,
      )
    )
      return;
    try {
      const res = await mergeFn({
        data: { survivorId: survivor.id, duplicateId: dupe.id },
      });
      toast.success(
        res.copied_tags
          ? "Merged. Tags copied from duplicate to survivor."
          : "Merged.",
      );
      queryClient.invalidateQueries({ queryKey: ["admin-duplicates"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Merge failed");
    }
  };

  if (!authChecked) {
    return <p className="text-sm text-muted-foreground">Checking session…</p>;
  }

  const clusters = data?.clusters ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Potential duplicates
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ACTIVE events grouped by normalised name + region. Pick the
            survivor (top row by default — has a date and the most tags) and
            mark the others as duplicates. Existing redirect logic handles the
            old URLs automatically.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-sm text-muted-foreground">
          <Link to="/admin/events" className="text-primary hover:underline">
            ← Back to all events
          </Link>
          <div>
            {clusters.length} cluster{clusters.length === 1 ? "" : "s"}
            {isFetching && " · refreshing…"}
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Scanning…</p>
      ) : clusters.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No obvious duplicates found.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {clusters.map((cluster) => {
            const survivor = cluster.rows[0];
            return (
              <div
                key={cluster.key}
                className="rounded-lg border border-border bg-card"
              >
                <div className="border-b border-border px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground">
                  {cluster.rows.length} rows · suggested survivor:{" "}
                  <span className="font-mono text-foreground">
                    {survivor.slug ?? survivor.id.slice(0, 8)}
                  </span>
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
                        const isSurvivor = i === 0;
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
                              {[...row.distance_tags, ...row.terrain_tags].join(
                                ", ",
                              ) || "—"}
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
                                {!isSurvivor && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleMerge(survivor, row)}
                                  >
                                    Merge into survivor
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
          })}
        </div>
      )}

      <Toaster position="top-center" />
    </div>
  );
}
