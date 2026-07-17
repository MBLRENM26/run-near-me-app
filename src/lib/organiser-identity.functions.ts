import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isAdminAuthenticated } from "@/lib/admin-session.server";

const REVIEW_STATUSES = ["proposed", "accepted", "rejected", "reopened"] as const;
const REVIEW_ACTIONS = ["accepted", "rejected", "reopened"] as const;

export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export type OrganiserLinkRow = {
  id: string;
  event_id: string;
  event_slug: string;
  event_name: string;
  event_date_raw: string;
  organisation_id: string;
  organisation_name: string;
  organisation_status: string;
  relationship: string;
  confidence: string;
  review_status: ReviewStatus;
  created_at: string;
  evidence: Array<{
    id: string;
    source_url: string;
    evidence_type: string;
    supporting_fact: string | null;
    captured_at: string;
  }>;
  history: Array<{
    id: string;
    action: string;
    note: string | null;
    reviewer_identity: string;
    created_at: string;
  }>;
};

function requireAdminOrThrow() {
  if (!isAdminAuthenticated()) throw new Error("Unauthorized");
}

// ---------------------------------------------------------------------------
// List links with expandable evidence + history
// ---------------------------------------------------------------------------
export const listOrganiserLinks = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        status: z.enum(REVIEW_STATUSES).optional(),
        organisation_id: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(200).default(100),
        offset: z.number().int().min(0).default(0),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }): Promise<{ rows: OrganiserLinkRow[]; total: number }> => {
    requireAdminOrThrow();

    let q = supabaseAdmin
      .from("organisation_event_links")
      .select("id, event_id, organisation_id, relationship, confidence, review_status, created_at", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);

    if (data.status) q = q.eq("review_status", data.status);
    if (data.organisation_id) q = q.eq("organisation_id", data.organisation_id);

    const { data: links, count, error } = await q;
    if (error) throw new Error(error.message);
    const linkRows = links ?? [];
    if (linkRows.length === 0) return { rows: [], total: count ?? 0 };

    const eventIds = Array.from(new Set(linkRows.map((r) => r.event_id)));
    const orgIds = Array.from(new Set(linkRows.map((r) => r.organisation_id)));
    const linkIds = linkRows.map((r) => r.id);

    const [eventsRes, orgsRes, evJoinRes, historyRes] = await Promise.all([
      supabaseAdmin.from("events").select("id, slug, name, date_raw").in("id", eventIds),
      supabaseAdmin
        .from("organisations")
        .select("id, canonical_name, status")
        .in("id", orgIds),
      supabaseAdmin
        .from("organisation_event_link_evidence")
        .select("link_id, evidence_id, identity_evidence!inner(id, source_url, evidence_type, supporting_fact, captured_at)")
        .in("link_id", linkIds),
      supabaseAdmin
        .from("organisation_event_link_reviews")
        .select("id, link_id, action, note, reviewer_identity, created_at")
        .in("link_id", linkIds)
        .order("created_at", { ascending: false }),
    ]);

    if (eventsRes.error) throw new Error(eventsRes.error.message);
    if (orgsRes.error) throw new Error(orgsRes.error.message);
    if (evJoinRes.error) throw new Error(evJoinRes.error.message);
    if (historyRes.error) throw new Error(historyRes.error.message);

    const eventMap = new Map((eventsRes.data ?? []).map((e) => [e.id, e]));
    const orgMap = new Map((orgsRes.data ?? []).map((o) => [o.id, o]));

    const evidenceByLink = new Map<string, OrganiserLinkRow["evidence"]>();
    for (const row of (evJoinRes.data ?? []) as unknown as Array<{
      link_id: string;
      identity_evidence: {
        id: string;
        source_url: string;
        evidence_type: string;
        supporting_fact: string | null;
        captured_at: string;
      } | null;
    }>) {
      const ev = row.identity_evidence;
      if (!ev) continue;
      const arr = evidenceByLink.get(row.link_id) ?? [];
      arr.push(ev);
      evidenceByLink.set(row.link_id, arr);
    }

    const historyByLink = new Map<string, OrganiserLinkRow["history"]>();
    for (const h of historyRes.data ?? []) {
      const arr = historyByLink.get(h.link_id) ?? [];
      arr.push({
        id: h.id,
        action: h.action,
        note: h.note,
        reviewer_identity: h.reviewer_identity,
        created_at: h.created_at,
      });
      historyByLink.set(h.link_id, arr);
    }

    const rows: OrganiserLinkRow[] = linkRows.map((r) => {
      const ev = eventMap.get(r.event_id);
      const org = orgMap.get(r.organisation_id);
      return {
        id: r.id,
        event_id: r.event_id,
        event_slug: ev?.slug ?? "",
        event_name: ev?.name ?? "",
        event_date_raw: ev?.date_raw ?? "",
        organisation_id: r.organisation_id,
        organisation_name: org?.canonical_name ?? "(unknown)",
        organisation_status: org?.status ?? "candidate",
        relationship: r.relationship,
        confidence: r.confidence,
        review_status: r.review_status as ReviewStatus,
        created_at: r.created_at,
        evidence: evidenceByLink.get(r.id) ?? [],
        history: historyByLink.get(r.id) ?? [],
      };
    });

    return { rows, total: count ?? 0 };
  });

