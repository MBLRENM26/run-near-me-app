import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { raceFactsPreview } from "@/lib/rich-race-research.functions";

export const FACT_GROUPS: { title: string; fields: [string, string][] }[] = [
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

export function RaceFactsBox({ row, lastCheckedText }: { row: Map<string, string>; lastCheckedText: string }) {
  return (
    <article className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
      <p className="text-sm text-muted-foreground">What you need to know</p>
      <h2 className="mt-1 text-2xl font-bold">Race details</h2>
      <p className="mt-1 text-sm text-muted-foreground">Look out for announcements about changes, updates or amendments to this event.</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {FACT_GROUPS.map((g) => {
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
      {lastCheckedText && <p className="mt-5 text-xs text-muted-foreground">Data last checked {lastCheckedText}.</p>}
    </article>
  );
}

export function RaceFactsContactLine() {
  return (
    <p className="text-sm text-muted-foreground">
      We will add further updates when available.{" "}
      <Link to="/contact" className="underline text-foreground">Contact us</Link> if you have more information about this event.
    </p>
  );
}

/** Admin-only preview: active only with ?preview=facts and a valid admin session. */
function usePreviewFacts(slug: string) {
  const [data, setData] = useState<{ row: Map<string, string>; last: string } | { error: string } | null>(null);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("preview") !== "facts") return;
    raceFactsPreview({ data: { slug } })
      .then((r) => {
        if (!r.authorized) { setData({ error: "Sign in to admin first, then reload this page." }); return; }
        if (!r.facts.length) { setData({ error: "No accepted facts for this race yet." }); return; }
        const row = new Map<string, string>();
        for (const f of r.facts) row.set(f.field, row.has(f.field) && row.get(f.field) !== f.value ? `${row.get(f.field)}; ${f.value}` : f.value);
        setData({ row, last: r.lastChecked ? r.lastChecked.slice(0, 10).split("-").reverse().join("/") : "" });
      })
      .catch(() => setData({ error: "Preview needs you signed in to admin in this tab." }));
  }, [slug]);
  return data;
}

export function PreviewRaceFacts({ slug }: { slug: string }) {
  const d = usePreviewFacts(slug);
  if (!d) return null;
  if ("error" in d) return <p className="mt-6 rounded-md border border-border bg-muted p-3 text-sm">Race details preview: {d.error}</p>;
  return <div className="mt-6"><RaceFactsBox row={d.row} lastCheckedText={d.last} /></div>;
}

export function PreviewRaceFactsContact({ slug }: { slug: string }) {
  const d = usePreviewFacts(slug);
  if (!d || "error" in d) return null;
  return <div className="mt-8"><RaceFactsContactLine /></div>;
}
