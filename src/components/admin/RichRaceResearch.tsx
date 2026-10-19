import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { importRichRaceResearch, listRichRaceResearch, reviewRichRaceFact } from "@/lib/rich-race-research.functions";

export function RichRaceResearch() {
  const list = useServerFn(listRichRaceResearch), ingest = useServerFn(importRichRaceResearch), review = useServerFn(reviewRichRaceFact);
  const qc = useQueryClient();
  const { data, error } = useQuery({ queryKey: ["rich-race-research"], queryFn: () => list(), retry: false });
  const [facts, setFacts] = useState<File | null>(null), [evidence, setEvidence] = useState<File | null>(null);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  async function act(fn: () => Promise<unknown>) {
    setBusy(true); setMessage("");
    try { await fn(); await qc.invalidateQueries({ queryKey: ["rich-race-research"] }); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Could not save research"); }
    finally { setBusy(false); }
  }
  const grouped = new Map<string, NonNullable<typeof data>["rows"]>();
  for (const row of data?.rows ?? []) {
    if (search && !row.slug.toLowerCase().includes(search.toLowerCase())) continue;
    const rows = grouped.get(row.slug) ?? []; rows.push(row); grouped.set(row.slug, rows);
  }
  return <section aria-labelledby="rich-research-heading" className="space-y-4 border-t border-border pt-6">
    <h2 id="rich-research-heading" className="text-xl font-semibold">Race facts — awaiting review</h2>
    <details className="border border-border rounded p-4">
      <summary>Import race-facts CSVs</summary>
      <div className="my-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Race facts CSV<input aria-label="Race facts CSV" type="file" accept=".csv" className="block w-full mt-1" onChange={(e) => setFacts(e.target.files?.[0] ?? null)} /></label>
        <label className="text-sm">Fact evidence CSV<input aria-label="Fact evidence CSV" type="file" accept=".csv" className="block w-full mt-1" onChange={(e) => setEvidence(e.target.files?.[0] ?? null)} /></label>
      </div>
      <Button disabled={busy || !facts || !evidence} onClick={() => act(async () => {
        if (!facts || !evidence) return;
        const result = await ingest({ data: { factsCsv: await facts.text(), evidenceCsv: await evidence.text() } });
        setMessage(`${result.count} assertions staged privately.`);
      })}>Stage race facts</Button>
    </details>
    {(message || error) && <p role="status" className="text-sm">{message || error?.message}</p>}
    {data?.batch && <>
      <p className="text-sm text-muted-foreground">{data.batch.assertion_count} assertions · {new Set(data.rows.map((r) => r.slug)).size} races · not published</p>
      <p className="text-sm text-muted-foreground">{data.batch.limitations}</p>
      <label className="block text-sm">Find race<input aria-label="Find researched race" value={search} onChange={(e) => setSearch(e.target.value)} className="block mt-1 w-full rounded border border-border bg-background p-2" /></label>
      {[...grouped].map(([slug, rows]) => <details key={slug} className="rounded border border-border p-4">
        <summary className="font-medium break-words">{slug.replaceAll("-", " ")} · {rows.length} facts</summary>
        <div className="mt-4 space-y-5">{rows.map((row) => {
          const latest = data.reviews.find((r) => r.assertion_id === row.id);
          return <article key={row.id} className="border-t border-border pt-4 space-y-2">
            <h3 className="font-semibold">{row.field.replaceAll("_", " ")} <span className="font-normal">— {row.raw_value}</span></h3>
            <p className="text-xs text-muted-foreground">{row.match_state.replaceAll("_", " ")} · Researcher: {row.researcher_confidence} · Checked {row.checked_at}</p>
            <blockquote className="border-l-2 border-border pl-3 text-sm">“{row.evidence_quote}”</blockquote>
            <a href={row.source_url} target="_blank" rel="noreferrer" className="text-sm text-primary underline break-all">Source evidence</a>
            {Array.isArray(row.caveats) && <ul className="text-sm text-muted-foreground list-disc pl-5">{row.caveats.map((c, i) => <li key={i}>{String(c)}</li>)}</ul>}
            {latest && <p className="text-sm">Review: {latest.action} — {latest.note}</p>}
            <label className="block text-sm">Review note<input aria-label={`Review note ${row.id}`} className="mt-1 block w-full rounded border border-border bg-background p-2" value={notes[row.id] ?? ""} onChange={(e) => setNotes({ ...notes, [row.id]: e.target.value })} /></label>
            <div className="flex flex-wrap gap-2">{(["hold", "reject", "reopen"] as const).map((action) => <Button key={action} variant="outline" size="sm" disabled={busy || !notes[row.id]?.trim()} onClick={() => act(() => review({ data: { id: row.id, action, note: notes[row.id] } }))}>{action === "hold" ? "Hold for checking" : action === "reject" ? "Reject assertion" : "Reopen review"}</Button>)}</div>
          </article>;
        })}</div>
      </details>)}
    </>}
  </section>;
}