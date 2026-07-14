import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isAdminAuthenticated } from "@/lib/admin-session.server";
import { REGIONS } from "@/lib/regions";
import {
  DISTANCE_TAG_VALUES,
  TERRAIN_TAG_VALUES,
  parseEventTags,
  type DistanceTag,
  type TerrainTag,
} from "@/lib/event-tags";

const STATUS_VALUES = ["ACTIVE", "DUPLICATE", "EXPIRED"] as const;
export type EventStatus = (typeof STATUS_VALUES)[number];

const REGION_NAMES = REGIONS.map((r) => r.name);

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function requireAdminOrThrow() {
  if (!isAdminAuthenticated()) {
    throw new Error("Unauthorized");
  }
}

// ---- Types ----

export interface AdminEventListRow {
  id: string;
  name: string;
  slug: string | null;
  sort_date: string | null;
  date_raw: string | null;
  town: string | null;
  region: string | null;
  distances: string | null;
  status: string;
  source: string | null;
  is_featured: boolean;
  is_upcoming: boolean;
  date_is_estimated: boolean;
  lat: number | null;
  lng: number | null;
  created_at: string;
  distance_tags: string[];
  terrain_tags: string[];
  is_curated_tags: boolean;
}

export interface AdminEventFull extends AdminEventListRow {
  county: string | null;
  country: string | null;
  location_raw: string | null;
  date_from: string | null;
  date_to: string | null;
  is_recurring: boolean;
  discipline: string | null;
  entry_fee: string | null;
  organiser: string | null;
  entry_url: string | null;
  organiser_url: string | null;
  source_url: string | null;
  licensed: string | null;
  duplicate_of: string | null;
  norm_id: string | null;
  norm_created_at: string | null;
}

// ---- Schemas ----

const nullableString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "" ? null : v));

const eventPatchSchema = z.object({
  name: z.string().trim().min(1).max(300).optional(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(SLUG_RE, "slug must be kebab-case (a-z0-9-)")
    .optional(),
  date_raw: nullableString(200),
  sort_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD")
    .nullable()
    .optional(),
  date_from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD")
    .nullable()
    .optional(),
  date_to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD")
    .nullable()
    .optional(),
  date_is_estimated: z.boolean().optional(),
  is_recurring: z.boolean().optional(),
  is_upcoming: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  town: nullableString(200),
  county: nullableString(200),
  region: z
    .string()
    .trim()
    .nullable()
    .optional()
    .refine(
      (v) => v == null || v === "" || REGION_NAMES.includes(v),
      "region must be one of the canonical UK regions",
    )
    .transform((v) => (v === undefined ? undefined : v === "" ? null : v)),
  country: nullableString(100),
  location_raw: nullableString(500),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  distances: nullableString(500),
  discipline: nullableString(100),
  entry_fee: nullableString(200),
  organiser: nullableString(300),
  entry_url: nullableString(1000),
  organiser_url: nullableString(1000),
  source: nullableString(100),
  source_url: nullableString(1000),
  licensed: nullableString(50),
  status: z.enum(STATUS_VALUES).optional(),
  duplicate_of: z.string().uuid().nullable().optional(),
  distance_tags: z.array(z.enum(DISTANCE_TAG_VALUES)).optional(),
  terrain_tags: z.array(z.enum(TERRAIN_TAG_VALUES)).optional(),
  is_curated_tags: z.boolean().optional(),
});

const eventCreateSchema = eventPatchSchema.extend({
  name: z.string().trim().min(1).max(300),
});

export type AdminEventCreateInput = z.infer<typeof eventCreateSchema>;

// ---- List ----

export const listAdminEvents = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        q: z.string().trim().max(200).optional(),
        region: z.string().trim().max(100).optional(),
        status: z.enum([...STATUS_VALUES, "ANY"]).optional(),
        source: z.string().trim().max(100).optional(),
        missing_coords: z.boolean().optional(),
        missing_town: z.boolean().optional(),
        missing_distances: z.boolean().optional(),
        missing_date: z.boolean().optional(),
        missing_terrain_tags: z.boolean().optional(),
        incomplete_any: z.boolean().optional(),
        upcoming_only: z.boolean().optional(),
        region_invalid: z.boolean().optional(),
        sort: z.enum(["sort_date", "name", "created_at"]).default("sort_date"),
        sort_dir: z.enum(["asc", "desc"]).default("asc"),
        limit: z.number().int().min(1).max(200).default(50),
        offset: z.number().int().min(0).default(0),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    requireAdminOrThrow();

    let query = supabaseAdmin
      .from("events")
      .select(
        "id,name,slug,sort_date,date_raw,town,region,distances,status,source,is_featured,is_upcoming,date_is_estimated,lat,lng,created_at,distance_tags,terrain_tags,is_curated_tags",
        { count: "exact" },
      );

    if (data.q) {
      const like = `%${data.q.replace(/[%_]/g, "")}%`;
      query = query.or(`name.ilike.${like},slug.ilike.${like},town.ilike.${like}`);
    }
    if (data.region) query = query.eq("region", data.region);
    if (data.status && data.status !== "ANY")
      query = query.eq("status", data.status);
    if (data.source) query = query.eq("source", data.source);
    if (data.missing_coords) query = query.is("lat", null);
    if (data.upcoming_only) query = query.eq("is_upcoming", true);

    // "Missing" predicates: NULL OR blank OR contains TBC (case-insensitive)
    const TOWN_MISSING = "town.is.null,town.eq.,town.ilike.%tbc%";
    const DIST_MISSING = "distances.is.null,distances.eq.,distances.ilike.%tbc%";
    const DATE_MISSING = "sort_date.is.null,date_raw.ilike.%tbc%";

    if (data.missing_town) query = query.or(TOWN_MISSING);
    if (data.missing_distances) query = query.or(DIST_MISSING);
    if (data.missing_date) {
      // Parkruns are weekly recurring and don't carry a sort_date — exclude
      // them from the "needs a date" backlog so the count reflects real
      // one-off races that genuinely need sourcing.
      query = query.or(DATE_MISSING).not("name", "ilike", "%parkrun%");
    }
    if (data.missing_terrain_tags)
      query = query.filter("terrain_tags", "eq", "{}");
    if (data.incomplete_any) {
      query = query.or(
        [
          TOWN_MISSING,
          DIST_MISSING,
          DATE_MISSING,
          "lat.is.null",
          "region.is.null",
          "terrain_tags.eq.{}",
        ].join(","),
      );
    }

    if (data.region_invalid) {
      // Region not in canonical list AND not null
      query = query
        .not("region", "is", null)
        .not("region", "in", `(${REGION_NAMES.map((r) => `"${r}"`).join(",")})`);
    }

    query = query
      .order(data.sort, { ascending: data.sort_dir === "asc", nullsFirst: false })
      .range(data.offset, data.offset + data.limit - 1);

    const { data: rows, count, error } = await query;
    if (error) throw new Error(error.message);

    return {
      rows: (rows ?? []) as AdminEventListRow[],
      total: count ?? 0,
    };
  });

