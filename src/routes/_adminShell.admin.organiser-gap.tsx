import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getOrlReconciliation } from "@/lib/orl-reconciliation.functions";
import { stageOrlCandidate } from "@/lib/orl-staging.functions";
import {
  existingCandidateReviewLink,
  planStaging,
  proposalConfirmationSentence,
} from "@/lib/orl-staging";
import type {
  CandidateBasis,
  ReconciliationRow,
  ReconciliationState,
} from "@/lib/orl-reconciliation";

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

/** Presentation order for the confirmation panel's strongest-evidence line. */
const BASIS_ORDER: CandidateBasis["kind"][] = [
  "organiser_owned_domain",
  "canonical_name",
  "alias_name",
  "verified_dedicated_tenant",
  "platform_tenant",
  "platform_account_endpoint",
  "evidence_url",
  "existing_link",
];

function strongestBasis(bases: CandidateBasis[]): CandidateBasis | undefined {
  return [...bases].sort((a, b) => BASIS_ORDER.indexOf(a.kind) - BASIS_ORDER.indexOf(b.kind))[0];
}

function AdminOrganiserGapPage() {
  const [state, setStateRaw] = useState<ReconciliationState | "all">("all");
  const [offset, setOffset] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const setState = (next: ReconciliationState | "all") => {
    setStateRaw(next);
    setOffset(0);
    setExpanded(null);
    setConfirming(null);
  };

  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "orl-reconciliation", state, offset],
    queryFn: () =>
      getOrlReconciliation({
        data: { limit: PAGE_SIZE, offset, ...(state === "all" ? {} : { state }) },
      }),
    staleTime: 60_000,
  });

  const stage = useMutation({
    mutationFn: (vars: { event_id: string; organisation_id: string }) =>
      stageOrlCandidate({ data: { ...vars, confirm: true } }),
    onSuccess: async (result) => {
      setConfirming(null);
      setNotice(
        result.ok
          ? {
              tone: "ok",
              text: result.created
                ? `Staged as a proposed ${result.relationship} link. Review it in Organiser identities — nothing is accepted here.`
                : `Already in ORL review as ${result.relationship} (status ${result.review_status}). No duplicate was created.`,
            }
          : { tone: "error", text: result.reason },
      );
      await queryClient.invalidateQueries({ queryKey: ["admin", "orl-reconciliation"] });
    },
    onError: (err) =>
      setNotice({ tone: "error", text: err instanceof Error ? err.message : "Staging failed" }),
  });

  const confirmingRow = data?.rows.find((row) => row.event.id === confirming) ?? null;
  const confirmingPlan = confirmingRow ? planStaging(confirmingRow) : null;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Organiser gap — ORL reconciliation</h1>
        <p className="max-w-lg text-sm text-muted-foreground">
          Confirmation view over the existing ORL evidence graph. Reconciliation is read-only except
          for the explicit per-row <strong>Review proposal</strong> action, which creates a{" "}
          <em>proposed</em> ORL link only. No acceptance, no bulk staging and no write to any public
          event field happens here — review and approval stay in{" "}
          <Link to="/admin/organiser-identities" className="text-primary underline">
            Organiser identities
          </Link>
          .
        </p>
      </div>

      {notice && (
        <p
          className={`mt-4 rounded-md border px-3 py-2 text-sm ${
            notice.tone === "ok"
              ? "border-border bg-muted/40 text-foreground"
              : "border-destructive/40 text-destructive"
          }`}
        >
          {notice.text}{" "}
          <Link to="/admin/organiser-identities" className="text-primary underline">
            Open Organiser identities
          </Link>
        </p>
      )}

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
              hint="accepted organisation_event_link"
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
              {data.scan_truncated &&
                " Warning: the safety page bound was reached, so totals are partial."}
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
                    onAskConfirm={() => {
                      setNotice(null);
                      setConfirming(row.event.id);
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <Dialog
            open={Boolean(confirmingRow && confirmingPlan?.allowed)}
            onOpenChange={(open) => {
              if (!open && !stage.isPending) setConfirming(null);
            }}
          >
            <DialogContent
              className="max-h-[85vh] overflow-y-auto sm:max-w-xl"
              onEscapeKeyDown={(event) => stage.isPending && event.preventDefault()}
              onPointerDownOutside={(event) => stage.isPending && event.preventDefault()}
            >
              {confirmingRow && confirmingPlan?.allowed && (
                <ProposalConfirmation
                  row={confirmingRow}
                  plan={confirmingPlan}
                  staging={stage.isPending}
                  onCancel={() => setConfirming(null)}
                  onConfirm={() =>
                    stage.mutate({
                      event_id: confirmingRow.event.id,
                      organisation_id: confirmingPlan.organisation_id,
                    })
                  }
                />
              )}
            </DialogContent>
          </Dialog>
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
  onAskConfirm,
}: {
  row: ReconciliationRow;
  open: boolean;
  onToggle: () => void;
  onAskConfirm: () => void;
}) {
  const e = row.event;
  const inReview = existingCandidateReviewLink(row);
  const plan = planStaging(row);
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
          <div className="flex justify-end gap-2">
            {inReview && (
              <div className="flex flex-col items-end gap-1 text-right">
                <span className="text-xs font-semibold text-foreground">In ORL review</span>
                <span className="text-xs text-muted-foreground">
                  {inReview.organisation_name} · {inReview.relationship} ({inReview.review_status})
                </span>
                <Link
                  to="/admin/organiser-identities"
                  search={{ status: undefined }}
                  className="text-xs text-primary underline"
                >
                  Review &amp; apply organiser →
                </Link>
              </div>
            )}
            {plan.allowed && (
              <Button size="sm" variant="outline" onClick={onAskConfirm}>
                Review proposal
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onToggle}>
              {open ? "Hide" : "Evidence"}
            </Button>
          </div>
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
                  {plan.allowed
                    ? `Stageable as a proposed ${plan.relationship} link for ${plan.organisation_name} (confidence ${plan.confidence}${
                        plan.reuse_evidence_ids.length > 0
                          ? `, reusing ${plan.reuse_evidence_ids.length} existing evidence row(s)`
                          : ", recording the exact endpoint as a new evidence observation"
                      }). No acceptance happens here.`
                    : `Staging blocked: ${plan.reason}`}
                </p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function ProposalConfirmation({
  row,
  plan,
  staging,
  onCancel,
  onConfirm,
}: {
  row: ReconciliationRow;
  plan: Extract<ReturnType<typeof planStaging>, { allowed: true }>;
  staging: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const basis = strongestBasis(plan.bases);
  return (
    <>
      <DialogHeader>
        <DialogTitle>Confirm this proposal</DialogTitle>
        <DialogDescription>
          Review the evidence before creating an item in the ORL review queue.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3 text-sm text-foreground">
        <div>
          Event: <strong>{row.event.name}</strong>
        </div>
        <div>
          {proposalConfirmationSentence(plan.relationship, plan.organisation_name, row.event.name)}
        </div>
        <div>
          Current organiser on the event:{" "}
          {row.event.organiser?.trim() ? row.event.organiser : <strong>blank</strong>}
        </div>
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <div className="font-medium">Strongest evidence</div>
          <div className="mt-1 text-muted-foreground">
            {basis?.detail ?? "no structured basis recorded"}
          </div>
          {basis?.url && <div className="mt-1 break-all font-mono text-xs">{basis.url}</div>}
          {(basis?.tenant || basis?.path) && (
            <div className="mt-1 text-xs text-muted-foreground">
              {basis.tenant && `tenant: ${basis.tenant} `}
              {basis.path && `path: ${basis.path}`}
            </div>
          )}
        </div>
        <p className="text-muted-foreground">
          What happens now: this creates a proposed ORL review item. It does not change the public
          organiser.
        </p>
        <p className="text-muted-foreground">
          Next step: in Organiser identities, Accept &amp; apply organiser is the separate action
          that changes the public organiser.
        </p>
      </div>
      <DialogFooter>
        <Button variant="outline" disabled={staging} onClick={onCancel}>
          Cancel
        </Button>
        <Button disabled={staging} onClick={onConfirm}>
          {staging ? "Sending to review…" : "Confirm and send to review"}
        </Button>
      </DialogFooter>
    </>
  );
}
