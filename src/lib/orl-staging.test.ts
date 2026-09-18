import { describe, expect, it } from "vitest";
import { reconcileEvent, type OrlGraph, type ReconciliationEventInput } from "./orl-reconciliation";
import { applyStaging, planStaging, type StagingDb, type StagingPlan } from "./orl-staging";

const EMPTY_GRAPH: OrlGraph = {
  organisations: [],
  aliases: [],
  platform_accounts: [],
  evidence_by_organisation: [],
  links: [],
  link_evidence_counts: {},
  link_review_counts: {},
  unresolved: [],
};

function event(over: Partial<ReconciliationEventInput> = {}): ReconciliationEventInput {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "some-race",
    name: "Some Race",
    sort_date: "2026-11-01",
    town: "Sedgefield",
    county: "Durham",
    source: "england-athletics",
    organiser: null,
    organiser_type: null,
    organiser_club_id: null,
    organiser_url: null,
    entry_url: null,
    ...over,
  };
}

const CLUB = {
  id: "o1",
  canonical_name: "Sedgefield Harriers",
  website_domain: "sedgefieldharriers.co.uk",
  status: "confirmed",
};
const OTHER = {
  id: "o2",
  canonical_name: "Northern Race Co",
  website_domain: "northernrace.example",
  status: "candidate",
};

/** In-memory ORL write surface: records every table touched. */
function fakeDb(seed: { link?: { id: string; review_status: string }; evidenceId?: string } = {}) {
  const touched: string[] = [];
  const links: Array<{
    id: string;
    event_id: string;
    organisation_id: string;
    relationship: string;
    review_status: string;
  }> = [];
  const evidence: Array<{ id: string; key: string }> = [];
  const attachments: Array<{ link_id: string; evidence_id: string }> = [];
  let seq = 0;

  const db: StagingDb = {
    async findLink({ event_id, organisation_id, relationship }) {
      touched.push("select:organisation_event_links");
      if (seed.link) return seed.link;
      const hit = links.find(
        (l) =>
          l.event_id === event_id &&
          l.organisation_id === organisation_id &&
          l.relationship === relationship,
      );
      return hit ? { id: hit.id, review_status: hit.review_status } : null;
    },
    async findEvidence(draft) {
      touched.push("select:identity_evidence");
      const key = `${draft.source_url}|${draft.evidence_type}|${draft.supporting_fact}`;
      const hit = evidence.find((e) => e.key === key);
      return hit ? { id: hit.id } : null;
    },
    async insertEvidence(draft) {
      touched.push("insert:identity_evidence");
      const key = `${draft.source_url}|${draft.evidence_type}|${draft.supporting_fact}`;
      const existing = evidence.find((e) => e.key === key);
      if (existing) return { id: existing.id };
      seq += 1;
      const row = { id: `ev${seq}`, key };
      evidence.push(row);
      return { id: row.id };
    },
    async insertProposedLink(args) {
      touched.push("insert:organisation_event_links");
      const existing = links.find(
        (l) =>
          l.event_id === args.event_id &&
          l.organisation_id === args.organisation_id &&
          l.relationship === args.relationship,
      );
      if (existing) {
        return { id: existing.id, review_status: existing.review_status, created: false };
      }
      seq += 1;
      const row = { id: `link${seq}`, ...args, review_status: "proposed" };
      links.push(row);
      return { id: row.id, review_status: row.review_status, created: true };
    },
    async attachEvidence(link_id, evidence_ids) {
      touched.push("insert:organisation_event_link_evidence");
      for (const evidence_id of evidence_ids) {
        if (!attachments.some((a) => a.link_id === link_id && a.evidence_id === evidence_id)) {
          attachments.push({ link_id, evidence_id });
        }
      }
    },
  };

  if (seed.evidenceId) evidence.push({ id: seed.evidenceId, key: "seeded" });
  return { db, touched, links, evidence, attachments };
}

function planFor(
  e: ReconciliationEventInput,
  graph: OrlGraph,
  demand = { search_clicks: 0, reminder_requests: 0 },
): StagingPlan {
  return planStaging(reconcileEvent(e, graph, demand));
}

