import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getOrganiserGap, type ProposalRow, type TriageRow } from "@/lib/organiser-gap.functions";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export const Route = createFileRoute("/_adminShell/admin/organiser-gap")({
  head: () => ({
    meta: [{ title: "Organiser gap — Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminOrganiserGapPage,
});

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString();
}

function dateLabel(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type Section = "proposals" | "triage";

function AdminOrganiserGapPage() {
  const [section, setSection] = useState<Section>("proposals");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "organiser-gap"],
    queryFn: () => getOrganiserGap({ data: { limit: 200 } }),
    staleTime: 60_000,
  });

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Organiser gap</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Read-only evidence. Nothing on this page writes to the database — organiser proposals are
          for review and would be applied later through a separately approved audited update.
        </p>
      </div>

      {isLoading && <p className="mt-6 text-muted-foreground">Loading…</p>}
      {error && (
        <p className="mt-6 text-destructive">
          {error instanceof Error ? error.message : "Failed to load"}
        </p>
      )}

      {data && (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <Stat
              label="Future events"
              value={fmt(data.totals.future_events)}
              hint="ACTIVE, dated today or later"
            />
            <Stat
              label="Named organiser"
              value={`${fmt(data.totals.named)} (${data.totals.named_share_pct}%)`}
              hint="the reachable account list"
            />
            <Stat
              label="No name"
              value={fmt(data.totals.unnamed_total)}
              hint={`${fmt(data.totals.unnamed_with_organiser_url)} hold an organiser website`}
            />
            <Stat
              label="Deterministic proposals"
              value={fmt(
                data.proposals.length === data.totals.unnamed_total
                  ? data.proposals.length
                  : data.proposals.length,
              )}
              hint="club-domain or reviewed commercial map"
            />
          </div>

          <div className="mt-6 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Cohort</th>
                  <th className="px-3 py-2 font-medium text-right">Events</th>
                  <th className="px-3 py-2 font-medium">Resolution route</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <CohortRow
                  label="England Athletics — organiser website held"
                  n={data.totals.cohorts.ea_with_url}
                  route="club-domain match or reviewed commercial map"
                />
                <CohortRow
                  label="England Athletics — no website held"
                  n={data.totals.cohorts.ea_without_url}
                  route="needs source evidence (out of scope)"
                />
                <CohortRow
                  label="runabc import"
                  n={data.totals.cohorts.runabc}
                  route="links point at entry platforms — needs source evidence (out of scope)"
                />
                <CohortRow
                  label="TRA import"
                  n={data.totals.cohorts.tra}
                  route="links point at the TRA listing — needs source evidence (out of scope)"
                />
                <CohortRow
                  label="Welsh Athletics / Athletics NI"
                  n={data.totals.cohorts.welsh_ni}
                  route="needs source evidence (out of scope)"
                />
                <CohortRow
                  label="Literal “TBC” (May 2026 import, no provenance)"
                  n={data.totals.cohorts.tbc_literal}
                  route="manual triage queue below"
                />
                <CohortRow
                  label="Literal “Unknown”"
                  n={data.totals.cohorts.unknown_literal}
                  route="manual triage queue below"
                />
                <CohortRow
                  label="Other unnamed"
                  n={data.totals.cohorts.other_unnamed}
                  route="manual triage or source evidence"
                />
              </tbody>
            </table>
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Reviewed commercial host</th>
                  <th className="px-3 py-2 font-medium">Name used</th>
                  <th className="px-3 py-2 font-medium text-right">Future events matched</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.commercial_map_usage.map((m) => (
                  <tr key={m.host}>
                    <td className="px-3 py-2 font-mono text-xs text-foreground">{m.host}</td>
                    <td className="px-3 py-2 text-foreground">{m.name}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{fmt(m.events)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={section === "proposals" ? "default" : "outline"}
              onClick={() => setSection("proposals")}
            >
              Proposed matches
            </Button>
            <Button
              size="sm"
              variant={section === "triage" ? "default" : "outline"}
              onClick={() => setSection("triage")}
            >
              TBC triage queue
            </Button>
          </div>

          <div className="mt-4">
            {section === "proposals" ? (
              <ProposalsTable rows={data.proposals} />
            ) : (
              <TriageTable rows={data.triage} />
            )}
          </div>
        </>
      )}
    </div>
  );
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

function CohortRow({ label, n, route }: { label: string; n: number; route: string }) {
  return (
    <tr>
      <td className="px-3 py-2 text-foreground">{label}</td>
      <td className="px-3 py-2 text-right font-semibold text-foreground">{fmt(n)}</td>
      <td className="px-3 py-2 text-muted-foreground">{route}</td>
    </tr>
  );
}

function ProposalsTable({ rows }: { rows: ProposalRow[] }) {
  if (rows.length === 0)
    return <p className="text-sm text-muted-foreground">No deterministic proposals right now.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Event</th>
            <th className="px-3 py-2 font-medium">Where</th>
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Current</th>
            <th className="px-3 py-2 font-medium">Proposal</th>
            <th className="px-3 py-2 font-medium">Basis</th>
            <th className="px-3 py-2 font-medium text-right">Signals</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-3 py-2 text-foreground">
                {r.slug ? (
                  <a
                    href={`/events/${r.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline"
                  >
                    {r.name}
                  </a>
                ) : (
                  r.name
                )}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {[r.town, r.county].filter(Boolean).join(", ") || "—"}
              </td>
              <td className="px-3 py-2 text-muted-foreground">{dateLabel(r.sort_date)}</td>
              <td className="px-3 py-2 text-muted-foreground">{r.current}</td>
              <td className="px-3 py-2 font-semibold text-foreground">
                {r.proposal.organiser}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  ({r.proposal.organiser_type})
                </span>
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">
                {r.proposal.basis === "club-domain" ? "club website" : "commercial map"}
              </td>
              <td className="px-3 py-2 text-right text-muted-foreground">
                {r.demand_signals > 0 ? fmt(r.demand_signals) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TriageTable({ rows }: { rows: TriageRow[] }) {
  if (rows.length === 0)
    return <p className="text-sm text-muted-foreground">Nothing queued for manual triage.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Event</th>
            <th className="px-3 py-2 font-medium">Where</th>
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Entry link</th>
            <th className="px-3 py-2 font-medium text-right">Signals</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-3 py-2 text-foreground">
                {r.slug ? (
                  <a href={`/admin/events/${r.id}`} className="text-primary underline">
                    {r.name}
                  </a>
                ) : (
                  r.name
                )}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {[r.town, r.county].filter(Boolean).join(", ") || "—"}
              </td>
              <td className="px-3 py-2 text-muted-foreground">{dateLabel(r.sort_date)}</td>
              <td className="max-w-[220px] truncate px-3 py-2 text-xs text-muted-foreground">
                {r.entry_host ?? "none"}
              </td>
              <td className="px-3 py-2 text-right text-muted-foreground">
                {r.demand_signals > 0 ? fmt(r.demand_signals) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
