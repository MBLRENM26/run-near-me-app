import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef } from "react";
import {
  getEmailSubscriptions,
  getSubscriptionStats,
} from "@/lib/admin-subscriptions.functions";
import { markEmailSubscriptionsSeen } from "@/lib/admin-notify.functions";
import {
  deriveViewState,
  type SubscriptionRow,
} from "@/lib/admin-subscriptions.core";

export const Route = createFileRoute("/_adminShell/admin/subscriptions")({
  component: AdminSubscriptionsPage,
});

function AdminSubscriptionsPage() {
  const fetchSubs = useServerFn(getEmailSubscriptions);
  const fetchStats = useServerFn(getSubscriptionStats);
  const markSeen = useServerFn(markEmailSubscriptionsSeen);
  const queryClient = useQueryClient();
  const markedRef = useRef(false);

  const { data: subs, isLoading, error } = useQuery({
    queryKey: ["admin", "subscriptions"],
    queryFn: () => fetchSubs(),
  });

  const { data: stats } = useQuery({
    queryKey: ["admin", "subscription-stats"],
    queryFn: () => fetchStats(),
  });

  const state = deriveViewState({ isLoading, error, subs, stats });

  // Only an authenticated, successful load marks rows seen. Unauthenticated,
  // error and loading states must not mutate anything.
  useEffect(() => {
    if (state.kind !== "data" || markedRef.current) return;
    markedRef.current = true;
    void markSeen().then(() => {
      queryClient.invalidateQueries({ queryKey: ["admin-unseen-counts"] });
    });
  }, [state.kind, markSeen, queryClient]);


  if (state.kind === "unauthenticated") {
    return (
      <div>
        <h1 className="text-2xl font-bold text-foreground">Email subscribers</h1>
        <div className="mt-6 rounded-lg border border-border bg-muted/30 p-6">
          <p className="font-medium text-foreground">Session expired</p>
          <p className="mt-1 text-sm text-muted-foreground">
            You are not signed in, so subscriber data cannot be shown. This is
            not an empty list.
          </p>
          <a
            href="/admin/login"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Log in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Email subscribers</h1>
        <p className="text-sm text-muted-foreground">
          {state.kind === "data" ? `${state.total} total` : "Loading count…"}
        </p>
      </div>

      {state.kind === "data" && Object.keys(state.byKind).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
          {Object.entries(state.byKind).map(([kind, count]) => (
            <span
              key={kind}
              className="rounded-full bg-muted px-2.5 py-0.5 capitalize"
            >
              {kind}: {count}
            </span>
          ))}
        </div>
      )}

      {state.kind === "loading" && (
        <p className="mt-8 text-muted-foreground">Loading…</p>
      )}
      {state.kind === "error" && (
        <p className="mt-8 text-destructive">{state.message}</p>
      )}

      {state.kind === "data" && state.rows.length === 0 && (
        <p className="mt-8 text-muted-foreground">
          No email subscriptions yet.
        </p>
      )}

      {state.kind === "data" && state.rows.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Event</th>
                <th className="px-3 py-2 font-medium">Kind</th>
                <th className="px-3 py-2 font-medium">Subscribed</th>
                <th className="px-3 py-2 font-medium">Reminder sent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {state.rows.map((row: SubscriptionRow) => (
                <tr key={row.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-mono text-xs">{row.email}</td>
                  <td className="px-3 py-2">
                    {row.event_slug ? (
                      <Link
                        to="/events/$slug"
                        params={{ slug: row.event_slug }}
                        className="text-primary hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {row.event_name}
                      </Link>
                    ) : (
                      row.event_name
                    )}
                  </td>
                  <td className="px-3 py-2 capitalize">{row.kind}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatDate(row.created_at)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.reminder_sent_at
                      ? formatDate(row.reminder_sent_at)
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

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
