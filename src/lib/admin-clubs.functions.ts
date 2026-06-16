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

function requireAdminOrThrow() {
  if (!isAdminAuthenticated()) throw new Error("Unauthorized");
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
    requireAdminOrThrow();

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
    requireAdminOrThrow();

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
