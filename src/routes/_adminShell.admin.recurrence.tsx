import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  getRediscoveryWorklist,
  getReplacementRate,
  getSeriesProposals,
  getSyncSourceSummary,
} from "@/lib/admin-recurrence.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_adminShell/admin/recurrence")({
  component: AdminRecurrencePage,
});

type Tab = "replacement" | "rediscovery" | "series";

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString();
}

function signed(n: number): string {
  return n > 0 ? `+${n.toLocaleString()}` : n.toLocaleString();
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  const d = new Date(Date.UTC(Number(y), Number(m) - 1, 1));
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
}

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function AdminRecurrencePage() {
  const [tab, setTab] = useState<Tab>("replacement");

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Recurrence &amp; replacement</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Read-only evidence. Nothing on this page writes to the database — series keys are
          proposals for review.
        </p>
      </div>

      <SourceStrip />

      <div className="mt-6 flex flex-wrap gap-2">
        <TabButton active={tab === "replacement"} onClick={() => setTab("replacement")}>
          Replacement rate
        </TabButton>
        <TabButton active={tab === "rediscovery"} onClick={() => setTab("rediscovery")}>
          Rediscovery worklist
        </TabButton>
        <TabButton active={tab === "series"} onClick={() => setTab("series")}>
          Series proposals
        </TabButton>
      </div>

      <div className="mt-6">
        {tab === "replacement" && <ReplacementPanel />}
        {tab === "rediscovery" && <RediscoveryPanel />}
        {tab === "series" && <SeriesPanel />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button size="sm" variant={active ? "default" : "outline"} onClick={onClick}>
      {children}
    </Button>
  );
}

