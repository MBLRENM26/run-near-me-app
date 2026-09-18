import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  reconcileEvent,
  sortByReviewPriority,
  summariseReconciliation,
  type OrlGraph,
  type ReconciliationEventInput,
  type ReconciliationRow,
  type ReconciliationState,
  type ReconciliationTotals,
} from "@/lib/orl-reconciliation";

/**
 * READ-ONLY ORL reconciliation for the admin Organiser Gap page (Step 1).
 *
 * Every query here is a SELECT. Nothing stages, upserts, creates, reviews or
 * mutates: Step 2 staging into ORL intake is deliberately absent and remains
 * separately gated. Runner PII (subscriber emails) is never selected — only
 * per-event counts used for review ordering.
 */

const isAdminAuthenticated = createServerOnlyFn(async () => {
  const { isAdminAuthenticated: impl } = await import("@/lib/admin-session.server");
  return impl();
});

async function requireAdminOrThrow() {
  if (!(await isAdminAuthenticated())) throw new Error("Unauthorized");
}

const PAGE_SIZE = 1000;
/** Hard safety bound only — exhaustion is the normal exit, and truncation is reported. */
const MAX_PAGES = 50;
const DEMAND_WINDOW_DAYS = 90;

const EVENT_COLUMNS =
  "id, slug, name, sort_date, town, county, source, organiser, organiser_type, organiser_club_id, organiser_url, entry_url";