// ---- Get ----

export const createAdminEvent = createServerFn({ method: "POST" })
  .inputValidator((d) => eventCreateSchema.parse(d))
  .handler(async ({ data }) => {
    requireAdminOrThrow();

    const hasLat = data.lat !== undefined ? data.lat !== null : null;
    const hasLng = data.lng !== undefined ? data.lng !== null : null;
    if (hasLat !== null && hasLng !== null && hasLat !== hasLng) {
      throw new Error("lat and lng must both be set or both be cleared");
    }

    const slugify = (input: string) =>
      input
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 180);

    const slugExists = async (slug: string) => {
      const { data: clash, error } = await supabaseAdmin
        .from("events")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return Boolean(clash);
    };

    let slug = data.slug;
    if (slug) {
      if (await slugExists(slug)) throw new Error(`Slug "${slug}" is already in use`);
    } else {
      const stem = slugify(`${data.name} ${data.sort_date ?? data.date_from ?? ""}`) || "event";
      slug = stem;
      let suffix = 1;
      while (await slugExists(slug)) {
        suffix += 1;
        slug = `${stem}-${suffix}`;
        if (suffix > 50) slug = `${stem}-${Date.now()}`;
      }
    }

    const provided = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    );

    const insertPayload = {
      ...provided,
      name: data.name,
      slug,
      status: data.status ?? "EXPIRED",
      source: data.source ?? "manual",
      date_raw: data.date_raw === undefined ? data.sort_date ?? data.date_from ?? null : data.date_raw,
      date_from: data.date_from === undefined ? data.sort_date ?? null : data.date_from,
      date_to: data.date_to === undefined ? data.sort_date ?? null : data.date_to,
      is_upcoming: data.is_upcoming ?? false,
      is_featured: data.is_featured ?? false,
      is_recurring: data.is_recurring ?? false,
      date_is_estimated: data.date_is_estimated ?? false,
      distance_tags: data.distance_tags ?? [],
      terrain_tags: data.terrain_tags ?? [],
      is_curated_tags: data.is_curated_tags ?? true,
    };

    const { data: created, error } = await supabaseAdmin
      .from("events")
      .insert(insertPayload as never)
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Failed to create event");

    await supabaseAdmin.from("event_edits").insert({
      event_id: created.id,
      changes: { created: insertPayload } as never,
      note: "manual event created via admin",
    });

    return { ok: true as const, id: created.id as string, slug };
  });

