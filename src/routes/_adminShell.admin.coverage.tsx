import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkCoverageNow, getCoverageReports } from "@/lib/coverage-monitor.functions";

const reportsQuery = { queryKey: ["admin", "coverage"], queryFn: () => getCoverageReports() };
export const Route = createFileRoute("/_adminShell/admin/coverage")({
  head: () => ({ meta: [
    { title: "Coverage checks — Running Events Near Me" },
    { name: "description", content: "Private race coverage, location and calendar checks." },
    { property: "og:title", content: "Coverage checks — Running Events Near Me" },
    { property: "og:description", content: "Private race coverage, location and calendar checks." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(reportsQuery),
  component: CoveragePage,
});

type Finding = { key: string; kind: string; title: string; slug: string | null; detail: string };
type Receipt = { label: string; url: string; checkedAt: string; status: string; leads: { title: string; url: string; newlySeen: boolean }[] };
function CoveragePage() {
  const { data, refetch } = useSuspenseQuery(reportsQuery);
  const [selected, setSelected] = useState("");
  const run = useServerFn(checkCoverageNow);
  const mutation = useMutation({ mutationFn: () => run(), onSuccess: () => refetch() });
  const report = data.find((r) => r.id === selected) ?? data[0];
  const snapshot = report?.snapshot as unknown as { findings?: Finding[]; new_keys?: string[]; resolved_keys?: string[] } | undefined;
  const calendars = (report?.calendars as unknown as Receipt[] | undefined) ?? [];
  const latestCalendars = calendars.length ? calendars : (data.find((r) => Array.isArray(r.calendars) && r.calendars.length)?.calendars as unknown as Receipt[] | undefined) ?? [];
  return <div className="space-y-8">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-bold">Coverage checks</h1><p className="text-sm text-muted-foreground mt-1">Private checks · trial ends 4 December 2026</p></div>
      <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}><RefreshCw className="size-4 mr-2" />{mutation.isPending ? "Checking…" : "Check now"}</Button>
    </div>
    {mutation.error && <p role="alert" className="text-destructive">{mutation.error.message}</p>}
    {mutation.data?.expired && <p role="status">The trial has ended. Checks are paused.</p>}
    <div className="flex flex-wrap gap-4 items-center">
      <label className="text-sm">Report <select aria-label="Report date" className="ml-2 border border-input bg-background rounded-md p-2" value={report?.id ?? ""} onChange={(e) => setSelected(e.target.value)}>{data.map((r) => <option key={r.id} value={r.id}>{r.audit_day}</option>)}</select></label>
      <span className="text-sm text-muted-foreground">{snapshot?.new_keys?.length ?? 0} new · {snapshot?.resolved_keys?.length ?? 0} resolved</span>
    </div>
    <section><h2 className="text-lg font-semibold mb-3">Locations, dates and updates</h2>
      {!report ? <p className="text-muted-foreground">No report yet.</p> : <ul className="divide-y divide-border">{snapshot?.findings?.map((f) => <li key={f.key} className="py-4 flex flex-wrap justify-between gap-3">
        <div className="min-w-0"><p className="font-medium break-words">{f.title}</p><p className="text-sm text-muted-foreground break-words">{f.kind.replace(/_/g, " ")} · {f.detail}</p></div>
        {f.slug && <Link className="text-primary text-sm" to="/events/$slug" params={{ slug: f.slug }}>View race</Link>}
      </li>)}</ul>}
    </section>
    <section><h2 className="text-lg font-semibold mb-3">Calendar leads</h2><p className="text-sm text-muted-foreground mb-4">Unmatched links need edition and location checks. They are not confirmed missing Kent races.</p>
      {latestCalendars.map((c) => <div key={c.url} className="border-t border-border py-4">
        <h3 className="font-semibold">{c.label}</h3><p className="text-sm text-muted-foreground">{c.status} · {new Date(c.checkedAt).toLocaleDateString("en-GB")}</p>
        <ul className="mt-3 space-y-2">{c.leads.map((l) => <li key={l.url} className="flex items-start gap-2 text-sm"><ExternalLink className="size-4 shrink-0 mt-0.5" /><a className="text-primary break-words" href={l.url} target="_blank" rel="noreferrer">{l.title}</a>{l.newlySeen && <span className="text-muted-foreground shrink-0">New</span>}</li>)}</ul>
      </div>)}
    </section>
  </div>;
}