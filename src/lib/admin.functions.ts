import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  isAdminAuthenticated,
  issueAdminSession,
  clearAdminSession,
  verifyAdminPassword,
} from "@/lib/admin-session.server";
import { sendNewSubmissionNotification } from "@/lib/notify.server";

// The in-memory burst limiter lives in a .server.ts module so its daily-salt
// state never leaks into the client bundle. Handlers dynamically import it
// below. Re-exported for callers that were reaching in via `@/lib/admin.functions`
// (kept as a lazy re-export helper for tests).
export async function checkSubmissionRateLimit(
  keyOverride?: string,
): Promise<boolean> {
  const { checkSubmissionRateLimit: impl } = await import(
    "@/lib/submission-burst-limit.server"
  );
  return impl(keyOverride);
}

// Exported for scoped preview curls only. Guarded so it is a no-op in
// production and cannot be exercised from the published site.
export const __submitLimitTestHook = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ key: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data }) => {
    if (process.env.NODE_ENV === "production") {
      return { ok: false as const, reason: "disabled" as const };
    }
    const { checkSubmissionRateLimit } = await import(
      "@/lib/submission-burst-limit.server"
    );
    const allowed = await checkSubmissionRateLimit(`__test:${data.key}`);
    return { ok: true as const, allowed };
  });

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const STATUSES = ["new", "in_review", "actioned", "rejected", "spam"] as const;
const KINDS = ["listing", "claim", "edit"] as const;

const DISTANCE_OPTIONS = [
  "5k",
  "10k",
  "half-marathon",
  "marathon",
  "ultra",
  "other",
] as const;

const TERRAIN_OPTIONS = [
  "road",
  "trail",
  "fell",
  "multi-terrain",
  "track",
  "other",
] as const;

export interface SubmissionRow {
  id: string;
  email: string;
  event_details: string;
  submitted_at: string;
  kind: "listing" | "claim" | "edit";
  claim_slug: string | null;
  status: (typeof STATUSES)[number];
  admin_note: string | null;
  reviewed_at: string | null;
  race_name: string | null;
  race_date: string | null;
  website_url: string | null;
  distances: string[] | null;
  town: string | null;
  county: string | null;
  postcode: string | null;
  organiser: string | null;
  terrain: string | null;
  submitted_entry_fee: string | null;
  created_event_id: string | null;
  event_id: string | null;
  change_type: string | null;
  proof_url: string | null;
  reporter_name: string | null;
  reporter_relationship: string | null;
  proposed_new_date: string | null;
}

export interface SubmissionCounts {
  total: number;
  by_status: Record<(typeof STATUSES)[number], number>;
  by_kind: { listing: number; claim: number; edit: number };
}

const SUBMISSION_COLUMNS =
  "id,email,event_details,submitted_at,kind,claim_slug,status,admin_note,reviewed_at,race_name,race_date,website_url,distances,town,county,postcode,organiser,terrain,submitted_entry_fee,created_event_id,event_id,change_type,proof_url,reporter_name,reporter_relationship,proposed_new_date";

async function requireAdminOrThrow() {
  if (!(await isAdminAuthenticated())) {
    throw new Error("Unauthorized");
  }
}

async function requireAdminMutation() {
  await requireAdminOrThrow();
}

// -------- Auth --------

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string().min(1).max(255) }).parse(d))
  .handler(async ({ data }) => {

    const { consumeAdminLoginRate } = await import(
      "@/lib/admin-login-rate-limit.server"
    );
    const rate = await consumeAdminLoginRate();
    if (!rate.ok) {
      if (rate.reason === "rate_limited") {
        return {
          ok: false as const,
          reason: "rate_limited" as const,
          retryAfterS: rate.retryAfterS,
        };
      }
      return { ok: false as const, reason: "server_error" as const };
    }

    if (!(await verifyAdminPassword(data.password))) {
      await new Promise((r) => setTimeout(r, 400));
      return { ok: false as const, reason: "incorrect_password" as const };
    }
    await issueAdminSession();
    return { ok: true as const };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  await clearAdminSession();
  return { ok: true };
});

export const adminCheckSession = createServerFn({ method: "GET" }).handler(
  async () => {
    return { authenticated: await isAdminAuthenticated() };
  },
);

// -------- Submissions --------

