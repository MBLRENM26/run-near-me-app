import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isAdminAuthenticated } from "@/lib/admin-session.server";

const CLAIM_STATUSES = ["pending", "approved", "rejected", "needs-info"] as const;

export type ClubClaimRow = {
  id: string;
  club_id: string;
  club_slug: string;
  claimant_name: string;
  claimant_email: string;
  role_at_club: string;
  verification_method: string | null;
  verification_hint: string | null;
  message: string | null;
  status: (typeof CLAIM_STATUSES)[number];
  admin_note: string | null;
  reviewed_at: string | null;
  submitted_at: string;
  club_name: string | null;
};

async function requireAdminOrThrow() {
  if (!(await isAdminAuthenticated())) throw new Error("Unauthorized");
}

async function requireAdminMutation() {
  await requireAdminOrThrow();
}

export const listClubClaims = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        status: z.enum(CLAIM_STATUSES).optional(),
        limit: z.number().int().min(1).max(200).default(100),
        offset: z.number().int().min(0).default(0),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    await requireAdminOrThrow();

    let q = supabaseAdmin
      .from("club_claims")
      .select(
        "id, club_id, club_slug, claimant_name, claimant_email, role_at_club, verification_method, verification_hint, message, status, admin_note, reviewed_at, submitted_at",
      )
      .order("submitted_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);

    if (data.status) q = q.eq("status", data.status);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    // Fetch club names for the listed claims (small N).
    const clubIds = Array.from(new Set((rows ?? []).map((r) => r.club_id)));
    let clubMap = new Map<string, string>();
    if (clubIds.length) {
      const { data: clubs } = await supabaseAdmin
        .from("clubs")
        .select("id, name")
        .in("id", clubIds);
      clubMap = new Map((clubs ?? []).map((c) => [c.id, c.name]));
    }

    // Counts by status
    const { data: countRows } = await supabaseAdmin
      .from("club_claims")
      .select("status");
    const counts: Record<(typeof CLAIM_STATUSES)[number], number> = {
      pending: 0,
      approved: 0,
      rejected: 0,
      "needs-info": 0,
    };
    for (const r of countRows ?? []) {
      const s = r.status as keyof typeof counts;
      if (s in counts) counts[s]++;
    }

    return {
      rows: (rows ?? []).map((r) => ({
        ...r,
        club_name: clubMap.get(r.club_id) ?? null,
      })) as ClubClaimRow[],
      counts,
    };
  });

export const updateClubClaim = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(CLAIM_STATUSES),
        admin_note: z.string().max(2000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdminMutation();

    const { data: claim, error: lookupErr } = await supabaseAdmin
      .from("club_claims")
      .select("id, club_id, claimant_email")
      .eq("id", data.id)
      .single();
    if (lookupErr || !claim) throw new Error(lookupErr?.message ?? "Not found");

    const patch: {
      status: (typeof CLAIM_STATUSES)[number];
      reviewed_at: string;
      admin_note?: string | null;
    } = {
      status: data.status,
      reviewed_at: new Date().toISOString(),
    };
    if (data.admin_note !== undefined) patch.admin_note = data.admin_note;

    const { error } = await supabaseAdmin
      .from("club_claims")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    // If approving, mark the club as claimed.
    if (data.status === "approved") {
      const { error: clubErr } = await supabaseAdmin
        .from("clubs")
        .update({
          is_claimed: true,
          claimed_by: claim.claimant_email,
          claimed_at: new Date().toISOString(),
        })
        .eq("id", claim.club_id);
      if (clubErr) throw new Error(clubErr.message);
    }

    return { ok: true };
  });

/* -------------------------------------------------------------------------- */
/*  Admin CRUD for clubs                                                      */
/* -------------------------------------------------------------------------- */

const GOVERNING_BODIES = [
  "england-athletics",
  "scottish-athletics",
  "welsh-athletics",
  "athletics-ni",
] as const;

const CLUB_STATUSES = ["ACTIVE", "HIDDEN", "DELETED"] as const;

export type AdminClubListItem = {
  id: string;
  slug: string;
  name: string;
  governing_body: string;
  town: string | null;
  county: string | null;
  region: string | null;
  status: string;
  is_claimed: boolean;
};

export type AdminClubDetail = {
  id: string;
  norm_id: string;
  slug: string;
  name: string;
  governing_body: string;
  affiliation_number: string | null;
  town: string | null;
  county: string | null;
  region: string | null;
  country: string | null;
  postcode: string | null;
  lat: number | null;
  lng: number | null;
  website_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  disciplines: string[];
  is_claimed: boolean;
  claimed_at: string | null;
  last_verified_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

const ADMIN_LIST_COLS =
  "id, slug, name, governing_body, town, county, region, status, is_claimed";

const ADMIN_DETAIL_COLS =
  "id, norm_id, slug, name, governing_body, affiliation_number, town, county, region, country, postcode, lat, lng, website_url, contact_email, contact_phone, disciplines, is_claimed, claimed_at, last_verified_at, status, created_at, updated_at";

export const listAdminClubs = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        q: z.string().trim().max(120).optional(),
        governing_body: z.enum(GOVERNING_BODIES).optional(),
        region: z.string().trim().max(80).optional(),
        status: z.enum(CLUB_STATUSES).optional(),
        claimed: z.enum(["yes", "no"]).optional(),
        limit: z.number().int().min(1).max(200).default(50),
        offset: z.number().int().min(0).default(0),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    await requireAdminOrThrow();

    let q = supabaseAdmin
      .from("clubs")
      .select(ADMIN_LIST_COLS, { count: "exact" })
      .order("name", { ascending: true })
      .range(data.offset, data.offset + data.limit - 1);

    if (data.q) {
      const term = data.q.replace(/[%_]/g, "");
      q = q.or(
        `name.ilike.%${term}%,town.ilike.%${term}%,slug.ilike.%${term}%`,
      );
    }
    if (data.governing_body) q = q.eq("governing_body", data.governing_body);
    if (data.region) q = q.eq("region", data.region);
    if (data.status) q = q.eq("status", data.status);
    if (data.claimed === "yes") q = q.eq("is_claimed", true);
    if (data.claimed === "no") q = q.eq("is_claimed", false);

    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);

    return {
      rows: (rows ?? []) as unknown as AdminClubListItem[],
      total: count ?? 0,
    };
  });

