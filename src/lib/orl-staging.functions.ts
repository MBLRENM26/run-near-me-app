import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fetchOrlGraph } from "@/lib/orl-reconciliation.functions";
import { reconcileEvent, type ReconciliationEventInput } from "@/lib/orl-reconciliation";
import {
  applyStaging,
  currentUtcDate,
  planStaging,
  type EvidenceDraft,
  type StagingDb,
  type StagingResult,
} from "@/lib/orl-staging";

/**
 * ORL Step 2 write path: stage ONE reviewed candidate as a `proposed`
 * organisation_event_link in the existing ORL review state machine.
 *
 * - Admin-authenticated server-side; service-role client never leaves the server.
 * - The relationship and evidence are recomputed server-side from the ORL graph;
 *   the client cannot dictate either.
 * - No bulk action, no acceptance, and no write to any public event field.
 */

const isAdminAuthenticated = createServerOnlyFn(async () => {
  const { isAdminAuthenticated: impl } = await import("@/lib/admin-session.server");
  return impl();
});

const EVENT_COLUMNS =
  "id, slug, name, sort_date, town, county, source, organiser, organiser_type, organiser_club_id, organiser_url, entry_url";

function makeDb(): StagingDb {
  return {
    async findLink({ event_id, organisation_id, relationship }) {
      const { data, error } = await supabaseAdmin
        .from("organisation_event_links")
        .select("id, review_status")
        .eq("event_id", event_id)
        .eq("organisation_id", organisation_id)
        .eq("relationship", relationship)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ?? null;
    },

    async findEvidence(draft: EvidenceDraft) {
      const { data, error } = await supabaseAdmin
        .from("identity_evidence")
        .select("id")
        .eq("source_url", draft.source_url)
        .eq("evidence_type", draft.evidence_type)
        .eq("supporting_fact", draft.supporting_fact)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ?? null;
    },

    async insertEvidence(draft: EvidenceDraft) {
      const { data, error } = await supabaseAdmin
        .from("identity_evidence")
        .insert({
          source_url: draft.source_url,
          evidence_type: draft.evidence_type,
          supporting_fact: draft.supporting_fact,
        })
        .select("id")
        .maybeSingle();
      // The generated `fingerprint` column is unique: a concurrent retry lands
      // on the existing observation rather than a duplicate.
      if (error) {
        if (error.code === "23505") {
          const again = await this.findEvidence(draft);
          if (again) return again;
        }
        throw new Error(error.message);
      }
      if (!data) throw new Error("evidence_insert_failed");
      return data;
    },

    async insertProposedLink({ event_id, organisation_id, relationship, confidence }) {
      const { data, error } = await supabaseAdmin
        .from("organisation_event_links")
        .insert({ event_id, organisation_id, relationship, confidence, review_status: "proposed" })
        .select("id, review_status")
        .maybeSingle();
      if (error) {
        // organisation_event_links_unique — converge on the existing link.
        if (error.code === "23505") {
          const existing = await this.findLink({ event_id, organisation_id, relationship });
          if (existing) return { ...existing, created: false };
        }
        throw new Error(error.message);
      }
      if (!data) throw new Error("link_insert_failed");
      return { ...data, created: true };
    },

    async attachEvidence(link_id, evidence_ids) {
      if (evidence_ids.length === 0) return;
      const { error } = await supabaseAdmin.from("organisation_event_link_evidence").upsert(
        evidence_ids.map((evidence_id) => ({ link_id, evidence_id })),
        { onConflict: "link_id,evidence_id", ignoreDuplicates: true },
      );
      if (error) throw new Error(error.message);
    },
  };
}

export const stageOrlCandidate = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        event_id: z.string().uuid(),
        /** Echoed back from the reviewed row — must match the recomputed candidate. */
        organisation_id: z.string().uuid(),
        /** Explicit per-row confirmation; there is no bulk path. */
        confirm: z.literal(true),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<StagingResult> => {
    if (!(await isAdminAuthenticated())) throw new Error("Unauthorized");

    // Step 1 scope: future ACTIVE events only. sort_date is a date column, so the
    // guard is the current UTC date in YYYY-MM-DD, matching the reconciliation view.
    const todayUtc = currentUtcDate();

    const { data: eventRow, error: eventError } = await supabaseAdmin
      .from("events")
      .select(EVENT_COLUMNS)
      .eq("id", data.event_id)
      .eq("status", "ACTIVE")
      .gte("sort_date", todayUtc)
      .maybeSingle();
    if (eventError) throw new Error(eventError.message);
    if (!eventRow) {
      return {
        ok: false,
        code: "not_single_candidate",
        reason: `Event not found, not active, or not dated today or later (${todayUtc}). Staging is limited to future active events.`,
      };
    }

    const graph = await fetchOrlGraph();
    // Demand is deliberately zero here: it orders review lists only and must
    // never influence eligibility or the staged relationship.
    const row = reconcileEvent(eventRow as unknown as ReconciliationEventInput, graph, {
      search_clicks: 0,
      reminder_requests: 0,
    });

    const plan = planStaging(row);
    if (plan.allowed && plan.organisation_id !== data.organisation_id) {
      return {
        ok: false,
        code: "not_single_candidate",
        reason:
          "The reviewed candidate no longer matches the current ORL evidence. Reload the reconciliation view before staging.",
      };
    }

    return applyStaging(makeDb(), plan);
  });