export const listSubmissions = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        kind: z.enum(KINDS).optional(),
        status: z.enum(STATUSES).optional(),
        limit: z.number().int().min(1).max(200).default(100),
        offset: z.number().int().min(0).default(0),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdminOrThrow();

    let query = supabaseAdmin
      .from("submissions")
      .select(SUBMISSION_COLUMNS)
      .order("submitted_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);

    if (data.kind) query = query.eq("kind", data.kind);
    if (data.status) query = query.eq("status", data.status);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const { data: countRows, error: countErr } = await supabaseAdmin
      .from("submissions")
      .select("kind,status");
    if (countErr) throw new Error(countErr.message);

    const counts: SubmissionCounts = {
      total: countRows?.length ?? 0,
      by_status: { new: 0, in_review: 0, actioned: 0, rejected: 0, spam: 0 },
      by_kind: { listing: 0, claim: 0, edit: 0 },
    };
    for (const r of countRows ?? []) {
      const s = r.status as keyof typeof counts.by_status;
      const k = r.kind as keyof typeof counts.by_kind;
      if (s in counts.by_status) counts.by_status[s]++;
      if (k in counts.by_kind) counts.by_kind[k]++;
    }

    return { rows: (rows ?? []) as unknown as SubmissionRow[], counts };
  });

export const updateSubmission = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(STATUSES).optional(),
        admin_note: z.string().max(2000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdminMutation();

    const patch: {
      status?: (typeof STATUSES)[number];
      reviewed_at?: string;
      admin_note?: string | null;
    } = {};
    if (data.status !== undefined) {
      patch.status = data.status;
      if (data.status !== "new") patch.reviewed_at = new Date().toISOString();
    }
    if (data.admin_note !== undefined) patch.admin_note = data.admin_note;

    if (Object.keys(patch).length === 0) return { ok: true };

    const { error } = await supabaseAdmin
      .from("submissions")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const bulkUpdateSubmissions = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        ids: z.array(z.string().uuid()).min(1).max(200),
        status: z.enum(STATUSES),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdminMutation();

    const { error } = await supabaseAdmin
      .from("submissions")
      .update({
        status: data.status,
        reviewed_at:
          data.status === "new" ? null : new Date().toISOString(),
      })
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- Public submission entry point (server-side insert + notify) --------

const structuredListingSchema = z.object({
  race_name: z.string().trim().min(2).max(300),
  race_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Please pick a valid date."),
  website_url: z.string().trim().url().max(1000),
  email: z.string().trim().email().max(255),
  distances: z.array(z.enum(DISTANCE_OPTIONS)).max(10).default([]),
  town: z.string().trim().max(200).optional(),
  county: z.string().trim().max(200).optional(),
  postcode: z.string().trim().max(20).optional(),
  organiser: z.string().trim().max(300).optional(),
  terrain: z.enum(TERRAIN_OPTIONS).optional(),
  submitted_entry_fee: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(2000).optional(),
  claim_slug: z.string().trim().min(1).max(255).nullable().optional(),
});

function buildEventDetailsSummary(
  d: z.infer<typeof structuredListingSchema>,
): string {
  const lines: string[] = [];
  lines.push(`Race: ${d.race_name}`);
  lines.push(`Date: ${d.race_date}`);
  lines.push(`Website: ${d.website_url}`);
  if (d.distances && d.distances.length)
    lines.push(`Distances: ${d.distances.join(", ")}`);
  if (d.terrain) lines.push(`Terrain: ${d.terrain}`);
  const loc = [d.town, d.county, d.postcode].filter(Boolean).join(", ");
  if (loc) lines.push(`Location: ${loc}`);
  if (d.organiser) lines.push(`Organiser: ${d.organiser}`);
  if (d.submitted_entry_fee) lines.push(`Entry fee: ${d.submitted_entry_fee}`);
  if (d.notes) {
    lines.push("");
    lines.push("Notes:");
    lines.push(d.notes);
  }
  return lines.join("\n");
}

export const submitListing = createServerFn({ method: "POST" })
  .inputValidator((d) => structuredListingSchema.parse(d))
  .handler(async ({ data }) => {
    // Layer 1: in-memory sliding-window burst limiter (5 / 10 min per isolate).
    if (!(await checkSubmissionRateLimit())) {
      return { ok: false as const, reason: "rate_limited" as const };
    }

    // Layer 2: durable per-UTC-bucket limiter (10/hour, 30/day per pseudonymous
    // key, shared across every worker isolate). Also enforces fail-closed on
    // missing cf-connecting-ip and non-empty ADMIN_SESSION_SECRET.
    const { consumeDurableSubmissionRate } = await import(
      "@/lib/submission-rate-limit.server"
    );
    const gate = await consumeDurableSubmissionRate();
    if (!gate.ok) {
      if (gate.reason === "rate_limited") {
        return { ok: false as const, reason: "rate_limited" as const };
      }
      return { ok: false as const, reason: "server_error" as const };
    }
    const kind: "listing" | "claim" = data.claim_slug ? "claim" : "listing";

    const { data: inserted, error } = await supabaseAdmin
      .from("submissions")
      .insert({
        event_details: buildEventDetailsSummary(data),
        email: data.email,
        kind,
        claim_slug: data.claim_slug ?? null,
        race_name: data.race_name,
        race_date: data.race_date,
        website_url: data.website_url,
        distances: data.distances ?? [],
        town: data.town ?? null,
        county: data.county ?? null,
        postcode: data.postcode ?? null,
        organiser: data.organiser ?? null,
        terrain: data.terrain ?? null,
        submitted_entry_fee: data.submitted_entry_fee ?? null,
      })
      .select("id,email,kind,claim_slug,submitted_at")
      .single();

    if (error || !inserted) {
      throw new Error(error?.message ?? "Insert failed");
    }

    sendNewSubmissionNotification({
      id: inserted.id,
      email: inserted.email,
      kind: inserted.kind as "claim" | "listing",
      claim_slug: inserted.claim_slug,
      submitted_at: inserted.submitted_at,
    }).catch((err) => console.warn("[submitListing] notify failed", err));

    return { ok: true as const, id: inserted.id };
  });

// -------- Create draft event from a submission --------
//
// Maps the runner's structured fields into an events row with status='EXPIRED'
// so nothing appears publicly until an admin reviews the record and flips it
// to ACTIVE. Links the submission -> event and marks the submission actioned.

// Loose mapping from submitted distance chip -> distance_tags (all values
// exist in DISTANCE_TAG_VALUES so the parser doesn't need to re-run).
const DISTANCE_MAP: Record<(typeof DISTANCE_OPTIONS)[number], string | null> = {
  "5k": "5k",
  "10k": "10k",
  "half-marathon": "half-marathon",
  marathon: "marathon",
  ultra: "ultra",
  other: null,
};

async function generateUniqueEventSlug(base: string): Promise<string> {
  const stem = slugify(base).slice(0, 180) || "event";
  let candidate = stem;
  let suffix = 1;
  // Cap retries; slug column has a unique index.
  while (suffix < 50) {
    const { data: clash } = await supabaseAdmin
      .from("events")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!clash) return candidate;
    suffix += 1;
    candidate = `${stem}-${suffix}`;
  }
  return `${stem}-${Date.now()}`;
}

