/**
 * ORL Step 2 — manual staging into the EXISTING ORL review pipeline.
 *
 * This module is pure: it decides whether a Step 1 reconciliation row may be
 * staged, which typed relationship it may carry, and which evidence provenance
 * attaches — then applies that decision through an injected write interface.
 *
 * Doctrine (D74/D75):
 * - Staging creates a `proposed` organisation_event_link only. Acceptance stays
 *   in the existing review state machine on Organiser identities.
 * - Nothing here writes events.organiser, events.organiser_club_id or any other
 *   public projection field.
 * - Only a single-candidate `candidate_match` may be staged. Ambiguous,
 *   unmatched, unresolved-seed and already-linked rows are reconciliation work.
 * - `organises` requires an explicit organiser-role basis (organiser-owned
 *   domain, canonical name or alias). A shared / social / entry-platform host
 *   can never produce it.
 * - Evidence is never invented: staging reuses an exact existing identity
 *   evidence row, or deterministically records the exact URL-bearing clue with
 *   full path/tenant/role detail. A name-only match has no safe observation and
 *   is blocked with an explanation.
 * - Demand signals never influence eligibility or relationship.
 */

import type { CandidateBasis, CandidateMatch, ReconciliationRow } from "@/lib/orl-reconciliation";

export type EvidenceDraft = {
  source_url: string;
  evidence_type: "platform_metadata";
  supporting_fact: string;
};

export type StagingBlockCode =
  | "not_single_candidate"
  | "already_accepted"
  | "already_in_review"
  | "previously_rejected"
  | "no_organiser_role_basis"
  | "no_attachable_evidence";

export type StagingPlan =
  | {
      allowed: true;
      event_id: string;
      organisation_id: string;
      organisation_name: string;
      relationship: CandidateMatch["suggested_relationship"];
      /**
       * The live organisation_event_links check constraint allows exactly
       * 'verified' | 'plausible_needs_review'. A newly staged proposal is always
       * plausible_needs_review, however exact the clue: 'verified' is a
       * conclusion of review/acceptance, never of staging.
       */
      confidence: "plausible_needs_review";
      /** Existing identity_evidence ids reused verbatim. */
      reuse_evidence_ids: string[];
      /** Deterministic observation to record when no exact evidence row exists. */
      create_evidence: EvidenceDraft | null;
      bases: CandidateBasis[];
    }
  | { allowed: false; code: StagingBlockCode; reason: string };

const ORGANISER_ROLE_BASES: CandidateBasis["kind"][] = [
  "organiser_owned_domain",
  "canonical_name",
  "alias_name",
  "existing_link",
];

/** Decide, deterministically, whether one reconciliation row may be staged. */
export function planStaging(row: ReconciliationRow): StagingPlan {
  // An accepted ORL relationship is already confirmed: nothing to stage.
  const accepted = row.linked.filter((l) => l.review_status === "accepted");
  if (accepted.length > 0) {
    return {
      allowed: false,
      code: "already_accepted",
      reason: `Already confirmed in ORL (${accepted
        .map((l) => `${l.organisation_name}: ${l.relationship}`)
        .join("; ")}). Nothing to stage.`,
    };
  }

  if (row.state !== "candidate_match" || row.candidates.length !== 1) {
    return {
      allowed: false,
      code: "not_single_candidate",
      reason:
        "Only a candidate match with exactly one explainable organisation can be staged here. Ambiguous, unmatched, unresolved-seed and already-linked rows stay reconciliation work and are reviewed in Organiser identities.",
    };
  }

  const candidate = row.candidates[0];
  const relationship = candidate.suggested_relationship;

  const existing = row.linked.find(
    (l) => l.organisation_id === candidate.organisation_id && l.relationship === relationship,
  );
  if (existing) {
    if (existing.review_status === "accepted") {
      return {
        allowed: false,
        code: "already_accepted",
        reason: `This ${relationship} relationship is already accepted in ORL. Nothing to stage.`,
      };
    }
    if (existing.review_status === "rejected") {
      return {
        allowed: false,
        code: "previously_rejected",
        reason: `This ${relationship} relationship was rejected in ORL. Use the existing review history and reopen workflow in Organiser identities — staging must never silently recreate it.`,
      };
    }
    return {
      allowed: false,
      code: "already_in_review",
      reason: `This ${relationship} relationship is already in ORL review (status ${existing.review_status}). Review it in Organiser identities.`,
    };
  }

  if (relationship === "organises") {
    const hasRoleBasis = candidate.bases.some(
      (b) => ORGANISER_ROLE_BASES.includes(b.kind) && !b.shared_host,
    );
    if (!hasRoleBasis) {
      return {
        allowed: false,
        code: "no_organiser_role_basis",
        reason:
          "No explicit organiser-role basis was identified. A shared, social or entry-platform host alone can never stage an `organises` relationship.",
      };
    }
  }

  const reuse_evidence_ids = [
    ...new Set(candidate.bases.map((b) => b.evidence_id).filter((id): id is string => Boolean(id))),
  ];

  let create_evidence: EvidenceDraft | null = null;
  if (reuse_evidence_ids.length === 0) {
    const urlBasis = candidate.bases.find((b) => b.url);
    if (!urlBasis || !urlBasis.url) {
      return {
        allowed: false,
        code: "no_attachable_evidence",
        reason:
          "No exact ORL evidence row supports this candidate and the match rests on a name only, so no evidence observation can be recorded safely. Weak evidence is never invented to satisfy a foreign key — resolve this in Organiser identities instead.",
      };
    }
    create_evidence = {
      source_url: urlBasis.url,
      evidence_type: "platform_metadata",
      supporting_fact: `ORL staging (${relationship}) for event ${row.event.slug ?? row.event.id}: ${urlBasis.detail}`,
    };
  }

  return {
    allowed: true,
    event_id: row.event.id,
    organisation_id: candidate.organisation_id,
    organisation_name: candidate.organisation_name,
    relationship,
    // Always plausible_needs_review — exact evidence does not confer verification.
    confidence: "plausible_needs_review",
    reuse_evidence_ids,
    create_evidence,
    bases: candidate.bases,
  };
}

