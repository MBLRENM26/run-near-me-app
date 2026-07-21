import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { adminCheckSession } from "@/lib/admin.functions";
import {
  listClubClaims,
  updateClubClaim,
  type ClubClaimRow,
} from "@/lib/admin-clubs.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

const STATUSES = ["pending", "approved", "rejected", "needs-info"] as const;
type Status = (typeof STATUSES)[number];

const searchSchema = z.object({
  status: z.enum(STATUSES).optional(),
});

export const Route = createFileRoute("/_adminShell/admin/club-claims")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Club claims — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminClubClaimsPage,
});

function AdminClubClaimsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const fetchList = useServerFn(listClubClaims);
  const updateOne = useServerFn(updateClubClaim);
  const checkSession = useServerFn(adminCheckSession);

  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    checkSession()
      .then((r) => (r.authenticated ? setAuthed(true) : navigate({ to: "/admin/login" })))
      .catch(() => navigate({ to: "/admin/login" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusFilter: Status = search.status ?? "pending";

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-club-claims", statusFilter],
    queryFn: () =>
      fetchList({ data: { status: statusFilter, limit: 100, offset: 0 } }),
    enabled: authed,
  });

  const rows = data?.rows ?? [];
  const counts = data?.counts;
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-club-claims"] });

  const onUpdate = async (
    id: string,
    status: Status,
    admin_note?: string | null,
  ) => {
    try {
      await updateOne({ data: { id, status, admin_note: admin_note ?? null } });
      toast.success(`Marked ${status.replace("-", " ")}`);
      refresh();
    } catch (e) {
      toast.error("Update failed");
      console.error(e);
    }
  };

  if (!authed) return <p className="text-sm text-muted-foreground">Checking session…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Club claims</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Verify and approve club-listing claims.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => {
          const active = statusFilter === s;
          const count = counts?.[s] ?? 0;
          return (
            <button
              key={s}
              onClick={() =>
                navigate({
                  to: ".",
                  search: { status: s === "pending" ? undefined : s },
                })
              }
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.replace("-", " ")} ({count})
            </button>
          );
        })}
        {isFetching && <span className="text-xs text-muted-foreground self-center">Refreshing…</span>}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">Nothing in this view.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <ClaimCard key={row.id} row={row} onUpdate={onUpdate} />
          ))}
        </div>
      )}

      <Toaster position="top-center" />
    </div>
  );
}

function ClaimCard({
  row,
  onUpdate,
}: {
  row: ClubClaimRow;
  onUpdate: (id: string, status: Status, admin_note?: string | null) => void;
}) {
  const [note, setNote] = useState(row.admin_note ?? "");
  return (
    <article className="rounded-lg border border-border bg-card p-4 space-y-3">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-semibold text-foreground">
            {row.club_name ?? row.club_slug}
          </h2>
          <p className="text-xs text-muted-foreground">/{row.club_slug}</p>
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(row.submitted_at).toLocaleString()}
        </span>
      </header>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-muted-foreground">Claimant</dt>
          <dd className="text-foreground">
            {row.claimant_name} ({row.role_at_club})
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="text-foreground">
            <a href={`mailto:${row.claimant_email}`} className="hover:underline">
              {row.claimant_email}
            </a>
          </dd>
        </div>
        {row.verification_hint && (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Verification hint</dt>
            <dd className="text-foreground">{row.verification_hint}</dd>
          </div>
        )}
        {row.message && (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Message</dt>
            <dd className="text-foreground whitespace-pre-wrap">{row.message}</dd>
          </div>
        )}
      </dl>
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Admin note (optional)"
        maxLength={2000}
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onUpdate(row.id, "approved", note)}>
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onUpdate(row.id, "needs-info", note)}
        >
          Needs info
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onUpdate(row.id, "rejected", note)}
        >
          Reject
        </Button>
      </div>
    </article>
  );
}