// ---------------------------------------------------------------------------
// Review a link (state-machine RPC)
// ---------------------------------------------------------------------------
export const reviewOrganiserLink = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        link_id: z.string().uuid(),
        action: z.enum(REVIEW_ACTIONS),
        note: z.string().max(2000).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: true; review_id: string } | { ok: false; error: string }> => {
    requireAdminOrThrow();

    const { data: reviewId, error } = await supabaseAdmin.rpc(
      "review_organisation_event_link_txn",
      {
        _link_id: data.link_id,
        _action: data.action,
        _note: data.note ?? "",
        _reviewed_by: "00000000-0000-0000-0000-000000000000",
        _reviewer_identity: "admin:cookie-session",
      },
    );

    if (error) {
      const msg = error.message ?? "unknown_error";
      if (msg.includes("invalid_transition")) return { ok: false, error: msg };
      if (msg.includes("invalid_action")) return { ok: false, error: msg };
      if (msg.includes("link_not_found")) return { ok: false, error: "link_not_found" };
      throw new Error(msg);
    }
    return { ok: true, review_id: reviewId as unknown as string };
  });

// ---------------------------------------------------------------------------
// Unresolved seed rows (admin-only visibility)
// ---------------------------------------------------------------------------
export type UnresolvedRow = {
  id: string;
  seed_run_id: string;
  csv_sha256: string;
  csv_row_number: number;
  raw_row: string;
  reason: string;
  candidate_event_ids: string[];
  attempted_at: string;
};

export const listSeedUnresolved = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        seed_run_id: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(500).default(200),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }): Promise<{ rows: UnresolvedRow[] }> => {
    requireAdminOrThrow();

    let q = supabaseAdmin
      .from("organisation_seed_unresolved")
      .select("id, seed_run_id, csv_sha256, csv_row_number, raw_row, reason, candidate_event_ids, attempted_at")
      .order("attempted_at", { ascending: false })
      .limit(data.limit);
    if (data.seed_run_id) q = q.eq("seed_run_id", data.seed_run_id);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return {
      rows: (rows ?? []).map((r) => ({
        id: r.id,
        seed_run_id: r.seed_run_id,
        csv_sha256: r.csv_sha256,
        csv_row_number: r.csv_row_number,
        raw_row: JSON.stringify(r.raw_row ?? {}),
        reason: r.reason,
        candidate_event_ids: (r.candidate_event_ids ?? []) as string[],
        attempted_at: r.attempted_at,
      })),
    };
  });
