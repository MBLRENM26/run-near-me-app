import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getOrlReconciliation } from "@/lib/orl-reconciliation.functions";
import type { ReconciliationRow, ReconciliationState } from "@/lib/orl-reconciliation";

export const Route = createFileRoute("/_adminShell/admin/organiser-gap")({
  head: () => ({
    meta: [
      { title: "Organiser gap — ORL reconciliation — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
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

const STATES: Array<{ key: ReconciliationState | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "linked_in_orl", label: "Linked in ORL" },
  { key: "candidate_match", label: "Candidate" },
  { key: "ambiguous", label: "Ambiguous" },
  { key: "unmatched", label: "Unmatched" },
  { key: "unresolved_seed", label: "Unresolved seed" },
];

const STATE_LABEL: Record<ReconciliationState, string> = {
  linked_in_orl: "Linked in ORL",
  candidate_match: "Candidate",
  ambiguous: "Ambiguous",
  unmatched: "Unmatched",
  unresolved_seed: "Unresolved seed",
};

const PAGE_SIZE = 100;

function AdminOrganiserGapPage() {
  const [state, setStateRaw] = useState<ReconciliationState | "all">("all");
  const [offset, setOffset] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  const setState = (next: ReconciliationState | "all") => {
    setStateRaw(next);
    setOffset(0);
    setExpanded(null);
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "orl-reconciliation", state, offset],
    queryFn: () =>
      getOrlReconciliation({
        data: { limit: PAGE_SIZE, offset, ...(state === "all" ? {} : { state }) },
      }),
    staleTime: 60_000,
  });

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Organiser gap — ORL reconciliation</h1>
        <p className="max-w-lg text-sm text-muted-foreground">
          Read-only confirmation view over the existing ORL evidence graph. Nothing here writes,
          stages or reviews: staging clues into ORL intake (Step 2) is deliberately absent and
          separately gated. Evidence is never reduced to a flat organiser name — review and approval
          happen only in{" "}
          <Link to="/admin/organiser-identities" className="text-primary underline">
            Organiser identities
          </Link>
          .
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
          <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat
              label="Future events"
              value={fmt(data.totals.future_events)}
              hint="ACTIVE, dated today or later"
            />
            <Stat
              label="Linked in ORL"
              value={`${fmt(data.totals.linked_in_orl)} (${data.totals.orl_coverage_pct}%)`}
              hint="direct organisation_event_link"
            />
            <Stat
              label="Candidate"
              value={fmt(data.totals.candidate_match)}
              hint="one explainable organisation"
            />
            <Stat
              label="Ambiguous"
              value={fmt(data.totals.ambiguous)}
              hint="several possible organisations"
            />
            <Stat
              label="Unmatched"
              value={fmt(data.totals.unmatched)}
              hint="no ORL connection yet"
            />
            <Stat
              label="Unresolved seed"
              value={fmt(data.totals.unresolved_seed)}
              hint="existing quarantine applies"
            />
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Totals cover all {fmt(data.totals.future_events)} future events and are computed before
            any display slicing. {fmt(data.totals.shared_host_only)} events hold only
            shared-host/social/entry-platform endpoints, which can never name an organiser on their
            own. ORL graph read: {fmt(data.graph_inventory.organisations)} organisations,{" "}
            {fmt(data.graph_inventory.aliases)} aliases,{" "}
            {fmt(data.graph_inventory.platform_accounts)} platform accounts,{" "}
            {fmt(data.graph_inventory.links)} links ({fmt(data.graph_inventory.accepted_links)}{" "}
            accepted), {fmt(data.graph_inventory.unresolved_seed_rows)} quarantined seed rows.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {STATES.map((s) => (
              <Button
                key={s.key}
                size="sm"
                variant={state === s.key ? "default" : "outline"}
                onClick={() => setState(s.key)}
              >
                {s.label}
              </Button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>
              Showing {fmt(data.offset + 1)}–{fmt(data.offset + data.returned)} of{" "}
              {fmt(data.matching)} matching rows, ordered by runner demand. Demand orders review
              priority only — it is not identity evidence and contains no runner details.
              {data.scan_truncated && " Warning: the safety page bound was reached, so totals are partial."}
            </span>
            <span className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={data.offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!data.has_more}
                onClick={() => setOffset(offset + PAGE_SIZE)}
              >
                Next
              </Button>
            </span>
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Event</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Flat label</th>
                  <th className="px-3 py-2 font-medium">Reconciliation state</th>
                  <th className="px-3 py-2 font-medium">Canonical organisation(s)</th>
                  <th className="px-3 py-2 font-medium">Reasons</th>
                  <th className="px-3 py-2 font-medium text-right">Clues</th>
                  <th className="px-3 py-2 font-medium">Review</th>
                  <th className="px-3 py-2 font-medium text-right">Demand</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.rows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-3 py-4 text-muted-foreground">
                      No events in this state.
                    </td>
                  </tr>
                )}
                {data.rows.map((row) => (
                  <Row
                    key={row.event.id}
                    row={row}
                    open={expanded === row.event.id}
                    onToggle={() => setExpanded(expanded === row.event.id ? null : row.event.id)}
                  />
                ))}
              </tbody>
            </table>
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

function Row({
  row,
  open,
  onToggle,
}: {
  row: ReconciliationRow;
  open: boolean;
  onToggle: () => void;
}) {
  const e = row.event;
  const orgs =
    row.state === "linked_in_orl"
      ? row.linked.map((l) => `${l.organisation_name} (${l.relationship})`)
      : row.candidates.map((c) => `${c.organisation_name} (${c.suggested_relationship})`);
  const reasons =
    row.state === "linked_in_orl"
      ? row.linked.map((l) => `link ${l.review_status}, confidence ${l.confidence}`)
      : row.state === "unresolved_seed"
        ? row.unresolved_reasons
        : row.candidates.flatMap((c) => c.reasons);

  return (
    <>
      <tr>
        <td className="px-3 py-2 text-foreground">
          <a href={`/admin/events/${e.id}`} className="text-primary underline">
            {e.name}
          </a>
          <div className="text-xs text-muted-foreground">
            {[e.town, e.county].filter(Boolean).join(", ") || "—"}
            {e.source ? ` · ${e.source}` : ""}
          </div>
        </td>
        <td className="px-3 py-2 text-muted-foreground">{dateLabel(e.sort_date)}</td>
        <td className="px-3 py-2 text-muted-foreground">{e.organiser?.trim() || "(no name)"}</td>
        <td className="px-3 py-2 font-medium text-foreground">{STATE_LABEL[row.state]}</td>
        <td className="px-3 py-2 text-foreground">{orgs.length > 0 ? orgs.join("; ") : "—"}</td>
        <td className="max-w-[320px] px-3 py-2 text-xs text-muted-foreground">
          {reasons.length > 0 ? reasons[0] : "no ORL-matching clue"}
          {reasons.length > 1 && ` (+${reasons.length - 1})`}
        </td>
        <td className="px-3 py-2 text-right text-muted-foreground">{fmt(row.clues.length)}</td>
        <td className="px-3 py-2 text-xs text-muted-foreground">
          {row.linked.length > 0 ? (
            <Link
              to="/admin/organiser-identities"
              search={{ status: undefined }}
              className="text-primary underline"
            >
              {row.linked.map((l) => l.review_status).join(", ")}
            </Link>
          ) : (
            "—"
          )}
        </td>
        <td className="px-3 py-2 text-right text-muted-foreground">
          {row.demand_total > 0 ? fmt(row.demand_total) : "—"}
        </td>
        <td className="px-3 py-2 text-right">
          <Button size="sm" variant="outline" onClick={onToggle}>
            {open ? "Hide" : "Evidence"}
          </Button>
        </td>
      </tr>
      {open && (
        <tr className="bg-muted/30">
          <td colSpan={10} className="px-3 py-3">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Clue bundle (channel and role kept separate)
                </h3>
                <ul className="mt-2 space-y-1 text-xs text-foreground">
                  {row.clues.map((c, i) => (
                    <li key={i}>
                      <span className="font-medium">{c.kind}</span> · role {c.role}
                      {c.shared_host && " · shared/multi-tenant host"}
                      <div className="text-muted-foreground">{c.label}</div>
                      {c.url && <div className="break-all font-mono">{c.url}</div>}
                      {(c.tenant || c.path) && (
                        <div className="text-muted-foreground">
                          {c.tenant && `tenant: ${c.tenant} `}
                          {c.path && `path: ${c.path}`}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  ORL evidence bucket
                </h3>
                {row.linked.length === 0 && row.candidates.length === 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    No ORL organisation, alias, platform account or evidence row matches these clues
                    exactly. Unknown is preferred to an unsupported conclusion.
                  </p>
                )}
                {row.linked.map((l) => (
                  <div key={l.link_id} className="mt-2 text-xs text-foreground">
                    <div className="font-medium">
                      {l.organisation_name} — {l.relationship} · {l.review_status} · confidence{" "}
                      {l.confidence}
                    </div>
                    <div className="text-muted-foreground">
                      {l.evidence_count} evidence row(s), {l.review_count} review row(s)
                    </div>
                    {l.aliases.length > 0 && (
                      <div className="text-muted-foreground">Aliases: {l.aliases.join(", ")}</div>
                    )}
                    {l.platform_accounts.map((p, i) => (
                      <div key={i} className="break-all text-muted-foreground">
                        {p.platform}
                        {p.tenant ? ` (${p.tenant})` : ""}: {p.account_url ?? "—"}
                      </div>
                    ))}
                  </div>
                ))}
                {row.candidates.map((c) => (
                  <div key={c.organisation_id} className="mt-2 text-xs text-foreground">
                    <div className="font-medium">
                      {c.organisation_name} — possible {c.suggested_relationship} (
                      {c.organisation_status})
                    </div>
                    <ul className="list-disc pl-4 text-muted-foreground">
                      {c.reasons.map((r, i) => (
                        <li key={i} className="break-all">
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {row.unresolved_reasons.length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Seed quarantine: {row.unresolved_reasons.join("; ")}
                  </div>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  Read-only. No staging, no review action, no write from this page.
                </p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
