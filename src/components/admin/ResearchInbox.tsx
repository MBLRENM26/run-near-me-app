import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { decideFact, researchOverview, revokeAutoRule } from "@/lib/rich-race-research.functions";

const label = (s: string) => s.replaceAll("_", " ").replaceAll("-", " ");

export function ResearchInbox() {
  const load = useServerFn(researchOverview), decide = useServerFn(decideFact), revoke = useServerFn(revokeAutoRule);
  const qc = useQueryClient();
  const { data, error, isLoading } = useQuery({ queryKey: ["research-overview"], queryFn: () => load(), retry: false });
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
  const [find, setFind] = useState("");
  async function act(fn: () => Promise<unknown>) {
    setBusy(true); setMsg("");
    try { await fn(); await qc.invalidateQueries({ queryKey: ["research-overview"] }); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Could not save"); }
    finally { setBusy(false); }
  }
  if (isLoading) return <p className="text-sm">Checking research…</p>;
  if (error || !data) return <p role="alert" className="text-destructive">{error?.message ?? "Could not load research"}</p>;
  const byRace = new Map<string, typeof data.accepted>();
  for (const a of data.accepted) if (!find || a.slug.includes(find.toLowerCase())) byRace.set(a.slug, [...(byRace.get(a.slug) ?? []), a]);
  return <section aria-labelledby="inbox-heading" className="space-y-4">
    <p className="text-lg"><strong>{data.auto}</strong> facts accepted automatically · <strong>{data.needsYou.length}</strong> need you</p>
    <p className="text-sm text-muted-foreground">Clean facts quoted from the organiser's own website are accepted for you. Entry status and course maps ({data.parked}) are set aside and never auto-accepted. Nothing here is shown on race pages yet.</p>
    {msg && <p role="status" className="text-sm">{msg}</p>}
    <h2 id="inbox-heading" className="text-xl font-semibold">Needs you</h2>
    {data.needsYou.length === 0 && <p>Nothing to check.</p>}
    <ul className="space-y-3">{data.needsYou.map((r) => <li key={r.id} className="rounded border border-border p-4 space-y-2">
      <p className="font-medium">{label(r.slug)} — {label(r.field)}: {r.others.length ? <>{r.others.map((o) => o.value).join(" / ")} before, <strong>{r.raw_value}</strong> now</> : <strong>{r.raw_value}</strong>}</p>
      <p className="text-sm">Why: {r.reason}</p>
      <blockquote className="border-l-2 border-border pl-3 text-sm text-muted-foreground">“{r.evidence_quote}” <a href={r.source_url} target="_blank" rel="noreferrer" className="text-primary underline">source</a></blockquote>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={() => act(() => decide({ data: { id: r.id, decision: "use_new", otherIds: r.others.map((o) => o.id) } }))}>{r.others.length ? "Use new" : "Accept"}</Button>
        {r.others.length > 0 && <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => decide({ data: { id: r.id, decision: "keep_old", otherIds: r.others.map((o) => o.id) } }))}>Keep old</Button>}
        <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => decide({ data: { id: r.id, decision: "ignore", otherIds: [] } }))}>Ignore</Button>
      </div>
    </li>)}</ul>
    <details className="rounded border border-border p-4">
      <summary className="font-medium">Accepted facts by race ({data.accepted.length})</summary>
      <input aria-label="Find race" placeholder="Find race" value={find} onChange={(e) => setFind(e.target.value)} className="my-3 block w-full rounded border border-border bg-background p-2 text-sm" />
      <ul className="space-y-2 text-sm">{[...byRace].slice(0, 100).map(([slug, facts]) => <li key={slug}><strong>{label(slug)}</strong>: {facts.map((f) => `${label(f.field)} ${f.value}`).join(" · ")}</li>)}</ul>
      <Button className="mt-4" size="sm" variant="outline" disabled={busy || data.auto === 0} onClick={() => { if (confirm(`Undo all ${data.auto} automatic acceptances?`)) act(async () => { const r = await revoke({ data: { rule: data.rule } }); setMsg(`${r.revoked} automatic acceptances undone.`); }); }}>Undo all automatic acceptances</Button>
    </details>
  </section>;
}