export const getAdminEvent = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    requireAdminOrThrow();

    const { data: row, error } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Event not found");

    const { data: edits, error: editsErr } = await supabaseAdmin
      .from("event_edits")
      .select("id,edited_at,changes,note")
      .eq("event_id", data.id)
      .order("edited_at", { ascending: false })
      .limit(20);
    if (editsErr) throw new Error(editsErr.message);

    return {
      event: row as AdminEventFull,
      edits: edits ?? [],
    };
  });

// ---- Update ----

export const updateAdminEvent = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        patch: eventPatchSchema,
        note: z.string().trim().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    requireAdminOrThrow();

    // Slug uniqueness check
    if (data.patch.slug) {
      const { data: clash } = await supabaseAdmin
        .from("events")
        .select("id")
        .eq("slug", data.patch.slug)
        .neq("id", data.id)
        .maybeSingle();
      if (clash) throw new Error(`Slug "${data.patch.slug}" is already in use`);
    }

    // lat/lng paired
    const hasLat = data.patch.lat !== undefined ? data.patch.lat !== null : null;
    const hasLng = data.patch.lng !== undefined ? data.patch.lng !== null : null;
    if (hasLat !== null && hasLng !== null && hasLat !== hasLng) {
      throw new Error("lat and lng must both be set or both be cleared");
    }

    // Build patch object (drop undefined)
    const patchEntries = Object.entries(data.patch).filter(
      ([, v]) => v !== undefined,
    );
    if (patchEntries.length === 0) return { ok: true as const, changed: 0 };
    const patch = Object.fromEntries(patchEntries);

    // Fetch current row to compute diff
    const { data: before, error: beforeErr } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (beforeErr) throw new Error(beforeErr.message);
    if (!before) throw new Error("Event not found");

    const beforeRec = before as unknown as Record<string, unknown>;
    const diff: Record<string, { from: unknown; to: unknown }> = {};
    for (const [k, v] of patchEntries) {
      const prev = beforeRec[k];
      if (prev !== v) diff[k] = { from: prev, to: v };
    }
    if (Object.keys(diff).length === 0) return { ok: true as const, changed: 0 };

    const { error: updErr } = await supabaseAdmin
      .from("events")
      .update(patch as never)
      .eq("id", data.id);
    if (updErr) throw new Error(updErr.message);

    await supabaseAdmin.from("event_edits").insert({
      event_id: data.id,
      changes: diff as never,
      note: data.note ?? null,
    });

    return { ok: true as const, changed: Object.keys(diff).length };
  });

// ---- Delete (soft via status, hard for manual only) ----

export const setAdminEventStatus = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(STATUS_VALUES),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    requireAdminOrThrow();
    const { error } = await supabaseAdmin
      .from("events")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("event_edits").insert({
      event_id: data.id,
      changes: { status: { to: data.status } } as never,
      note: `status set via admin`,
    });
    return { ok: true };
  });

export const deleteAdminEvent = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    requireAdminOrThrow();
    const { data: row, error } = await supabaseAdmin
      .from("events")
      .select("source")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Event not found");
    if (row.source !== "manual") {
      throw new Error(
        "Hard delete is only allowed for manually-created events. Use status=EXPIRED or DUPLICATE to hide.",
      );
    }
    const { error: delErr } = await supabaseAdmin
      .from("events")
      .delete()
      .eq("id", data.id);
    if (delErr) throw new Error(delErr.message);
    return { ok: true };
  });

// ---- Distinct sources (for filter dropdown) ----

export const listAdminEventSources = createServerFn({ method: "GET" }).handler(
  async () => {
    requireAdminOrThrow();
    const { data, error } = await supabaseAdmin
      .from("events")
      .select("source")
      .not("source", "is", null);
    if (error) throw new Error(error.message);
    const set = new Set<string>();
    for (const r of data ?? []) {
      if (r.source) set.add(r.source);
    }
    return { sources: Array.from(set).sort() };
  },
);

// ---- Tag parser backfill ----
//
// Iterates every event row that is NOT manually curated, runs the tag parser,
// and writes distance_tags + terrain_tags. Idempotent: safe to re-run after
// the parser changes. Curated rows (is_curated_tags = true) are skipped so a
// human override is never clobbered.