describe("staging eligibility", () => {
  it("stages one proposed organises link from an organiser-owned domain", async () => {
    const plan = planFor(
      event({ organiser_url: "https://sedgefieldharriers.co.uk/races/serpentine-10k" }),
      { ...EMPTY_GRAPH, organisations: [CLUB] },
    );
    expect(plan.allowed).toBe(true);
    if (!plan.allowed) return;
    expect(plan.relationship).toBe("organises");

    const { db, links, attachments } = fakeDb();
    const result = await applyStaging(db, plan);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.created).toBe(true);
    expect(result.review_status).toBe("proposed");
    expect(links).toHaveLength(1);
    expect(attachments).toHaveLength(1);
  });

  it("stages a social exact account match as source_suggests, never organises", () => {
    const plan = planFor(event({ organiser_url: "https://www.facebook.com/SedgefieldHarriers" }), {
      ...EMPTY_GRAPH,
      organisations: [CLUB],
      platform_accounts: [
        {
          organisation_id: "o1",
          platform: "facebook",
          account_url: "https://facebook.com/SedgefieldHarriers",
          tenant_slug: null,
          platform_identifier: null,
          confidence: "high",
        },
      ],
    });
    expect(plan.allowed).toBe(true);
    if (!plan.allowed) return;
    expect(plan.relationship).toBe("source_suggests");
    expect(plan.create_evidence?.source_url).toContain("facebook.com/SedgefieldHarriers");
  });

  it("stages an entry-platform tenant match as entry_platform_hosts, retaining the path", () => {
    const plan = planFor(
      event({ entry_url: "https://zigzagrunning.eventrac.co.uk/events/1234/spring-10k" }),
      {
        ...EMPTY_GRAPH,
        organisations: [OTHER],
        platform_accounts: [
          {
            organisation_id: "o2",
            platform: "eventrac",
            account_url: null,
            tenant_slug: "zigzagrunning",
            platform_identifier: null,
            confidence: "medium",
          },
        ],
      },
    );
    expect(plan.allowed).toBe(true);
    if (!plan.allowed) return;
    expect(plan.relationship).toBe("entry_platform_hosts");
    expect(plan.create_evidence?.supporting_fact).toContain("/events/1234/spring-10k");
  });

  it("blocks a shared-host-only row with no ORL match (unmatched)", () => {
    const plan = planFor(event({ entry_url: "https://www.sientries.co.uk/event.php?elid=1" }), {
      ...EMPTY_GRAPH,
      organisations: [CLUB],
    });
    expect(plan.allowed).toBe(false);
    if (plan.allowed) return;
    expect(plan.code).toBe("not_single_candidate");
  });

  it("blocks ambiguous rows with several candidates", () => {
    const plan = planFor(
      event({
        organiser: "Sedgefield Harriers",
        organiser_url: "https://northernrace.example/spring-10k",
      }),
      { ...EMPTY_GRAPH, organisations: [CLUB, OTHER] },
    );
    expect(plan.allowed).toBe(false);
    if (plan.allowed) return;
    expect(plan.code).toBe("not_single_candidate");
  });

  it("blocks unresolved-seed rows", () => {
    const plan = planFor(
      event({ organiser_url: "https://sedgefieldharriers.co.uk/races/serpentine-10k" }),
      {
        ...EMPTY_GRAPH,
        organisations: [CLUB],
        unresolved: [
          {
            reason: "slug_ambiguous",
            csv_row_number: 7,
            candidate_event_ids: ["11111111-1111-4111-8111-111111111111"],
          },
        ],
      },
    );
    expect(plan.allowed).toBe(false);
  });

  it("blocks a name-only match because no evidence observation can be recorded safely", () => {
    const plan = planFor(event({ organiser: "Sedgefield Harriers" }), {
      ...EMPTY_GRAPH,
      organisations: [CLUB],
    });
    expect(plan.allowed).toBe(false);
    if (plan.allowed) return;
    expect(plan.code).toBe("no_attachable_evidence");
  });
});

