import { Link } from "@tanstack/react-router";

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

export function formatLastChecked(iso: string): string {
  return iso ? iso.slice(0, 10).split("-").reverse().join("/") : "";
}

export function RaceFactsBox({ row }: { row: Map<string, string> }) {
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

/** Race facts data as loaded by the event page loader (server-side, accepted facts only). */
export type RaceFactsProps = { facts: { field: string; value: string }[]; lastChecked: string };

/** Renders the race details box only when the race has accepted facts; null otherwise. */
export function RaceFactsSection({ facts }: { facts: RaceFactsProps }) {
  if (!facts.facts.length) return null;
  const row = new Map<string, string>();
  for (const f of facts.facts) row.set(f.field, row.has(f.field) && row.get(f.field) !== f.value ? `${row.get(f.field)}; ${f.value}` : f.value);
  return <div className="mt-6"><RaceFactsBox row={row} /></div>;
}