export const backfillEventTags = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        // `force` is accepted for API compatibility but no longer changes
        // behaviour — the cursor walk visits every non-curated row exactly
        // once and `same` rows are always skipped at update time anyway.
        force: z.boolean().optional().default(false),
        limit: z.number().int().min(1).max(2000).default(1000),
        // Cursor: process rows with id > cursor, ordered by id. The client
        // loops, passing back next_cursor, until it's null. Previous
        // implementation filtered `terrain_tags = '{}'` and re-scanned the
        // same un-taggable rows on every iteration, never terminating
        // cleanly and leaving most rows unvisited.
        cursor: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    requireAdminOrThrow();

    let query = supabaseAdmin
      .from("events")
      .select("id,name,distances,discipline,distance_tags,terrain_tags")
      .eq("is_curated_tags", false)
      .order("id", { ascending: true })
      .limit(data.limit);

    if (data.cursor) query = query.gt("id", data.cursor);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    let updated = 0;
    let unchanged = 0;
    let lastId: string | null = null;
    for (const r of rows ?? []) {
      lastId = r.id as string;
      const parsed = parseEventTags({
        name: r.name as string | null,
        distances: r.distances as string | null,
        discipline: r.discipline as string | null,
      });
      const prevD = (r.distance_tags as string[] | null) ?? [];
      const prevT = (r.terrain_tags as string[] | null) ?? [];
      if (
        sameSet(prevD, parsed.distance_tags) &&
        sameSet(prevT, parsed.terrain_tags)
      ) {
        unchanged++;
        continue;
      }
      const { error: updErr } = await supabaseAdmin
        .from("events")
        .update({
          distance_tags: parsed.distance_tags as DistanceTag[],
          terrain_tags: parsed.terrain_tags as TerrainTag[],
        })
        .eq("id", r.id as string);
      if (updErr) throw new Error(updErr.message);
      updated++;
    }

    const done = (rows?.length ?? 0) < data.limit;

    return {
      scanned: rows?.length ?? 0,
      updated,
      unchanged,
      next_cursor: done ? null : lastId,
      remaining_hint: done
        ? null
        : "More rows remain — call again with next_cursor.",
    };
  });

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  for (const x of b) if (!set.has(x)) return false;
  return true;
}

// ---- Duplicate detection & merge ----
//
// Scraped sources occasionally produce two ACTIVE rows for the same race
// (different slug, slightly different name/date). Without dedupe, distance
// filters surface the lower-quality copy. This pair of fns powers an admin
// UI to find clusters and merge them.

export interface DuplicateRow {
  id: string;
  slug: string | null;
  name: string;
  date_raw: string | null;
  sort_date: string | null;
  region: string | null;
  town: string | null;
  distances: string | null;
  discipline: string | null;
  source: string | null;
  source_url: string | null;
  distance_tags: string[];
  terrain_tags: string[];
  is_recurring: boolean;
}

export type DuplicateConfidence = "high" | "medium" | "low";
export type DuplicateKind = "duplicate" | "series";

export interface DuplicateCluster {
  key: string;
  rows: DuplicateRow[];
  confidence: DuplicateConfidence;
  reason: string;
  kind: DuplicateKind;
}

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function monthOf(sortDate: string | null): string | null {
  if (!sortDate) return null;
  // sort_date is yyyy-mm-dd
  return sortDate.slice(0, 7);
}

function normTown(town: string | null): string | null {
  if (!town) return null;
  const t = town.trim().toLowerCase();
  return t.length ? t : null;
}

/**
 * Score a cluster from data on the rows. Conservative: any pair of rows with
 * conflicting populated dates or conflicting populated towns drops the whole
 * cluster to "low". Used to decide which clusters can be safely bulk-merged.
 */