describe("existing link handling", () => {
  const graph: OrlGraph = { ...EMPTY_GRAPH, organisations: [CLUB] };
  const e = event({ organiser_url: "https://sedgefieldharriers.co.uk/races/serpentine-10k" });

  it("treats an accepted link as already confirmed", () => {
    const plan = planFor(e, {
      ...graph,
      links: [
        {
          id: "l1",
          event_id: e.id,
          organisation_id: "o1",
          relationship: "organises",
          confidence: "high",
          review_status: "accepted",
        },
      ],
    });
    expect(plan.allowed).toBe(false);
    if (plan.allowed) return;
    expect(plan.code).toBe("already_accepted");
  });

  it("reports a proposed link as already in review", () => {
    const plan = planFor(e, {
      ...graph,
      links: [
        {
          id: "l1",
          event_id: e.id,
          organisation_id: "o1",
          relationship: "organises",
          confidence: "medium",
          review_status: "proposed",
        },
      ],
    });
    expect(plan.allowed).toBe(false);
    if (plan.allowed) return;
    expect(plan.code).toBe("already_in_review");
  });

  it("never silently recreates a rejected link", () => {
    const plan = planFor(e, {
      ...graph,
      links: [
        {
          id: "l1",
          event_id: e.id,
          organisation_id: "o1",
          relationship: "organises",
          confidence: "low",
          review_status: "rejected",
        },
      ],
    });
    expect(plan.allowed).toBe(false);
    if (plan.allowed) return;
    expect(plan.code).toBe("previously_rejected");
  });

  it("refuses at apply time too when the link is already rejected", async () => {
    const plan = planFor(e, graph);
    const { db, links } = fakeDb({ link: { id: "l1", review_status: "rejected" } });
    const result = await applyStaging(db, plan);
    expect(result.ok).toBe(false);
    expect(links).toHaveLength(0);
  });
});

describe("idempotency and write surface", () => {
  const graph: OrlGraph = { ...EMPTY_GRAPH, organisations: [CLUB] };
  const e = event({ organiser_url: "https://sedgefieldharriers.co.uk/races/serpentine-10k" });

  it("repeated staging creates no duplicate link, evidence or attachment", async () => {
    const plan = planFor(e, graph);
    const { db, links, evidence, attachments } = fakeDb();
    const first = await applyStaging(db, plan);
    const second = await applyStaging(db, plan);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.link_id).toBe(first.link_id);
    expect(second.created).toBe(false);
    expect(links).toHaveLength(1);
    expect(evidence).toHaveLength(1);
    expect(attachments).toHaveLength(1);
  });

  it("touches only ORL tables — never events or any public projection", async () => {
    const plan = planFor(e, graph);
    const { db, touched } = fakeDb();
    await applyStaging(db, plan);
    expect(touched.some((t) => t.includes("events") && !t.includes("event_links"))).toBe(false);
    expect(touched).toContain("insert:organisation_event_links");
    expect(touched).toContain("insert:organisation_event_link_evidence");
  });

  it("reuses an existing exact evidence row instead of creating one", async () => {
    const plan = planFor(e, {
      ...graph,
      aliases: [{ organisation_id: "o1", alias_name: "Sedgefield Harriers", alias_type: "brand" }],
      evidence_by_organisation: [
        {
          organisation_id: "o1",
          evidence: {
            id: "existing-ev",
            source_url: "https://sedgefieldharriers.co.uk/races/serpentine-10k",
            evidence_type: "page_content",
            supporting_fact: "race page lists the club as organiser",
          },
        },
      ],
    });
    expect(plan.allowed).toBe(true);
    if (!plan.allowed) return;
    expect(plan.reuse_evidence_ids).toEqual(["existing-ev"]);
    expect(plan.create_evidence).toBeNull();

    const { db, evidence, attachments } = fakeDb();
    const result = await applyStaging(db, plan);
    expect(result.ok).toBe(true);
    expect(evidence).toHaveLength(0);
    expect(attachments[0]?.evidence_id).toBe("existing-ev");
  });
});

describe("demand separation", () => {
  it("demand changes neither eligibility nor the staged relationship", () => {
    const e = event({ organiser_url: "https://sedgefieldharriers.co.uk/races/serpentine-10k" });
    const graph: OrlGraph = { ...EMPTY_GRAPH, organisations: [CLUB] };
    const quiet = planFor(e, graph, { search_clicks: 0, reminder_requests: 0 });
    const busy = planFor(e, graph, { search_clicks: 99, reminder_requests: 42 });
    expect(quiet).toEqual(busy);
  });

  it("demand cannot unblock an ambiguous row", () => {
    const plan = planFor(
      event({
        organiser: "Sedgefield Harriers",
        organiser_url: "https://northernrace.example/spring-10k",
      }),
      { ...EMPTY_GRAPH, organisations: [CLUB, OTHER] },
      { search_clicks: 500, reminder_requests: 100 },
    );
    expect(plan.allowed).toBe(false);
  });
});