// ---------------------------------------------------------------------------
// Apply — idempotent write through an injected interface
// ---------------------------------------------------------------------------

export type StagingDb = {
  /** Existing link for the exact (event, organisation, relationship) triple. */
  findLink(args: {
    event_id: string;
    organisation_id: string;
    relationship: string;
  }): Promise<{ id: string; review_status: string } | null>;
  /** Existing evidence row with the same fingerprint inputs (URL + type + fact). */
  findEvidence(draft: EvidenceDraft): Promise<{ id: string } | null>;
  /** Insert evidence; must resolve to the existing row on fingerprint conflict. */
  insertEvidence(draft: EvidenceDraft): Promise<{ id: string }>;
  /** Insert a proposed link; must resolve to the existing row on unique conflict. */
  insertProposedLink(args: {
    event_id: string;
    organisation_id: string;
    relationship: string;
    confidence: string;
  }): Promise<{ id: string; review_status: string; created: boolean }>;
  /** Attach evidence to the link, ignoring duplicates (composite PK). */
  attachEvidence(link_id: string, evidence_ids: string[]): Promise<void>;
};

export type StagingResult =
  | {
      ok: true;
      link_id: string;
      review_status: string;
      relationship: string;
      organisation_id: string;
      evidence_ids: string[];
      created: boolean;
    }
  | { ok: false; code: StagingBlockCode; reason: string };

/**
 * Apply a plan. Repeated calls converge on the same link, evidence and review
 * rows: the unique index and the evidence fingerprint are the idempotency keys,
 * and the DB trigger writes the single initial `proposed` audit row.
 */
export async function applyStaging(db: StagingDb, plan: StagingPlan): Promise<StagingResult> {
  if (!plan.allowed) return { ok: false, code: plan.code, reason: plan.reason };

  const existing = await db.findLink({
    event_id: plan.event_id,
    organisation_id: plan.organisation_id,
    relationship: plan.relationship,
  });
  if (existing) {
    if (existing.review_status === "accepted") {
      return {
        ok: false,
        code: "already_accepted",
        reason: "This relationship is already accepted in ORL.",
      };
    }
    if (existing.review_status === "rejected") {
      return {
        ok: false,
        code: "previously_rejected",
        reason:
          "This relationship was rejected in ORL. Reopen it through the existing review history instead.",
      };
    }
    // proposed / reopened: already staged — report the existing state, do not
    // create a second link or another review row.
    return {
      ok: true,
      link_id: existing.id,
      review_status: existing.review_status,
      relationship: plan.relationship,
      organisation_id: plan.organisation_id,
      evidence_ids: plan.reuse_evidence_ids,
      created: false,
    };
  }

  const evidenceIds = [...plan.reuse_evidence_ids];
  if (plan.create_evidence) {
    const found = await db.findEvidence(plan.create_evidence);
    const row = found ?? (await db.insertEvidence(plan.create_evidence));
    evidenceIds.push(row.id);
  }
  if (evidenceIds.length === 0) {
    return {
      ok: false,
      code: "no_attachable_evidence",
      reason: "No evidence could be attached safely, so nothing was staged.",
    };
  }

  const link = await db.insertProposedLink({
    event_id: plan.event_id,
    organisation_id: plan.organisation_id,
    relationship: plan.relationship,
    confidence: plan.confidence,
  });
  await db.attachEvidence(link.id, evidenceIds);

  return {
    ok: true,
    link_id: link.id,
    review_status: link.review_status,
    relationship: plan.relationship,
    organisation_id: plan.organisation_id,
    evidence_ids: evidenceIds,
    created: link.created,
  };
}
