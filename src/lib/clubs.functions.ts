import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { REGIONS } from "@/lib/regions";

const SAFE_COLUMNS =
  "id, slug, name, governing_body, affiliation_number, town, county, region, country, postcode, lat, lng, website_url, disciplines, is_claimed, claimed_at, last_verified_at, status, norm_created_at, created_at";

export type ClubListItem = {
  id: string;
  slug: string;
  name: string;
  governing_body: string;
  town: string | null;
  county: string | null;
  region: string | null;
  is_claimed: boolean;
};

export type ClubDetail = {
  id: string;
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
  disciplines: string[];
  is_claimed: boolean;
  claimed_at: string | null;
  last_verified_at: string | null;
  norm_created_at: string | null;
  created_at: string;
};

const REGION_NAMES = new Set(REGIONS.map((r) => r.name));

export const listClubs = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z
      .object({
        region: z.string().trim().max(100).optional(),
        limit: z.number().int().min(1).max(100).optional().default(50),
        offset: z.number().int().min(0).optional().default(0),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    let q = supabaseAdmin
      .from("public_clubs")
      .select(SAFE_COLUMNS, { count: "exact" })
      .eq("status", "ACTIVE")
      .order("is_claimed", { ascending: false })
      .order("name", { ascending: true })
      .range(data.offset, data.offset + data.limit - 1);

    if (data.region && REGION_NAMES.has(data.region)) {
      q = q.eq("region", data.region);
    }

    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);

    return {
      clubs: ((rows ?? []) as unknown as ClubListItem[]),
      total: count ?? 0,
    };
  });

export const getClubPageData = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z
      .object({
        slug: z.string().trim().min(1).max(255).regex(/^[a-z0-9-]+$/),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { data: club, error } = await supabaseAdmin
      .from("public_clubs")
      .select(SAFE_COLUMNS)
      .eq("slug", data.slug)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!club) throw notFound();

    return { club: club as unknown as ClubDetail };
  });

export const getAllClubSlugs = createServerFn({ method: "GET" }).handler(
  async () => {
    const { data, error } = await supabaseAdmin
      .from("public_clubs")
      .select("slug, created_at")
      .eq("status", "ACTIVE")
      .limit(10000);
    if (error) throw new Error(error.message);
    return (data ?? []).filter((r): r is { slug: string; created_at: string } =>
      typeof r.slug === "string" && r.slug.length > 0,
    );
  },
);

const ROLE_VALUES = [
  "chair",
  "secretary",
  "treasurer",
  "membership",
  "coach",
  "captain",
  "committee",
  "other",
] as const;

export const submitClubClaim = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        club_slug: z.string().trim().min(1).max(255).regex(/^[a-z0-9-]+$/),
        claimant_name: z.string().trim().min(1).max(200),
        claimant_email: z.string().trim().email().max(255),
        role_at_club: z.enum(ROLE_VALUES),
        verification_method: z.string().trim().max(50).optional(),
        verification_hint: z.string().trim().max(500).optional(),
        message: z.string().trim().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    // Look up the club id from the slug — we never trust client-supplied ids.
    const { data: club, error: lookupErr } = await supabaseAdmin
      .from("clubs")
      .select("id, slug, name")
      .eq("slug", data.club_slug)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (lookupErr) throw new Error(lookupErr.message);
    if (!club) throw new Error("Club not found");

    const { data: inserted, error } = await supabaseAdmin
      .from("club_claims")
      .insert({
        club_id: club.id,
        club_slug: club.slug,
        claimant_name: data.claimant_name,
        claimant_email: data.claimant_email,
        role_at_club: data.role_at_club,
        verification_method: data.verification_method ?? null,
        verification_hint: data.verification_hint ?? null,
        message: data.message ?? null,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      throw new Error(error?.message ?? "Insert failed");
    }

    // Fire-and-forget admin notification.
    import("@/lib/notify.server")
      .then(({ sendNewSubmissionNotification }) =>
        sendNewSubmissionNotification({
          id: inserted.id,
          email: data.claimant_email,
          kind: "claim",
          claim_slug: `club:${club.slug}`,
          submitted_at: new Date().toISOString(),
        }),
      )
      .catch((err) => console.warn("[submitClubClaim] notify failed", err));

    return { ok: true as const, id: inserted.id };
  });
