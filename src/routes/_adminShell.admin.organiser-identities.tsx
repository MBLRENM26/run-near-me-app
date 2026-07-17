import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { adminCheckSession } from "@/lib/admin.functions";
import {
  listOrganiserLinks,
  reviewOrganiserLink,
  type OrganiserLinkRow,
  type ReviewStatus,
} from "@/lib/organiser-identity.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

const STATUSES = ["proposed", "accepted", "rejected", "reopened"] as const;

const searchSchema = z.object({
  status: z.enum(STATUSES).optional(),
});

export const Route = createFileRoute("/_adminShell/admin/organiser-identities")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Organiser identities — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OrganiserIdentitiesPage,
});

type Action = "accepted" | "rejected" | "reopened";

const ALLOWED: Record<ReviewStatus, Action[]> = {
  proposed: ["accepted", "rejected"],
  accepted: ["reopened"],
  rejected: ["reopened"],
  reopened: ["accepted", "rejected"],
};

function OrganiserIdentitiesPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/organiser-identities" });
  const qc = useQueryClient();

  const check = useServerFn(adminCheckSession);
  const fetchList = useServerFn(listOrganiserLinks);
  const doReview = useServerFn(reviewOrganiserLink);

  const [authChecked, setAuthChecked] = useState(false);
  useEffect(() => {
    check()
      .then((r) => (r.authenticated ? setAuthChecked(true) : navigate({ to: "/admin/login" })))
      .catch(() => navigate({ to: "/admin/login" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status = search.status;

  const { data, isLoading } = useQuery({
    queryKey: ["organiser-links", status ?? "all"],
    queryFn: () => fetchList({ data: { status, limit: 200, offset: 0 } }),
    enabled: authChecked,
  });

  const [expanded, setExpanded] = useState<string | null>(null);
  const [decision, setDecision] = useState<{
    row: OrganiserLinkRow;
    action: Action;
  } | null>(null);
  const [note, setNote] = useState("");

  const submitDecision = async () => {
    if (!decision) return;
    const res = await doReview({
      data: { link_id: decision.row.id, action: decision.action, note: note || null },
    });
    if ("ok" in res && res.ok) {
      toast.success(`Link ${decision.action}`);
      setDecision(null);
      setNote("");
      qc.invalidateQueries({ queryKey: ["organiser-links"] });
    } else {
      toast.error(`Review failed: ${"error" in res ? res.error : "unknown"}`);
    }
  };

  if (!authChecked) return null;

  return (
    <div className="space-y-6">
      <Toaster richColors position="top-right" />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Organiser identities</h1>
        <Link
          to="/admin/organiser-identities/unresolved"
          className="text-sm text-primary hover:underline"
        >
          Unresolved seed rows →
        </Link>
      </div>

      <div className="flex gap-2 text-sm">
        <FilterChip active={!status} onClick={() => navigate({ search: {} })}>
          All
        </FilterChip>
        {STATUSES.map((s) => (
          <FilterChip
            key={s}
            active={status === s}
            onClick={() => navigate({ search: { status: s } })}
          >
            {s}
          </FilterChip>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data?.rows.length ? (
        <p className="text-sm text-muted-foreground">No links match this filter.</p>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Event</th>
                <th className="px-3 py-2 font-medium">Organisation</th>
                <th className="px-3 py-2 font-medium">Relationship</th>
                <th className="px-3 py-2 font-medium">Confidence</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <RowView
                  key={row.id}
                  row={row}
                  expanded={expanded === row.id}
                  onToggle={() => setExpanded(expanded === row.id ? null : row.id)}
                  onAct={(action) => {
                    setDecision({ row, action });
                    setNote("");
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!decision} onOpenChange={(o) => !o && setDecision(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decision?.action[0].toUpperCase()}
              {decision?.action.slice(1)} link
            </DialogTitle>
          </DialogHeader>
          {decision && (
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium">{decision.row.event_name}</span>
                {" — "}
                <span className="text-muted-foreground">
                  {decision.row.organisation_name} ({decision.row.relationship})
                </span>
              </div>
              <Textarea
                placeholder="Optional note (visible in audit history)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDecision(null)}>
              Cancel
            </Button>
            <Button onClick={submitDecision}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full border px-3 py-1 " +
        (active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}

function RowView({
  row,
  expanded,
  onToggle,
  onAct,
}: {
  row: OrganiserLinkRow;
  expanded: boolean;
  onToggle: () => void;
  onAct: (action: Action) => void;
}) {
  const actions = ALLOWED[row.review_status];
  return (
    <>
      <tr className="border-b border-border/60">
        <td className="px-3 py-2">
          <button className="text-left hover:underline" onClick={onToggle}>
            <div className="font-medium">{row.event_name ?? "(no name)"}</div>
            <div className="text-xs text-muted-foreground">
              {row.event_slug ?? "—"} · {row.event_date_raw ?? "date?"}
            </div>
          </button>
        </td>
        <td className="px-3 py-2">
          <div>{row.organisation_name}</div>
          <div className="text-xs text-muted-foreground">{row.organisation_status}</div>
        </td>
        <td className="px-3 py-2">{row.relationship}</td>
        <td className="px-3 py-2">{row.confidence}</td>
        <td className="px-3 py-2">
          <StatusPill status={row.review_status} />
        </td>
        <td className="px-3 py-2">
          <div className="flex flex-wrap gap-1">
            {actions.map((a) => (
              <Button
                key={a}
                size="sm"
                variant={a === "accepted" ? "default" : "outline"}
                onClick={() => onAct(a)}
              >
                {a === "accepted" ? "Accept" : a === "rejected" ? "Reject" : "Reopen"}
              </Button>
            ))}
            {actions.length === 0 && (
              <span className="text-xs text-muted-foreground">terminal</span>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-muted/20">
          <td colSpan={6} className="px-3 py-3">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                  Evidence ({row.evidence.length})
                </div>
                {row.evidence.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No evidence linked.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {row.evidence.map((e) => (
                      <li key={e.id} className="rounded border border-border bg-background p-2">
                        <div className="text-xs text-muted-foreground">{e.evidence_type}</div>
                        <a
                          href={e.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all text-primary hover:underline"
                        >
                          {e.source_url}
                        </a>
                        {e.supporting_fact && (
                          <div className="mt-1 text-muted-foreground">{e.supporting_fact}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                  Decision history ({row.history.length})
                </div>
                {row.history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No decisions yet.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {row.history.map((h) => (
                      <li key={h.id} className="rounded border border-border bg-background p-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{h.action}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(h.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          by {h.reviewer_identity}
                        </div>
                        {h.note && <div className="mt-1">{h.note}</div>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function StatusPill({ status }: { status: ReviewStatus }) {
  const cls =
    status === "accepted"
      ? "bg-green-100 text-green-800"
      : status === "rejected"
        ? "bg-red-100 text-red-800"
        : status === "reopened"
          ? "bg-amber-100 text-amber-800"
          : "bg-blue-100 text-blue-800";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}