function scoreCluster(rows: DuplicateRow[]): {
  confidence: DuplicateConfidence;
  reason: string;
} {
  const dates = rows.map((r) => r.sort_date);
  const months = rows.map((r) => monthOf(r.sort_date));
  const towns = rows.map((r) => normTown(r.town));
  const hosts = rows.map((r) => hostOf(r.source_url));

  const populatedDates = dates.filter((d): d is string => !!d);
  const populatedMonths = months.filter((m): m is string => !!m);
  const populatedTowns = towns.filter((t): t is string => !!t);
  const populatedHosts = hosts.filter((h): h is string => !!h);

  const allDatesEqual =
    populatedDates.length >= 2 &&
    populatedDates.every((d) => d === populatedDates[0]);
  const conflictingDates =
    new Set(populatedDates).size > 1 && populatedDates.length === rows.length;
  const allMonthsEqual =
    populatedMonths.length >= 2 &&
    new Set(populatedMonths).size === 1;
  const conflictingMonths =
    new Set(populatedMonths).size > 1 && populatedMonths.length === rows.length;
  const allTownsEqual =
    populatedTowns.length >= 2 && new Set(populatedTowns).size === 1;
  const conflictingTowns =
    new Set(populatedTowns).size > 1 && populatedTowns.length === rows.length;
  const sharedHost =
    populatedHosts.length >= 2 && new Set(populatedHosts).size === 1;

  if (conflictingDates || conflictingTowns) {
    return {
      confidence: "low",
      reason: conflictingTowns
        ? "Towns differ — likely a name collision, not a duplicate."
        : "Dates differ — likely a recurring series.",
    };
  }

  if (allDatesEqual) {
    return { confidence: "high", reason: "Identical sort_date." };
  }
  if (allMonthsEqual && allTownsEqual) {
    return {
      confidence: "high",
      reason: "Same month and town.",
    };
  }
  if (allMonthsEqual && sharedHost) {
    return {
      confidence: "high",
      reason: "Same month and same source host.",
    };
  }
  if (allMonthsEqual) {
    return { confidence: "medium", reason: "Same month, town unknown." };
  }
  if (conflictingMonths) {
    return {
      confidence: "low",
      reason: "Months differ — likely a recurring series.",
    };
  }
  return {
    confidence: "medium",
    reason: "Some dates missing — review before merging.",
  };
}

/**
 * Strip year tokens, trailing parentheticals, and noise so two scraped names
 * for the same race normalise to the same string. Tuned conservatively — a
 * false negative (cluster missed) is fine; a false positive (different
 * races merged) is expensive to unwind.
 */
function normaliseEventName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/\b(19|20)\d{2}\b/g, " ")
    .replace(/\b(spring|summer|autumn|fall|winter)\b/g, " ")
    .replace(/\b(the|a|an|race|run|running|event|events)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 1)
    .sort()
    .join(" ");
}

/**
 * A cluster is treated as a "recurring series" (not duplicates) when there
 * are 3+ rows in the same region with consistent town/distances, but their
 * dates are spread across multiple distinct days/months. Strong example:
 * RunThrough Tatton Park 5k, fortnightly, all from the same EA feed.
 */
function detectSeries(rows: DuplicateRow[]): boolean {
  if (rows.length < 3) return false;
  const towns = rows
    .map((r) => normTown(r.town))
    .filter((t): t is string => !!t);
  const townsConsistent =
    towns.length === 0 || new Set(towns).size === 1;
  if (!townsConsistent) return false;

  const dates = rows
    .map((r) => r.sort_date)
    .filter((d): d is string => !!d);
  const distinctDates = new Set(dates).size;
  const distinctMonths = new Set(
    dates.map((d) => d.slice(0, 7)),
  ).size;
  // Need at least 3 distinct dates OR 2+ distinct months — a single fixture
  // with two slightly-different scraped rows shouldn't trigger this.
  return distinctDates >= 3 || distinctMonths >= 2;
}

function seriesReason(rows: DuplicateRow[]): string {
  const sources = new Set(rows.map((r) => r.source).filter(Boolean));
  const dates = rows
    .map((r) => r.sort_date)
    .filter((d): d is string => !!d);
  const months = new Set(dates.map((d) => d.slice(0, 7))).size;
  const sourceNote =
    sources.size === 1 ? ` from ${[...sources][0]}` : "";
  return `Recurring series — ${rows.length} dates across ${months} month${months === 1 ? "" : "s"}${sourceNote}.`;
}


