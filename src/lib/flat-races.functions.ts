import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { hasDiscoverableLink } from "@/lib/link-trust";
import { DISCOVERY_EVENT_COLUMNS, UK_BOUNDS_OR_NULL } from "@/lib/events-query";
import { isFlatCourseValue } from "@/lib/flat-course";

export type FlatRace = {
  id: string; slug: string; name: string; date_raw: string | null; sort_date: string | null;
  town: string | null; county: string | null; region: string | null;
  entry_url: string | null; organiser_url: string | null;
  is_featured: boolean | null; date_is_estimated: boolean | null; is_recurring: boolean | null;
  courseProfile: string;
};

/** Upcoming half marathons whose accepted organiser-sourced course profile says flat. */
export const getFlatHalfMarathons = createServerFn({ method: "GET" }).handler(async (): Promise<{ events: FlatRace[] }> => {
  const db = supabaseAdmin;
  const rows: { id: string; slug: string; raw_value: string }[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const r = await db.from("race_research_assertions").select("id, slug, raw_value").eq("field", "course_profile").order("id").range(from, from + 999);
    if (r.error) throw new Error("Couldn't load course details");
    rows.push(...((r.data ?? []) as typeof rows));
    if ((r.data ?? []).length < 1000) break;
  }
  const flat = rows.filter((r) => isFlatCourseValue(r.raw_value));
  if (!flat.length) return { events: [] };

  const latest = new Map<string, string>();
  for (let i = 0; i < flat.length; i += 200) {
    const r = await db.from("race_research_fact_reviews").select("assertion_id, action")
      .in("assertion_id", flat.slice(i, i + 200).map((f) => f.id))
      .order("created_at", { ascending: true }).order("id", { ascending: true }).limit(10000);
    for (const x of r.data ?? []) latest.set(x.assertion_id as string, x.action as string);
  }
  const profileBySlug = new Map<string, string>();
  for (const f of flat) {
    const a = latest.get(f.id);
    if (a === "accept" || a === "auto_accept") profileBySlug.set(f.slug, f.raw_value);
  }
  const slugs = [...profileBySlug.keys()];
  const today = new Date().toISOString().slice(0, 10);
  const out: FlatRace[] = [];
  for (let i = 0; i < slugs.length; i += 200) {
    const r = await db.from("events_public_v1").select(DISCOVERY_EVENT_COLUMNS)
      .in("slug", slugs.slice(i, i + 200))
      .contains("distance_tags", ["half-marathon"])
      .gte("sort_date", today)
      .or(UK_BOUNDS_OR_NULL);
    if (r.error) throw new Error("Couldn't load races");
    for (const e of (r.data ?? []) as unknown as (FlatRace & { governance: string | null })[]) {
      if (!e.slug || !hasDiscoverableLink(e.entry_url, e.organiser_url, e.governance, e)) continue;
      out.push({
        id: e.id, slug: e.slug, name: e.name, date_raw: e.date_raw, sort_date: e.sort_date,
        town: e.town, county: e.county, region: e.region, entry_url: e.entry_url, organiser_url: e.organiser_url,
        is_featured: e.is_featured, date_is_estimated: e.date_is_estimated, is_recurring: e.is_recurring,
        courseProfile: profileBySlug.get(e.slug)!,
      });
    }
  }
  out.sort((a, b) => (a.sort_date ?? "").localeCompare(b.sort_date ?? ""));
  return { events: out };
});
