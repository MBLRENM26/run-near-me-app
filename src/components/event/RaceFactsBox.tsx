import { useState } from "react";
import { Link } from "@tanstack/react-router";

/** Short, at-a-glance facts shown as stat badges across the top. */
const BADGE_FIELDS: [string, string][] = [
  ["start_time", "Start"],
  ["cut_off", "Cut-off"],
  ["min_age", "Min age"],
  ["chip_timed", "Chip timed"],
  ["ugr_licence", "Licence"],
  ["total_climb_m", "Climb"],
  ["surface", "Surface"],
  ["laps", "Laps"],
];

/** Longer, descriptive facts grouped into short briefing sections. */
const PROSE_GROUPS: { title: string; fields: [string, string][] }[] = [
  { title: "The course", fields: [["course_profile", "Course"]] },
  {
    title: "Who can run",
    fields: [
      ["wheelchair_friendly", "Wheelchairs"],
      ["buggy_friendly", "Buggies"],
      ["dogs_allowed", "Dogs"],
      ["canicross", "Canicross"],
    ],
  },
  {
    title: "Getting there",
    fields: [
      ["parking", "Parking"],
      ["public_transport", "Public transport"],
    ],
  },
];

/** Values longer than this collapse behind a "Read more" toggle. */
const LONG_VALUE_CHARS = 160;

function show(field: string, v: string) {
  const t = v.trim().toLowerCase();
  if (["true", "yes"].includes(t)) return field === "chip_timed" ? "Yes" : "Allowed";
  if (["false", "no"].includes(t)) return field === "chip_timed" ? "No" : "Not allowed";
  if (field === "total_climb_m" && /^\d+(\.\d+)?$/.test(t)) return `${v} m`;
  const pretty = v.replace(/_/g, " ").trim();
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
}

export function formatLastChecked(iso: string): string {
  return iso ? iso.slice(0, 10).split("-").reverse().join("/") : "";
}

function ProseFact({ field, label, value }: { field: string; label: string; value: string }) {
  const text = show(field, value);
  const isLong = text.length > LONG_VALUE_CHARS;
  const [expanded, setExpanded] = useState(false);
  return (
    <p className="text-sm leading-relaxed text-foreground">
      <span className="font-medium">{label}: </span>
      <span className={isLong && !expanded ? "line-clamp-3" : undefined}>{text}</span>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((x) => !x)}
          className="ml-1 font-medium text-primary hover:underline"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </p>
  );
}

/** Race facts data as loaded by the event page loader (server-side, accepted facts only). */
export type RaceFactsProps = { facts: { field: string; value: string }[]; lastChecked: string };

/** Renders the race details briefing only when the race has accepted facts; null otherwise. */
export function RaceFactsSection({ facts }: { facts: RaceFactsProps }) {
  if (!facts.facts.length) return null;
  const row = new Map<string, string>();
  for (const f of facts.facts) {
    row.set(f.field, row.has(f.field) && row.get(f.field) !== f.value ? `${row.get(f.field)}; ${f.value}` : f.value);
  }

  const badges = BADGE_FIELDS.filter(([k]) => row.has(k));
  const groups = PROSE_GROUPS.map((g) => ({
    ...g,
    items: g.fields.filter(([k]) => row.has(k)),
  })).filter((g) => g.items.length);

  return (
    <section className="mt-6">
      <p className="text-sm text-muted-foreground">What you need to know</p>
      <h2 className="mt-1 text-2xl font-bold text-foreground">Race details</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Look out for announcements about changes, updates or amendments to this event.
      </p>

      {badges.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {badges.map(([k, label]) => (
            <li
              key={k}
              className="rounded-full border border-border bg-muted px-3 py-1 text-sm"
            >
              <span className="text-muted-foreground">{label}: </span>
              <span className="font-medium text-foreground">{show(k, row.get(k)!)}</span>
            </li>
          ))}
        </ul>
      )}

      {groups.map((g) => (
        <div key={g.title} className="mt-5">
          <h3 className="mb-1.5 text-sm font-semibold text-foreground">{g.title}</h3>
          <div className="space-y-1.5">
            {g.items.map(([k, label]) => (
              <ProseFact key={k} field={k} label={label} value={row.get(k)!} />
            ))}
          </div>
        </div>
      ))}
    </section>
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