export const findPotentialDuplicates = createServerFn({ method: "GET" })
  .handler(async (): Promise<{ clusters: DuplicateCluster[]; total: number }> => {
    requireAdminOrThrow();

    const pageSize = 1000;
    const all: (DuplicateRow & { _norm: string })[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data: rows, error } = await supabaseAdmin
        .from("events")
        .select(
          "id, slug, name, date_raw, sort_date, region, town, distances, discipline, source, source_url, distance_tags, terrain_tags, is_recurring, series_key",
        )
        .eq("status", "ACTIVE")
        .eq("is_recurring", false)
        .is("series_key", null)
        .order("id", { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      if (!rows || rows.length === 0) break;
      for (const r of rows) {
        all.push({
          id: r.id as string,
          slug: (r.slug as string | null) ?? null,
          name: r.name as string,
          date_raw: (r.date_raw as string | null) ?? null,
          sort_date: (r.sort_date as string | null) ?? null,
          region: (r.region as string | null) ?? null,
          town: (r.town as string | null) ?? null,
          distances: (r.distances as string | null) ?? null,
          discipline: (r.discipline as string | null) ?? null,
          source: (r.source as string | null) ?? null,
          source_url: (r.source_url as string | null) ?? null,
          distance_tags: (r.distance_tags as string[] | null) ?? [],
          terrain_tags: (r.terrain_tags as string[] | null) ?? [],
          is_recurring: !!(r.is_recurring as boolean | null),
          _norm: normaliseEventName(r.name as string),
        });
      }
      if (rows.length < pageSize) break;
    }

    // Group by (normalised name + region). Empty norm is too noisy to cluster.
    const groups = new Map<string, (DuplicateRow & { _norm: string })[]>();
    for (const r of all) {
      if (!r._norm) continue;
      const key = `${r._norm}::${r.region ?? ""}`;
      const arr = groups.get(key) ?? [];
      arr.push(r);
      groups.set(key, arr);
    }

    const clusters: DuplicateCluster[] = [];
    for (const [key, rows] of groups) {
      if (rows.length < 2) continue;
      // Sort: rows with sort_date first, then most-complete tags — gives the
      // admin a sensible default survivor at the top of each cluster.
      rows.sort((a, b) => {
        const aHas = a.sort_date ? 1 : 0;
        const bHas = b.sort_date ? 1 : 0;
        if (aHas !== bHas) return bHas - aHas;
        const aTags = a.distance_tags.length + a.terrain_tags.length;
        const bTags = b.distance_tags.length + b.terrain_tags.length;
        return bTags - aTags;
      });
      const cleanRows = rows.map(({ _norm: _n, ...rest }) => {
        void _n;
        return rest;
      });
      const { confidence, reason } = scoreCluster(cleanRows);
      const kind = detectSeries(cleanRows) ? "series" : "duplicate";
      const finalReason =
        kind === "series"
          ? seriesReason(cleanRows)
          : reason;
      clusters.push({
        key,
        rows: cleanRows,
        confidence,
        reason: finalReason,
        kind,
      });
    }

    // Sort: series first (most actionable separately), then high → low,
    // then largest clusters within tier.
    const tierRank: Record<DuplicateConfidence, number> = {
      high: 0,
      medium: 1,
      low: 2,
    };
    clusters.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "series" ? -1 : 1;
      const t = tierRank[a.confidence] - tierRank[b.confidence];
      if (t !== 0) return t;
      return b.rows.length - a.rows.length;
    });
    return { clusters, total: clusters.length };
  });

export const mergeDuplicateEvents = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        survivorId: z.string().uuid(),
        duplicateId: z.string().uuid(),
        note: z.string().trim().max(500).optional(),
      })
      .refine((v) => v.survivorId !== v.duplicateId, {
        message: "survivor and duplicate must differ",
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    requireAdminOrThrow();

    const { data: rows, error } = await supabaseAdmin
      .from("events")
      .select(
        "id, slug, name, status, distance_tags, terrain_tags, is_curated_tags",
      )
      .in("id", [data.survivorId, data.duplicateId]);
    if (error) throw new Error(error.message);
    const survivor = rows?.find((r) => r.id === data.survivorId);
    const dupe = rows?.find((r) => r.id === data.duplicateId);
    if (!survivor) throw new Error("Survivor not found");
    if (!dupe) throw new Error("Duplicate not found");
    if (survivor.status !== "ACTIVE") {
      throw new Error("Survivor must be ACTIVE");
    }

    const survivorDT = (survivor.distance_tags as string[]) ?? [];
    const survivorTT = (survivor.terrain_tags as string[]) ?? [];
    const dupeDT = (dupe.distance_tags as string[]) ?? [];
    const dupeTT = (dupe.terrain_tags as string[]) ?? [];

    // Copy tags onto survivor only if survivor is empty AND dupe has any.
    // Never overwrite a curated survivor.
    const shouldCopyTags =
      !survivor.is_curated_tags &&
      survivorDT.length === 0 &&
      survivorTT.length === 0 &&
      (dupeDT.length > 0 || dupeTT.length > 0);

    if (shouldCopyTags) {
      const { error: upErr } = await supabaseAdmin
        .from("events")
        .update({ distance_tags: dupeDT, terrain_tags: dupeTT })
        .eq("id", data.survivorId);
      if (upErr) throw new Error(upErr.message);
    }

    const { error: dupErr } = await supabaseAdmin
      .from("events")
      .update({ status: "DUPLICATE", duplicate_of: data.survivorId })
      .eq("id", data.duplicateId);
    if (dupErr) throw new Error(dupErr.message);

    // Audit trail — getEventPageData already 301s from the dupe's slug to
    // the survivor's via duplicate_of; this records who merged what.
    await supabaseAdmin.from("event_edits").insert({
      event_id: data.duplicateId,
      changes: {
        action: "merge_duplicate",
        survivor_id: data.survivorId,
        survivor_slug: survivor.slug,
        duplicate_slug: dupe.slug,
        copied_tags: shouldCopyTags,
      },
      note: data.note ?? null,
    });

    return { ok: true, copied_tags: shouldCopyTags };
  });

