import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { importRichRaceResearch, listRichRaceResearch, reviewRichRaceFact } from "@/lib/rich-race-research.functions";
import { richRaceFields } from "@/lib/rich-race-research";

type View = "all" | "flagged" | "upcoming" | "unresolved";

export function RichRaceResearch() {
  const list = useServerFn(listRichRaceResearch), ingest = useServerFn(importRichRaceResearch), review = useServerFn(reviewRichRaceFact);
  const qc = useQueryClient();
  const [batchId, setBatchId] = useState<string | undefined>();
  const [view, setView] = useState<View>("all");
  const [field, setField] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const filters = { batchId, view, field: field || undefined, search: search || undefined, offset };
  const { data, error } = useQuery({ queryKey: ["rich-race-research", filters], queryFn: () => list({ data: filters }), retry: false });
  const [facts, setFacts] = useState<File | null>(null), [evidence, setEvidence] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  async function act(fn: () => Promise<unknown>) {
    setBusy(true); setMessage("");
    try { await fn(); await qc.invalidateQueries({ queryKey: ["rich-race-research"] }); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Could not save research"); }
    finally { setBusy(false); }
  }
  const grouped = new Map<string, NonNullable<typeof data>["rows"]>();
  for (const row of data?.rows ?? []) { const rows = grouped.get(row.slug) ?? []; rows.push(row); grouped.set(row.slug, rows); }
  const reset = () => setOffset(0);
  return <section aria-labelledby="rich-research-heading" className="space-y-4 border-t border-border pt-6">
    <h2 id="rich-research-heading" className="text-xl font-semibold">Race facts — awaiting review</h2>
    <details className="border border-border rounded p-4">
      <summary>Import race-facts CSVs</summary>
      <div className="my-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Race facts CSV<input aria-label="Race facts CSV" type="file" accept=".csv" className="block w-full mt-1" onChange={(e) => setFacts(e.target.files?.[0] ?? null)} /></label>
        <label className="text-sm">Fact evidence CSV<input aria-label="Fact evidence CSV" type="file" accept=".csv" className="block w-full mt-1" onChange={(e) => setEvidence(e.target.files?.[0] ?? null)} /></label>
      </div>
      <label className="block text-sm mb-3">Batch limitations (optional)<input aria-label="Batch limitations" value={note} onChange={(e) => setNote(e.target.value)} className="block mt-1 w-full rounded border border-border bg-background p-2" /></label>
      <Button disabled={busy || !facts || !evidence} onClick={() => act(async () => {
        if (!facts || !evidence) return;
        const result = await ingest({ data: { factsCsv: await facts.text(), evidenceCsv: await evidence.text(), note: note || undefined } });
        setBatchId(result.batchId); reset();
        setMessage(`${result.count} assertions staged privately (${result.quarantined} flagged).`);
      })}>{busy ? "Staging…" : "Stage race facts"}</Button>
    </details>
    {(message || error) && <p role="status" className="text-sm">{message || error?.message}</p>}
    {data?.batch && data.stats && <>
      {data.batches.length > 1 && <label className="block text-sm">Research batch<select aria-label="Research batch" className="block mt-1 rounded border border-border bg-background p-2" value={data.batch.id} onChange={(e) => { setBatchId(e.target.value); reset(); }}>{data.batches.map((b) => <option key={b.id} value={b.id}>{b.label} · {b.assertion_count} facts</option>)}</select></label>}
      <p className="text-sm">{data.stats.races} races · {data.stats.assertions} facts · {data.stats.quarantined} flagged · {data.stats.unresolved} not matched to a race · not published</p>
      <p className="text-sm text-muted-foreground">{data.batch.limitations}</p>
      <div className="flex flex-wrap gap-2">{(["all", "upcoming", "flagged", "unresolved"] as const).map((v) => <Button key={v} size="sm" variant={view === v ? "default" : "outline"} onClick={() => { setView(v); reset(); }}>{v === "all" ? "All" : v === "upcoming" ? "Upcoming races" : v === "flagged" ? "Flagged" : "Not matched"}</Button>)}</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">Fact type<select aria-label="Fact type" value={field} onChange={(e) => { setField(e.target.value); reset(); }} className="block mt-1 w-full rounded border border-border bg-background p-2"><option value="">All facts</option>{richRaceFields.map((f) => <option key={f} value={f}>{f.replaceAll("_", " ")}</option>)}</select></label>
        <label className="block text-sm">Find race<input aria-label="Find researched race" value={search} onChange={(e) => { setSearch(e.target.value); reset(); }} className="block mt-1 w-full rounded border border-border bg-background p-2" /></label>
      </div>
      <p className="text-sm text-muted-foreground">Showing {data.total ? offset + 1 : 0}–{Math.min(offset + 200, data.total)} of {data.total} facts</p>
      {[...grouped].map(([slug, rows]) => <details key={slug} className="rounded border border-border p-4">
        <summary className="font-medium break-words">{slug.replaceAll("-", " ")} · {rows.length} facts{rows.some((r) => r.match_state === "quarantined") ? " · flagged" : ""}</summary>
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
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 200))}>Previous</Button>
        <Button variant="outline" size="sm" disabled={offset + 200 >= data.total} onClick={() => setOffset(offset + 200)}>Next</Button>
      </div>
    </>}
  </section>;
}