export const getAdminClub = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminOrThrow();
    const { data: row, error } = await supabaseAdmin
      .from("clubs")
      .select(ADMIN_DETAIL_COLS)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Not found");
    return row as unknown as AdminClubDetail;
  });

const ClubPayloadSchema = z.object({
  name: z.string().trim().min(1).max(500),
  slug: z
    .string()
    .trim()
    .max(120)
    .regex(/^[a-z0-9-]*$/)
    .optional()
    .default(""),
  governing_body: z.enum(GOVERNING_BODIES),
  affiliation_number: z.string().trim().max(100).nullish(),
  town: z.string().trim().max(255).nullish(),
  county: z.string().trim().max(255).nullish(),
  region: z.string().trim().max(120).nullish(),
  country: z.string().trim().max(120).nullish(),
  postcode: z.string().trim().max(20).nullish(),
  lat: z.number().min(-90).max(90).nullish(),
  lng: z.number().min(-180).max(180).nullish(),
  website_url: z.string().trim().max(2000).nullish(),
  contact_email: z.string().trim().email().max(255).nullish().or(z.literal("")),
  contact_phone: z.string().trim().max(50).nullish(),
  disciplines: z.array(z.string().trim().max(100)).max(20).default([]),
  status: z.enum(CLUB_STATUSES).default("ACTIVE"),
  is_claimed: z.boolean().default(false),
});

async function ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base;
  let n = 2;
  while (true) {
    let q = supabaseAdmin.from("clubs").select("id").eq("slug", slug).limit(1);
    if (excludeId) q = q.neq("id", excludeId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return slug;
    slug = `${base}-${n}`.slice(0, 120);
    n += 1;
  }
}

export const createAdminClub = createServerFn({ method: "POST" })
  .inputValidator((d) => ClubPayloadSchema.parse(d))
  .handler(async ({ data }) => {
    await requireAdminMutation();
    const base = (data.slug && data.slug.length > 0 ? data.slug : slugify(data.name)) || "club";
    const slug = await ensureUniqueSlug(base);
    const norm_id = `manual:${crypto.randomUUID()}`;
    const insert = {
      norm_id,
      slug,
      name: data.name,
      governing_body: data.governing_body,
      affiliation_number: data.affiliation_number || null,
      town: data.town || null,
      county: data.county || null,
      region: data.region || null,
      country: data.country || null,
      postcode: data.postcode || null,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      website_url: data.website_url || null,
      contact_email: data.contact_email || null,
      contact_phone: data.contact_phone || null,
      disciplines: data.disciplines,
      status: data.status,
      is_claimed: data.is_claimed,
      claimed_at: data.is_claimed ? new Date().toISOString() : null,
    };
    const { data: row, error } = await supabaseAdmin
      .from("clubs")
      .insert(insert)
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Insert failed");
    return { id: row.id as string };
  });

export const updateAdminClub = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({ id: z.string().uuid(), patch: ClubPayloadSchema })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdminMutation();
    const { data: existing, error: lookupErr } = await supabaseAdmin
      .from("clubs")
      .select("id, slug, is_claimed, claimed_at")
      .eq("id", data.id)
      .maybeSingle();
    if (lookupErr) throw new Error(lookupErr.message);
    if (!existing) throw new Error("Not found");

    const requestedSlug = data.patch.slug && data.patch.slug.length > 0
      ? data.patch.slug
      : slugify(data.patch.name);
    const slug = requestedSlug && requestedSlug !== existing.slug
      ? await ensureUniqueSlug(requestedSlug, data.id)
      : existing.slug;

    let claimed_at = existing.claimed_at;
    if (data.patch.is_claimed && !existing.is_claimed) {
      claimed_at = new Date().toISOString();
    } else if (!data.patch.is_claimed) {
      claimed_at = null;
    }

    const patch = {
      slug,
      name: data.patch.name,
      governing_body: data.patch.governing_body,
      affiliation_number: data.patch.affiliation_number || null,
      town: data.patch.town || null,
      county: data.patch.county || null,
      region: data.patch.region || null,
      country: data.patch.country || null,
      postcode: data.patch.postcode || null,
      lat: data.patch.lat ?? null,
      lng: data.patch.lng ?? null,
      website_url: data.patch.website_url || null,
      contact_email: data.patch.contact_email || null,
      contact_phone: data.patch.contact_phone || null,
      disciplines: data.patch.disciplines,
      status: data.patch.status,
      is_claimed: data.patch.is_claimed,
      claimed_at,
    };

    const { error } = await supabaseAdmin
      .from("clubs")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAdminClub = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdminMutation();
    // Soft delete — keeps norm_id stable so re-imports don't resurrect it.
    const { error } = await supabaseAdmin
      .from("clubs")
      .update({ status: "DELETED" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