// ---- Bulk merge ----
//
// Wraps the per-pair merge in a loop so the admin UI can collapse a whole
// cluster (or every high-confidence cluster) in one call. Errors are
// collected per row rather than aborting the batch.

async function mergePairInternal(
  survivorId: string,
  duplicateId: string,
): Promise<{ copied_tags: boolean }> {
  const { data: rows, error } = await supabaseAdmin
    .from("events")
    .select(
      "id, slug, name, status, distance_tags, terrain_tags, is_curated_tags",
    )
    .in("id", [survivorId, duplicateId]);
  if (error) throw new Error(error.message);
  const survivor = rows?.find((r) => r.id === survivorId);
  const dupe = rows?.find((r) => r.id === duplicateId);
  if (!survivor) throw new Error("Survivor not found");
  if (!dupe) throw new Error("Duplicate not found");
  if (survivor.status !== "ACTIVE") throw new Error("Survivor must be ACTIVE");
  if (dupe.status !== "ACTIVE") throw new Error("Duplicate already merged");

  const sDT = (survivor.distance_tags as string[]) ?? [];
  const sTT = (survivor.terrain_tags as string[]) ?? [];
  const dDT = (dupe.distance_tags as string[]) ?? [];
  const dTT = (dupe.terrain_tags as string[]) ?? [];

  const shouldCopyTags =
    !survivor.is_curated_tags &&
    sDT.length === 0 &&
    sTT.length === 0 &&
    (dDT.length > 0 || dTT.length > 0);

  if (shouldCopyTags) {
    const { error: upErr } = await supabaseAdmin
      .from("events")
      .update({ distance_tags: dDT, terrain_tags: dTT })
      .eq("id", survivorId);
    if (upErr) throw new Error(upErr.message);
  }

  const { error: dupErr } = await supabaseAdmin
    .from("events")
    .update({ status: "DUPLICATE", duplicate_of: survivorId })
    .eq("id", duplicateId);
  if (dupErr) throw new Error(dupErr.message);

  await supabaseAdmin.from("event_edits").insert({
    event_id: duplicateId,
    changes: {
      action: "merge_duplicate",
      survivor_id: survivorId,
      survivor_slug: survivor.slug,
      duplicate_slug: dupe.slug,
      copied_tags: shouldCopyTags,
    },
    note: null,
  });

  return { copied_tags: shouldCopyTags };
}

export const mergeDuplicateCluster = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        survivorId: z.string().uuid(),
        duplicateIds: z.array(z.string().uuid()).min(1).max(50),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    requireAdminOrThrow();
    const merged: string[] = [];
    const failed: { id: string; error: string }[] = [];
    for (const dupId of data.duplicateIds) {
      if (dupId === data.survivorId) continue;
      try {
        await mergePairInternal(data.survivorId, dupId);
        merged.push(dupId);
      } catch (e) {
        failed.push({
          id: dupId,
          error: e instanceof Error ? e.message : "Unknown error",
        });
      }
    }
    return { merged: merged.length, failed };
  });

export const mergeAllHighConfidenceClusters = createServerFn({
  method: "POST",
}).handler(async () => {
  requireAdminOrThrow();
  // Re-fetch clusters server-side so the admin's stale view can't drive a
  // batch merge with outdated survivor picks.
  const { clusters } = await findPotentialDuplicates();
  const high = clusters.filter((c) => c.confidence === "high");
  let merged = 0;
  const failed: { id: string; error: string }[] = [];
  for (const cluster of high) {
    const [survivor, ...rest] = cluster.rows;
    for (const dupe of rest) {
      try {
        await mergePairInternal(survivor.id, dupe.id);
        merged++;
      } catch (e) {
        failed.push({
          id: dupe.id,
          error: e instanceof Error ? e.message : "Unknown error",
        });
      }
    }
  }
  return { clusters_processed: high.length, merged, failed };
});

