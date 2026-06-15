import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getSearchAnalytics } from "@/lib/admin-search.functions";

export const Route = createFileRoute("/_adminShell/admin/search")({
  component: AdminSearchPage,
});

function AdminSearchPage() {
  const [days, setDays] = useState<7 | 30 | 90>(30);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "search-analytics", days],
    queryFn: () => getSearchAnalytics({ data: { days } }),
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Search analytics</h1>
        <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1 text-sm">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d as 7 | 30 | 90)}
              className={`px-3 py-1 rounded ${
                days === d
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <p className="mt-8 text-muted-foreground">Loading…</p>
      )}
      {error && (
        <p className="mt-8 text-destructive">
          {error instanceof Error ? error.message : "Failed to load"}
        </p>
      )}

      {data && (
        <>
          <div className="mt-6 grid gap-3 grid-cols-2 sm:grid-cols-3">
            <Stat label="Total searches" value={data.totalSearches} />
            <Stat label="Unique queries" value={data.uniqueQueries} />
            <Stat label="Zero-result searches" value={data.zeroResultCount} />
          </div>

          <section className="mt-10">
            <h2 className="text-lg font-semibold text-foreground">
              Top queries
            </h2>
            {data.topQueries.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No searches in the last {data.days} days.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Query</th>
                      <th className="px-3 py-2 font-medium text-right">
                        Searches
                      </th>
                      <th className="px-3 py-2 font-medium text-right">
                        Clicks
                      </th>
                      <th className="px-3 py-2 font-medium text-right">CTR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.topQueries.map((r) => (
                      <tr key={r.query}>
                        <td className="px-3 py-2 font-mono text-foreground">
                          {r.query}
                        </td>
                        <td className="px-3 py-2 text-right">{r.count}</td>
                        <td className="px-3 py-2 text-right">{r.clicks}</td>
                        <td className="px-3 py-2 text-right">
                          {(r.ctr * 100).toFixed(0)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-semibold text-foreground">
              Zero-result queries
            </h2>
            {data.zeroResultQueries.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                None — every search returned something.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Query</th>
                      <th className="px-3 py-2 font-medium text-right">
                        Times
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.zeroResultQueries.map((r) => (
                      <tr key={r.query}>
                        <td className="px-3 py-2 font-mono text-foreground">
                          {r.query}
                        </td>
                        <td className="px-3 py-2 text-right">{r.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-foreground">
        {value.toLocaleString()}
      </div>
    </div>
  );
}
