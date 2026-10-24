// Pure helpers that turn checked race facts into short search-result snippets.
// Rule: no checked fact → no claim. Only restate organiser-quoted facts.

export type SnippetFact = { field: string; value: string };

const clean = (v: string) => v.replace(/_/g, " ").replace(/\s+/g, " ").trim();

/** Strict HH:MM start time, or null when the fact is prose/ambiguous. */
export function cleanStartTime(facts: SnippetFact[]): string | null {
  const f = facts.find((x) => x.field === "start_time");
  if (!f) return null;
  const m = f.value.trim().match(/^(\d{1,2})[:.](\d{2})(?:\s*(am|pm))?$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const ap = m[3]?.toLowerCase();
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  if (h > 23 || Number(m[2]) > 59) return null;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

const yes = (v: string) => /^(yes|true|y)$/i.test(v.trim());

/** Up to `max` short highlight phrases, in priority order. */
export function factHighlights(facts: SnippetFact[], max = 3): string[] {
  const get = (k: string) => facts.find((x) => x.field === k)?.value?.trim() ?? "";
  const out: string[] = [];
  const t = cleanStartTime(facts);
  if (t) out.push(`${t} start`);
  const surface = clean(get("surface"));
  if (surface && surface.length <= 20) out.push(`${surface.toLowerCase()} course`);
  const climb = get("total_climb_m").match(/^\d+$/)?.[0];
  if (climb) out.push(`${climb} m climb`);
  if (yes(get("chip_timed"))) out.push("chip timed");
  if (yes(get("buggy_friendly"))) out.push("buggies welcome");
  if (yes(get("dogs_allowed"))) out.push("dogs welcome");
  if (get("parking") && get("parking").length > 0) out.push("parking info");
  return out.slice(0, max);
}

/** Description for an upcoming race; never claims a fact we don't hold. */
export function buildUpcomingDescription(opts: {
  name: string;
  distance: string;
  loc: string;
  when: string; // e.g. " on Sunday 7 February 2027"
  facts: SnippetFact[];
}): string {
  const lead = `${opts.name}: ${opts.distance} race${opts.loc ? ` in ${opts.loc}` : ""}${opts.when}.`;
  const hl = factHighlights(opts.facts, 4);
  const tail = hl.length
    ? `${hl.join(", ").replace(/^./, (c) => c.toUpperCase())}. Course and travel details inside.`
    : "Date, distance and location, plus similar races nearby.";
  const full = `${lead} ${tail}`;
  if (full.length <= 160) return full;
  return lead.length <= 160 ? lead : `${lead.slice(0, 157).replace(/\s+\S*$/, "")}…`;
}

/** Title: appends one checked highlight when it fits within 60 chars. */
export function enrichTitle(title: string, facts: SnippetFact[]): string {
  const hl = factHighlights(facts, 1)[0];
  if (!hl) return title;
  const t = `${title}, ${hl}`;
  return t.length <= 60 ? t : title;
}