// ---- Unmerge (safety net) ----

export const unmergeDuplicateEvent = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    requireAdminOrThrow();
    const { data: row, error } = await supabaseAdmin
      .from("events")
      .select("id, slug, status, duplicate_of")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Event not found");
    if (row.status !== "DUPLICATE") {
      throw new Error("Only DUPLICATE rows can be unmerged");
    }
    const previousSurvivor = row.duplicate_of;
    const { error: upErr } = await supabaseAdmin
      .from("events")
      .update({ status: "ACTIVE", duplicate_of: null })
      .eq("id", data.id);
    if (upErr) throw new Error(upErr.message);
    await supabaseAdmin.from("event_edits").insert({
      event_id: data.id,
      changes: {
        action: "unmerge_duplicate",
        previous_survivor_id: previousSurvivor,
      },
      note: null,
    });
    return { ok: true };
  });

// ---- Mark cluster as recurring series ----
//
// Flags every row in the cluster with is_recurring=true and writes a shared
// series_key (slugified name+town) so they can be grouped later. These rows
// are then excluded from the duplicate scan.

function slugifySeriesKey(name: string, town: string | null): string {
  const base = `${name} ${town ?? ""}`.toLowerCase();
  return base
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export const markClusterAsSeries = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        ids: z.array(z.string().uuid()).min(2).max(200),
        seriesKey: z.string().trim().min(1).max(120).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    requireAdminOrThrow();

    const { data: rows, error } = await supabaseAdmin
      .from("events")
      .select("id, name, town, is_recurring, series_key")
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) throw new Error("No matching rows");

    const key =
      data.seriesKey ??
      slugifySeriesKey(
        (rows[0].name as string) ?? "series",
        (rows[0].town as string | null) ?? null,
      );

    let marked = 0;
    for (const r of rows) {
      const id = r.id as string;
      const before = {
        is_recurring: !!(r.is_recurring as boolean | null),
        series_key: (r.series_key as string | null) ?? null,
      };
      if (before.is_recurring && before.series_key === key) continue;
      const { error: upErr } = await supabaseAdmin
        .from("events")
        .update({ is_recurring: true, series_key: key })
        .eq("id", id);
      if (upErr) throw new Error(upErr.message);
      await supabaseAdmin.from("event_edits").insert({
        event_id: id,
        changes: {
          action: "mark_as_series",
          series_key: { from: before.series_key, to: key },
          is_recurring: { from: before.is_recurring, to: true },
        },
        note: null,
      });
      marked++;
    }
    return { ok: true, marked, series_key: key };
  });

// One-off: fill organiser_url on Scottish Athletics events by matching
// the scraped organiser name against the clubs table (populated by the
// scottish-athletics-clubs sync). Idempotent — safe to re-run.
export type ScottishOrganiserBackfillResult = {
  ok: true;
  scanned: number;
  matched: number;
  updated: number;
  unmatched: string[];
};

function slugifyName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export const backfillScottishOrganiserUrls = createServerFn({ method: "POST" })
  .handler(async (): Promise<ScottishOrganiserBackfillResult> => {
    requireAdminOrThrow();

    const { data: events, error: evErr } = await supabaseAdmin
      .from("events")
      .select("id, organiser, organiser_url")
      .eq("source", "scottishathletics")
      .eq("status", "ACTIVE")
      .or("organiser_url.is.null,organiser_url.eq.")
      .not("organiser", "is", null);
    if (evErr) throw new Error(evErr.message);

    const { data: clubs, error: clErr } = await supabaseAdmin
      .from("clubs")
      .select("name, website_url")
      .eq("source", "scottish-athletics")
      .not("website_url", "is", null);
    if (clErr) throw new Error(clErr.message);

    const map = new Map<string, string>();
    for (const c of clubs ?? []) {
      if (c.name && c.website_url) map.set(slugifyName(c.name), c.website_url);
    }

    let matched = 0;
    let updated = 0;
    const unmatchedSet = new Set<string>();
    for (const ev of events ?? []) {
      const o = ev.organiser?.trim();
      if (!o) continue;
      const hit = map.get(slugifyName(o));
      if (!hit) {
        unmatchedSet.add(o);
        continue;
      }
      matched++;
      const { error: upErr } = await supabaseAdmin
        .from("events")
        .update({ organiser_url: hit })
        .eq("id", ev.id);
      if (!upErr) updated++;
    }

    return {
      ok: true,
      scanned: events?.length ?? 0,
      matched,
      updated,
      unmatched: Array.from(unmatchedSet).sort(),
    };
  });


