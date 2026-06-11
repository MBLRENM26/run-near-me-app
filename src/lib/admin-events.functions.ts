import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isAdminAuthenticated } from "@/lib/admin-session.server";
import { REGIONS } from "@/lib/regions";

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
});

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
        "id,name,slug,sort_date,date_raw,town,region,distances,status,source,is_featured,is_upcoming,date_is_estimated,lat,lng,created_at",
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

    // Fetch current values to compute diff
    const fields = patchEntries.map(([k]) => k).join(",");
    const { data: before, error: beforeErr } = await supabaseAdmin
      .from("events")
      .select(fields)
      .eq("id", data.id)
      .maybeSingle();
    if (beforeErr) throw new Error(beforeErr.message);
    if (!before) throw new Error("Event not found");

    const diff: Record<string, { from: unknown; to: unknown }> = {};
    for (const [k, v] of patchEntries) {
      const prev = (before as Record<string, unknown>)[k];
      if (prev !== v) diff[k] = { from: prev, to: v };
    }
    if (Object.keys(diff).length === 0) return { ok: true as const, changed: 0 };

    const { error: updErr } = await supabaseAdmin
      .from("events")
      .update(patch)
      .eq("id", data.id);
    if (updErr) throw new Error(updErr.message);

    await supabaseAdmin.from("event_edits").insert({
      event_id: data.id,
      changes: diff,
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
      changes: { status: { to: data.status } },
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
