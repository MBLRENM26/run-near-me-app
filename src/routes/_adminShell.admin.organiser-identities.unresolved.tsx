import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminCheckSession } from "@/lib/admin.functions";
import { listSeedUnresolved } from "@/lib/organiser-identity.functions";

export const Route = createFileRoute(
  "/_adminShell/admin/organiser-identities/unresolved",
)({
  head: () => ({
    meta: [
      { title: "Unresolved seed rows — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: UnresolvedPage,
});

function UnresolvedPage() {
  const navigate = useNavigate();
  const check = useServerFn(adminCheckSession);
  const fetchList = useServerFn(listSeedUnresolved);

  const [authChecked, setAuthChecked] = useState(false);
  useEffect(() => {
    check()
      .then((r) => (r.authenticated ? setAuthChecked(true) : navigate({ to: "/admin/login" })))
      .catch(() => navigate({ to: "/admin/login" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["organiser-seed-unresolved"],
    queryFn: () => fetchList({ data: {} }),
    enabled: authChecked,
  });

  if (!authChecked) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Unresolved seed rows</h1>
        <Link
          to="/admin/organiser-identities"
          className="text-sm text-primary hover:underline"
        >
          ← Back to identities
        </Link>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data?.rows.length ? (
        <p className="text-sm text-muted-foreground">
          No unresolved seed rows. Phase 2 apply is only permitted when this list is empty
          for the CSV's exact SHA-256.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Seed run</th>
                <th className="px-3 py-2 font-medium">CSV SHA-256</th>
                <th className="px-3 py-2 font-medium">Row #</th>
                <th className="px-3 py-2 font-medium">Reason</th>
                <th className="px-3 py-2 font-medium">Raw row</th>
                <th className="px-3 py-2 font-medium">Candidates</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.id} className="border-b border-border/60 align-top">
                  <td className="px-3 py-2 font-mono text-xs">{r.seed_run_id.slice(0, 8)}…</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.csv_sha256.slice(0, 12)}…</td>
                  <td className="px-3 py-2">{r.csv_row_number}</td>
                  <td className="px-3 py-2">{r.reason}</td>
                  <td className="px-3 py-2">
                    <pre className="max-w-xs whitespace-pre-wrap break-all text-xs">
                      {JSON.stringify(r.raw_row, null, 2)}
                    </pre>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {r.candidate_event_ids.length
                      ? r.candidate_event_ids.join(", ")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