export const createEventFromSubmission = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ submissionId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdminMutation();

    const { data: sub, error: subErr } = await supabaseAdmin
      .from("submissions")
      .select(SUBMISSION_COLUMNS)
      .eq("id", data.submissionId)
      .maybeSingle();
    if (subErr) throw new Error(subErr.message);
    if (!sub) throw new Error("Submission not found");
    const s = sub as unknown as SubmissionRow;

    if (s.created_event_id) {
      return { ok: true as const, eventId: s.created_event_id, existed: true };
    }
    if (!s.race_name) {
      throw new Error(
        "This submission has no structured data — was submitted before the form was upgraded. Create the event manually via /admin/events.",
      );
    }

    const slug = await generateUniqueEventSlug(
      `${s.race_name} ${s.race_date ?? ""}`.trim(),
    );

    const distanceTags = (s.distances ?? [])
      .map((d) => DISTANCE_MAP[d as (typeof DISTANCE_OPTIONS)[number]])
      .filter((v): v is string => v != null);
    const terrainTags =
      s.terrain && s.terrain !== "other" ? [s.terrain] : [];

    const distancesText = (s.distances ?? [])
      .filter((d) => d !== "other")
      .join(", ") || null;

    const { data: newEvent, error: insErr } = await supabaseAdmin
      .from("events")
      .insert({
        name: s.race_name,
        slug,
        status: "EXPIRED", // draft — won't appear publicly until admin flips to ACTIVE
        source: "manual",
        source_url: null,
        sort_date: s.race_date,
        date_from: s.race_date,
        date_to: s.race_date,
        date_raw: s.race_date,
        date_is_estimated: false,
        is_upcoming: false,
        town: s.town,
        county: s.county,
        organiser: s.organiser,
        entry_fee: s.submitted_entry_fee,
        entry_url: s.website_url,
        organiser_url: s.website_url,
        distances: distancesText,
        distance_tags: distanceTags,
        terrain_tags: terrainTags,
        is_curated_tags: true,
      })
      .select("id")
      .single();

    if (insErr || !newEvent) {
      throw new Error(insErr?.message ?? "Failed to create event");
    }

    const { error: linkErr } = await supabaseAdmin
      .from("submissions")
      .update({
        created_event_id: newEvent.id,
        status: "actioned",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", s.id);
    if (linkErr) throw new Error(linkErr.message);

    return { ok: true as const, eventId: newEvent.id, existed: false };
  });
