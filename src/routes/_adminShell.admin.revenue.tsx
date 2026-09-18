import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getRevenueEvidence } from "@/lib/revenue-evidence.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_adminShell/admin/revenue")({
  component: AdminRevenuePage,
});

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString();
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

function SectionHeading({ title, caveat }: { title: string; caveat: string }) {
  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{caveat}</p>
    </div>
  );
}

const WINDOWS = [30, 90, 180] as const;

function AdminRevenuePage() {
  const [windowDays, setWindowDays] = useState<number>(90);

  const { data, isLoading, error } = useQuery({
    queryKey: ["revenue-evidence", windowDays],
    queryFn: () => getRevenueEvidence({ data: { windowDays } }),
    staleTime: 60_000,
  });

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Revenue evidence</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Read-only. Nothing here sets pricing, changes public pages or writes to the database. A
          click or a reminder request is a demand signal — not an entry, not revenue.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {WINDOWS.map((w) => (
          <Button
            key={w}
            size="sm"
            variant={windowDays === w ? "default" : "outline"}
            onClick={() => setWindowDays(w)}
          >
            Last {w} days
          </Button>
        ))}
      </div>

      {isLoading && <p className="mt-6 text-muted-foreground">Loading…</p>}
      {error && (
        <p className="mt-6 text-destructive">
          {error instanceof Error ? error.message : "Failed to load"}
        </p>
      )}

      {data && (
        <>
          <SectionHeading
            title="Decision gates"
            caveat="Each gate is a threshold we agreed in advance, so the next spend is triggered by evidence rather than optimism. Thresholds are adjustable in one place in the code."
          />
          <div className="mt-3 space-y-2">
            {data.gates.map((g) => (
              <div
                key={g.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="font-medium text-foreground">{g.label}</div>
                  <div className="text-sm text-muted-foreground">{g.metric}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{g.note}</div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                    g.met ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {g.met ? "Gate met" : `Not yet · target ${fmt(g.threshold)}`}
                </span>
              </div>
            ))}
          </div>

          <SectionHeading
            title="Runner demand depth"
            caveat="On-site behaviour only, from our own search log and reminder requests. It tells us whether runners do more than glance — it does not tell us anybody would pay."
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Stat
              label="Searches"
              value={fmt(data.runner.searches)}
              hint={`last ${data.window_days} days`}
            />
            <Stat
              label="Searches with no results"
              value={fmt(data.runner.searches_with_no_results)}
              hint="coverage gaps"
            />
            <Stat
              label="Result clicks"
              value={fmt(data.runner.search_clicks)}
              hint={`${data.runner.click_through_pct}% of searches`}
            />
            <Stat
              label="Reminder requests"
              value={fmt(data.runner.reminder_requests)}
              hint="in window"
            />
            <Stat
              label="Distinct runners"
              value={fmt(data.runner.distinct_runner_emails)}
              hint="unique emails"
            />
            <Stat
              label="Repeat runners"
              value={fmt(data.runner.repeat_runner_emails)}
              hint="asked about 2+ races"
            />
            <Stat
              label="Reminder requests, all time"
              value={fmt(data.runner.reminder_requests_all_time)}
            />
          </div>

          <SectionHeading
            title="Organiser reach"
            caveat="Ranked pitch list for a paid or featured listing. Demand signals = on-site result clicks plus reminder requests for that organiser's future races. Outbound hand-offs are only recorded in the analytics product, so they are not included here."
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Stat
              label="Organisers with future races"
              value={fmt(data.organisers.total_with_label)}
            />
            <Stat
              label={`Organisers with ${data.organisers.min_signals}+ signals`}
              value={fmt(data.organisers.with_reach)}
            />
            <Stat label="Future events" value={fmt(data.inventory.future_events)} />
          </div>
          <div className="mt-3 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Organiser</th>
                  <th className="px-3 py-2 text-right">Future races</th>
                  <th className="px-3 py-2 text-right">Reach discovery</th>
                  <th className="px-3 py-2 text-right">Result clicks</th>
                  <th className="px-3 py-2 text-right">Reminders</th>
                  <th className="px-3 py-2 text-right">Demand signals</th>
                </tr>
              </thead>
              <tbody>
                {data.organisers.rows.map((r) => (
                  <tr key={r.organiser} className="border-t border-border">
                    <td className="px-3 py-2 text-foreground">{r.organiser}</td>
                    <td className="px-3 py-2 text-right">{fmt(r.future_events)}</td>
                    <td className="px-3 py-2 text-right">{fmt(r.discoverable_events)}</td>
                    <td className="px-3 py-2 text-right">{fmt(r.search_clicks)}</td>
                    <td className="px-3 py-2 text-right">{fmt(r.reminder_requests)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{fmt(r.demand_signals)}</td>
                  </tr>
                ))}
                {data.organisers.rows.length === 0 && (
                  <tr>
                    <td className="px-3 py-3 text-muted-foreground" colSpan={6}>
                      No organisers resolved for future races.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <SectionHeading
            title="Entry-platform exposure"
            caveat="How many future races hand off to each registration platform. This is link inventory, not click share — it ranks who is worth approaching about a referral arrangement first."
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Stat
              label="Future races on a platform"
              value={fmt(data.platforms.total_events_on_platforms)}
            />
            <Stat label="Largest platform share" value={`${data.platforms.top_share_pct}%`} />
          </div>
          <div className="mt-3 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Platform</th>
                  <th className="px-3 py-2 text-right">Future races</th>
                  <th className="px-3 py-2 text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {data.platforms.rows.map((p) => (
                  <tr key={p.host} className="border-t border-border">
                    <td className="px-3 py-2 text-foreground">{p.host}</td>
                    <td className="px-3 py-2 text-right">{fmt(p.events)}</td>
                    <td className="px-3 py-2 text-right">{p.sharePct}%</td>
                  </tr>
                ))}
                {data.platforms.rows.length === 0 && (
                  <tr>
                    <td className="px-3 py-3 text-muted-foreground" colSpan={3}>
                      No future races currently link to a registration platform.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <SectionHeading
            title="Page value pool"
            caveat="The pages that could carry a sponsorship or contextual ad slot: future-dated races that actually reach discovery. Monthly pageviews are not held in the database, so the ads gate stays unproven here on purpose."
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <Stat label="Future races" value={fmt(data.inventory.future_events)} />
            <Stat label="Reach discovery" value={fmt(data.inventory.discovery_eligible)} />
            <Stat
              label="No organiser-owned link"
              value={fmt(data.inventory.without_organiser_link)}
              hint="excluded from discovery"
            />
            <Stat label="Racing in next 90 days" value={fmt(data.inventory.next_90_days)} />
          </div>

          <p className="mt-8 text-xs text-muted-foreground">
            Generated {new Date(data.generated_at).toLocaleString("en-GB")}. Governing-body data
            (England/Scottish Athletics and similar) is not ours to license or resell.
          </p>
        </>
      )}
    </div>
  );
}
