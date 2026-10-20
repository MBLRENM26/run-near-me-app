import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { researchOverview } from "@/lib/rich-race-research.functions";

export const Route = createFileRoute("/_adminShell/admin/fact-preview")({
  head: () => ({ meta: [{ title: "Race facts mock-up — RENM admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: FactPreview,
});

type Fact = { slug: string; field: string; value: string; auto: boolean };

const GROUPS: { title: string; fields: [string, string][] }[] = [
  { title: "On the day", fields: [["start_time", "Start time"], ["cut_off", "Cut-off"], ["min_age", "Minimum age"], ["chip_timed", "Chip timed"], ["ugr_licence", "Race licence"]] },
  { title: "The course", fields: [["course_profile", "Profile"], ["total_climb_m", "Total climb"], ["surface", "Surface"], ["laps", "Laps"]] },
  { title: "Who can run", fields: [["wheelchair_friendly", "Wheelchairs"], ["buggy_friendly", "Buggies"], ["dogs_allowed", "Dogs"], ["canicross", "Canicross"]] },
  { title: "Getting there", fields: [["parking", "Parking"], ["public_transport", "Public transport"]] },
];

function show(field: string, v: string) {
  const t = v.trim().toLowerCase();
  if (["true", "yes"].includes(t)) return field === "chip_timed" ? "Yes" : "Allowed";
  if (["false", "no"].includes(t)) return field === "chip_timed" ? "No" : "Not allowed";
  if (field === "total_climb_m" && /^\d+(\.\d+)?$/.test(t)) return `${v} m`;
  return v;
}

const pretty = (slug: string) => slug.replace(/-\d{4}-\d{2}-\d{2}$/, "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function FactPreview() {
  const [facts, setFacts] = useState<Fact[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  useEffect(() => {
    researchOverview().then((r) => setFacts(r.accepted)).catch((e) => setErr(String(e?.message ?? e)));
  }, []);
  const bySlug = useMemo(() => {
    const m = new Map<string, Map<string, string>>();
    for (const f of facts ?? []) {
      if (!m.has(f.slug)) m.set(f.slug, new Map());
      const cur = m.get(f.slug)!;
      cur.set(f.field, cur.has(f.field) && cur.get(f.field) !== f.value ? `${cur.get(f.field)}; ${f.value}` : f.value);
    }
    return m;
  }, [facts]);
  const slugs = useMemo(() => [...bySlug.keys()].sort((a, b) => (bySlug.get(b)!.size - bySlug.get(a)!.size) || a.localeCompare(b)), [bySlug]);
  const current = slug || slugs[0] || "";
  const row = bySlug.get(current);

  if (err) return <p className="p-6 text-destructive">{err}</p>;
  if (!facts) return <p className="p-6 text-muted-foreground">Loading accepted facts…</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="rounded-md border border-border bg-muted p-4 text-sm">
        <strong>Mock-up only.</strong> This shows how accepted research could look on a public race page. Nothing here is live. {slugs.length} races have accepted facts.
      </div>
      <label className="block text-sm font-medium">
        Race
        <select className="mt-1 block w-full rounded-md border border-input bg-background p-2" value={current} onChange={(e) => setSlug(e.target.value)}>
          {slugs.map((s) => <option key={s} value={s}>{pretty(s)} ({bySlug.get(s)!.size} facts)</option>)}
        </select>
      </label>

      {row && (
        <article className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">On the race page, below the date and location</p>
          <h2 className="mt-1 text-2xl font-bold">Race facts</h2>
          <p className="mt-1 text-sm text-muted-foreground">From the race's own website — worth a quick check before you travel.</p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {GROUPS.map((g) => {
              const items = g.fields.filter(([k]) => row.has(k));
              if (!items.length) return null;
              return (
                <section key={g.title}>
                  <h3 className="mb-2 text-sm font-semibold">{g.title}</h3>
                  <dl className="divide-y divide-border rounded-md border border-border">
                    {items.map(([k, label]) => (
                      <div key={k} className="flex justify-between gap-4 px-3 py-2 text-sm">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="text-right font-medium">{show(k, row.get(k)!)}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              );
            })}
          </div>
          <p className="mt-5 text-xs text-muted-foreground">Last checked from the organiser's website. Anything not listed hasn't been confirmed yet.</p>
        </article>
      )}
      <Link to="/admin/source-research" className="text-sm underline">Back to research</Link>
    </div>
  );
}