function Panel({
  isLoading,
  error,
  children,
}: {
  isLoading: boolean;
  error: unknown;
  children: React.ReactNode;
}) {
  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error)
    return (
      <p className="text-destructive">
        {error instanceof Error ? error.message : "Failed to load"}
      </p>
    );
  return <>{children}</>;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold text-foreground">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function SourceStrip() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "recurrence", "sources"],
    queryFn: () => getSyncSourceSummary(),
    staleTime: 60_000,
  });

  if (isLoading || error || !data || data.length === 0) return null;

  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Source</th>
            <th className="px-3 py-2 font-medium">Last run</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium text-right">New</th>
            <th className="px-3 py-2 font-medium text-right">Updated</th>
            <th className="px-3 py-2 font-medium">Error</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((s) => (
            <tr key={s.source}>
              <td className="px-3 py-2 font-mono text-foreground">{s.source}</td>
              <td className="px-3 py-2 text-muted-foreground">
                {dateLabel(s.started_at)}{" "}
                <span className="text-xs">
                  ({s.days_since === 0 ? "today" : `${s.days_since}d ago`})
                </span>
              </td>
              <td className="px-3 py-2">{s.status}</td>
              <td className="px-3 py-2 text-right font-semibold text-foreground">
                {fmt(s.new_events)}
              </td>
              <td className="px-3 py-2 text-right text-muted-foreground">
                {fmt(s.updated_existing)}
              </td>
              <td className="max-w-[240px] truncate px-3 py-2 text-xs text-destructive">
                {s.error_message ?? ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReplacementPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "recurrence", "replacement"],
    queryFn: () => getReplacementRate({ data: { months: 12 } }),
    staleTime: 60_000,
  });

  return (
    <Panel isLoading={isLoading} error={error}>
      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat
              label="Future events now"
              value={fmt(data.current.future_events)}
              hint={`${fmt(data.current.future_discoverable)} reach discovery`}
            />
            <Stat
              label="Gained (12 months)"
              value={fmt(data.totals.gained)}
              hint={`${fmt(data.totals.gained_discoverable)} with organiser link`}
            />
            <Stat
              label="Aged out (12 months)"
              value={fmt(data.totals.aged_out)}
              hint={`${fmt(data.totals.aged_out_discoverable)} with organiser link`}
            />
          </div>

          <div className="mt-6 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Month</th>
                  <th className="px-3 py-2 font-medium text-right">Gained</th>
                  <th className="px-3 py-2 font-medium text-right">Aged out</th>
                  <th className="px-3 py-2 font-medium text-right">Net</th>
                  <th className="px-3 py-2 font-medium text-right">Net (discoverable)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.months.map((m) => (
                  <tr key={m.month}>
                    <td className="px-3 py-2 text-foreground">{monthLabel(m.month)}</td>
                    <td className="px-3 py-2 text-right text-foreground">{fmt(m.gained)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {fmt(m.aged_out)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-semibold ${
                        m.net < 0 ? "text-destructive" : "text-foreground"
                      }`}
                    >
                      {signed(m.net)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right ${
                        m.net_discoverable < 0 ? "text-destructive" : "text-muted-foreground"
                      }`}
                    >
                      {signed(m.net_discoverable)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Gained counts events added while still future-dated. Aged out counts occurrences whose
            date passed in that month. A run of negative months means ingest is not keeping up with
            ageing — it is not evidence about rankings, entries or revenue.
          </p>
        </>
      )}
    </Panel>
  );
}

function RediscoveryPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "recurrence", "rediscovery"],
    queryFn: () => getRediscoveryWorklist({ data: { lookbackDays: 400, limit: 200 } }),
    staleTime: 60_000,
  });

  return (
    <Panel isLoading={isLoading} error={error}>
      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat
              label="Series with no future date"
              value={fmt(data.total_missing_future)}
              hint={`last ${data.lookback_days} days`}
            />
            <Stat
              label="Due now"
              value={fmt(data.due_now)}
              hint="last seen 330+ days ago"
            />
            <Stat
              label="Had organiser link"
              value={fmt(data.with_organiser_link)}
              hint="easiest to re-check"
            />
          </div>

          <div className="mt-6 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Race</th>
                  <th className="px-3 py-2 font-medium">Where</th>
                  <th className="px-3 py-2 font-medium">Last held</th>
                  <th className="px-3 py-2 font-medium text-right">Days</th>
                  <th className="px-3 py-2 font-medium text-right">Editions</th>
                  <th className="px-3 py-2 font-medium">Organiser link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.rows.map((r) => (
                  <tr key={r.proposed_key}>
                    <td className="px-3 py-2 text-foreground">
                      {r.last_slug ? (
                        <a
                          href={`/events/${r.last_slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline"
                        >
                          {r.last_name}
                        </a>
                      ) : (
                        r.last_name
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {[r.last_town, r.last_region].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{dateLabel(r.last_seen)}</td>
                    <td
                      className={`px-3 py-2 text-right ${
                        r.days_since >= 330 ? "font-semibold text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {fmt(r.days_since)}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {fmt(r.editions_recorded)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {r.had_organiser_link ? "yes" : "no"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            These races were held recently and have no future date recorded. Most are annual and
            due to return — check them on the next manual sync run.
          </p>
        </>
      )}
    </Panel>
  );
}

function SeriesPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "recurrence", "series"],
    queryFn: () => getSeriesProposals({ data: { minOccurrences: 2, limit: 60 } }),
    staleTime: 60_000,
  });

  return (
    <Panel isLoading={isLoading} error={error}>
      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Events scanned" value={fmt(data.scanned_events)} />
            <Stat
              label="Proposed series"
              value={fmt(data.total_groups)}
              hint="two or more editions"
            />
            <Stat
              label="Rows a write would change"
              value={fmt(data.rows_needing_write)}
              hint="not applied"
            />
          </div>

          <div className="mt-6 space-y-3">
            {data.proposals.map((p) => (
              <details key={p.proposed_key} className="rounded-lg border border-border bg-card">
                <summary className="cursor-pointer px-4 py-3 text-sm">
                  <span className="font-semibold text-foreground">{p.label}</span>
                  <span className="ml-2 text-muted-foreground">
                    {p.occurrences.length} editions · {p.future_count} upcoming · {p.past_count}{" "}
                    past · {p.needs_write} row(s) would change
                  </span>
                </summary>
                <div className="overflow-x-auto border-t border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Event</th>
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium">Town</th>
                        <th className="px-3 py-2 font-medium">Stored key</th>
                        <th className="px-3 py-2 font-medium">Discovery</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {p.occurrences.map((o) => (
                        <tr key={o.id}>
                          <td className="px-3 py-2 text-foreground">
                            {o.slug ? (
                              <a
                                href={`/admin/events/${o.id}`}
                                className="text-primary underline"
                              >
                                {o.name}
                              </a>
                            ) : (
                              o.name
                            )}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {o.sort_date ? dateLabel(o.sort_date) : "—"}
                            {o.is_future && (
                              <span className="ml-1 text-xs text-foreground">(upcoming)</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{o.town ?? "—"}</td>
                          <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                            {o.stored_series_key ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {o.discoverable ? "eligible" : "blocked"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Proposals only. Keys are derived from name, town and distance. Applying them requires a
            separately approved audited update.
          </p>
        </>
      )}
    </Panel>
  );
}
