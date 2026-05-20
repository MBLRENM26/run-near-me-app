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

const STATUSES = ["new", "in_review", "actioned", "rejected", "spam"] as const;
const KINDS = ["listing", "claim"] as const;

export interface SubmissionRow {
  id: string;
  email: string;
  event_details: string;
  submitted_at: string;
  kind: "listing" | "claim";
  claim_slug: string | null;
  status: (typeof STATUSES)[number];
  admin_note: string | null;
  reviewed_at: string | null;
}

export interface SubmissionCounts {
  total: number;
  by_status: Record<(typeof STATUSES)[number], number>;
  by_kind: { listing: number; claim: number };
}

function requireAdminOrThrow() {
  if (!isAdminAuthenticated()) {
    throw new Error("Unauthorized");
  }
}

// -------- Auth --------

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string().min(1).max(255) }).parse(d))
  .handler(async ({ data }) => {
    if (!verifyAdminPassword(data.password)) {
      // Constant-time delay to discourage brute force
      await new Promise((r) => setTimeout(r, 400));
      return { ok: false as const };
    }
    issueAdminSession();
    return { ok: true as const };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  clearAdminSession();
  return { ok: true };
});

export const adminCheckSession = createServerFn({ method: "GET" }).handler(
  async () => {
    return { authenticated: isAdminAuthenticated() };
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
    requireAdminOrThrow();

    let query = supabaseAdmin
      .from("submissions")
      .select(
        "id,email,event_details,submitted_at,kind,claim_slug,status,admin_note,reviewed_at",
      )
      .order("submitted_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);

    if (data.kind) query = query.eq("kind", data.kind);
    if (data.status) query = query.eq("status", data.status);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    // Counts (small table, simple aggregate)
    const { data: countRows, error: countErr } = await supabaseAdmin
      .from("submissions")
      .select("kind,status");
    if (countErr) throw new Error(countErr.message);

    const counts: SubmissionCounts = {
      total: countRows?.length ?? 0,
      by_status: { new: 0, in_review: 0, actioned: 0, rejected: 0, spam: 0 },
      by_kind: { listing: 0, claim: 0 },
    };
    for (const r of countRows ?? []) {
      const s = r.status as keyof typeof counts.by_status;
      const k = r.kind as keyof typeof counts.by_kind;
      if (s in counts.by_status) counts.by_status[s]++;
      if (k in counts.by_kind) counts.by_kind[k]++;
    }

    return { rows: (rows ?? []) as SubmissionRow[], counts };
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
    requireAdminOrThrow();

    const patch: Record<string, unknown> = {};
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
    requireAdminOrThrow();

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

export const submitListing = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        event_details: z.string().trim().min(10).max(2000),
        email: z
          .string()
          .trim()
          .email()
          .max(255),
        claim_slug: z.string().trim().min(1).max(255).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const kind: "listing" | "claim" = data.claim_slug ? "claim" : "listing";

    const { data: inserted, error } = await supabaseAdmin
      .from("submissions")
      .insert({
        event_details: data.event_details,
        email: data.email,
        kind,
        claim_slug: data.claim_slug ?? null,
      })
      .select("id,email,kind,claim_slug,submitted_at")
      .single();

    if (error || !inserted) {
      throw new Error(error?.message ?? "Insert failed");
    }

    // Fire-and-forget — never block on email
    sendNewSubmissionNotification({
      id: inserted.id,
      email: inserted.email,
      kind: inserted.kind,
      claim_slug: inserted.claim_slug,
      submitted_at: inserted.submitted_at,
    }).catch((err) => console.warn("[submitListing] notify failed", err));

    return { ok: true as const, id: inserted.id };
  });