/** Pages a SELECT to exhaustion so nothing is silently capped at 1,000 rows. */
async function fetchAllPages<T>(
  run: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<{ rows: T[]; truncated: boolean }> {
  const rows: T[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * PAGE_SIZE;
    const { data, error } = await run(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return { rows, truncated: false };
  }
  return { rows, truncated: true };
}

async function fetchFutureEvents(
  today: string,
): Promise<{ rows: ReconciliationEventInput[]; truncated: boolean }> {
  return fetchAllPages<ReconciliationEventInput>(
    (from, to) =>
      supabaseAdmin
        .from("events")
        .select(EVENT_COLUMNS)
        .eq("status", "ACTIVE")
        .gte("sort_date", today)
        .order("sort_date", { ascending: true })
        .range(from, to) as unknown as PromiseLike<{
        data: ReconciliationEventInput[] | null;
        error: { message: string } | null;
      }>,
  );
}

async function fetchOrlGraph(): Promise<OrlGraph> {
  const [orgs, aliases, accounts, links, linkEvidence, reviews, unresolved] = await Promise.all([
    supabaseAdmin.from("organisations").select("id, canonical_name, website_domain, status"),
    supabaseAdmin
      .from("organisation_aliases")
      .select("organisation_id, alias_name, alias_type, evidence_id"),
    supabaseAdmin
      .from("organisation_platform_accounts")
      .select(
        "organisation_id, platform, account_url, tenant_slug, platform_identifier, confidence, evidence_id",
      ),
    supabaseAdmin
      .from("organisation_event_links")
      .select("id, event_id, organisation_id, relationship, confidence, review_status"),
    supabaseAdmin.from("organisation_event_link_evidence").select("link_id, evidence_id"),
    supabaseAdmin.from("organisation_event_link_reviews").select("link_id"),
    supabaseAdmin
      .from("organisation_seed_unresolved")
      .select("reason, csv_row_number, candidate_event_ids"),
  ]);

  for (const res of [orgs, aliases, accounts, links, linkEvidence, reviews, unresolved]) {
    if (res.error) throw new Error(res.error.message);
  }

  // Attribute identity evidence to organisations through the alias /
  // platform-account rows that already reference it.
  const evidenceOwners = new Map<string, Set<string>>();
  const own = (evidenceId: string | null, organisationId: string) => {
    if (!evidenceId) return;
    const set = evidenceOwners.get(evidenceId) ?? new Set<string>();
    set.add(organisationId);
    evidenceOwners.set(evidenceId, set);
  };
  for (const a of aliases.data ?? []) own(a.evidence_id, a.organisation_id);
  for (const p of accounts.data ?? []) own(p.evidence_id, p.organisation_id);

  let evidenceByOrganisation: OrlGraph["evidence_by_organisation"] = [];
  const evidenceIds = [...evidenceOwners.keys()];
  if (evidenceIds.length > 0) {
    const { data: evidence, error } = await supabaseAdmin
      .from("identity_evidence")
      .select("id, source_url, evidence_type, supporting_fact")
      .in("id", evidenceIds);
    if (error) throw new Error(error.message);
    evidenceByOrganisation = (evidence ?? []).flatMap((ev) =>
      [...(evidenceOwners.get(ev.id) ?? [])].map((organisation_id) => ({
        organisation_id,
        evidence: {
          id: ev.id,
          source_url: ev.source_url,
          evidence_type: ev.evidence_type,
          supporting_fact: ev.supporting_fact,
        },
      })),
    );
  }

  const link_evidence_counts: Record<string, number> = {};
  for (const row of linkEvidence.data ?? []) {
    link_evidence_counts[row.link_id] = (link_evidence_counts[row.link_id] ?? 0) + 1;
  }
  const link_review_counts: Record<string, number> = {};
  for (const row of reviews.data ?? []) {
    link_review_counts[row.link_id] = (link_review_counts[row.link_id] ?? 0) + 1;
  }

  return {
    organisations: orgs.data ?? [],
    aliases: (aliases.data ?? []).map((a) => ({
      organisation_id: a.organisation_id,
      alias_name: a.alias_name,
      alias_type: a.alias_type,
    })),
    platform_accounts: (accounts.data ?? []).map((p) => ({
      organisation_id: p.organisation_id,
      platform: p.platform,
      account_url: p.account_url,
      tenant_slug: p.tenant_slug,
      platform_identifier: p.platform_identifier,
      confidence: p.confidence,
    })),
    evidence_by_organisation: evidenceByOrganisation,
    links: links.data ?? [],
    link_evidence_counts,
    link_review_counts,
    unresolved: (unresolved.data ?? []).map((u) => ({
      reason: u.reason,
      csv_row_number: u.csv_row_number,
      candidate_event_ids: (u.candidate_event_ids ?? []) as string[],
    })),
  };
}

export type OrlGraphInventory = {
  organisations: number;
  aliases: number;
  platform_accounts: number;
  evidence_attributed: number;
  links: number;
  accepted_links: number;
  unresolved_seed_rows: number;
};

export type OrlReconciliation = {
  generated_at: string;
  /** Computed over every future event, before any display slicing. */
  totals: ReconciliationTotals;
  graph_inventory: OrlGraphInventory;
  /** True only if the hard safety page bound was hit (totals would be partial). */
  scan_truncated: boolean;
  /** Rows matching the selected state, uncapped. */
  matching: number;
  page_size: number;
  offset: number;
  returned: number;
  has_more: boolean;
  rows: ReconciliationRow[];
};

export const getOrlReconciliation = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        limit: z.number().int().min(1).max(500).default(100),
        offset: z.number().int().min(0).default(0),
        state: z
          .enum(["linked_in_orl", "candidate_match", "ambiguous", "unmatched", "unresolved_seed"])
          .optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }): Promise<OrlReconciliation> => {
    await requireAdminOrThrow();

    const now = Date.now();
    const today = new Date(now).toISOString().slice(0, 10);
    const since = new Date(now - DEMAND_WINDOW_DAYS * 86_400_000).toISOString();

    const [events, graph, searchClicks, reminders] = await Promise.all([
      fetchFutureEvents(today),
      fetchOrlGraph(),
      fetchAllPages<{ clicked_slug: string }>(
        (from, to) =>
          supabaseAdmin
            .from("search_clicks")
            .select("clicked_slug")
            .gte("created_at", since)
            .range(from, to) as unknown as PromiseLike<{
            data: { clicked_slug: string }[] | null;
            error: { message: string } | null;
          }>,
      ),
      // event_id only — never subscriber emails.
      fetchAllPages<{ event_id: string }>(
        (from, to) =>
          supabaseAdmin
            .from("email_subscriptions")
            .select("event_id")
            .gte("created_at", since)
            .range(from, to) as unknown as PromiseLike<{
            data: { event_id: string }[] | null;
            error: { message: string } | null;
          }>,
      ),
    ]);

    const clicksBySlug = new Map<string, number>();
    for (const c of searchClicks.rows) {
      clicksBySlug.set(c.clicked_slug, (clicksBySlug.get(c.clicked_slug) ?? 0) + 1);
    }
    const remindersByEvent = new Map<string, number>();
    for (const r of reminders.rows) {
      remindersByEvent.set(r.event_id, (remindersByEvent.get(r.event_id) ?? 0) + 1);
    }

    const allRows = events.rows.map((e) =>
      reconcileEvent(e, graph, {
        search_clicks: (e.slug && clicksBySlug.get(e.slug)) || 0,
        reminder_requests: remindersByEvent.get(e.id) ?? 0,
      }),
    );

    const totals = summariseReconciliation(allRows);
    const filtered = data.state
      ? allRows.filter((r) => r.state === (data.state as ReconciliationState))
      : allRows;
    const ordered = sortByReviewPriority(filtered);
    const page = ordered.slice(data.offset, data.offset + data.limit);

    return {
      generated_at: new Date(now).toISOString(),
      totals,
      graph_inventory: {
        organisations: graph.organisations.length,
        aliases: graph.aliases.length,
        platform_accounts: graph.platform_accounts.length,
        evidence_attributed: graph.evidence_by_organisation.length,
        links: graph.links.length,
        accepted_links: graph.links.filter((l) => l.review_status === "accepted").length,
        unresolved_seed_rows: graph.unresolved.length,
      },
      scan_truncated: events.truncated,
      matching: ordered.length,
      page_size: data.limit,
      offset: data.offset,
      returned: page.length,
      has_more: data.offset + page.length < ordered.length,
      rows: page,
    };
  });
