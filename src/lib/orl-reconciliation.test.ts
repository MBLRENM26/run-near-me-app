import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildClueBundle,
  isSharedPlatformHost,
  reconcileEvent,
  sortByReviewPriority,
  summariseReconciliation,
  type OrlGraph,
  type ReconciliationEventInput,
} from "./orl-reconciliation";
import { buildClubHostIndex, proposeOrganiser } from "./organiser-resolution";

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
    id: "e1",
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

const ORG_CLUB = {
  id: "o1",
  canonical_name: "Sedgefield Harriers",
  website_domain: "sedgefieldharriers.co.uk",
  status: "confirmed",
};
const ORG_OTHER = {
  id: "o2",
  canonical_name: "Northern Race Co",
  website_domain: "northernrace.example",
  status: "candidate",
};

describe("clue bundle", () => {
  it("retains the full URL, path and tenant — not just the host", () => {
    const clues = buildClueBundle(
      event({ entry_url: "https://zigzagrunning.eventrac.co.uk/events/1234/my-race" }),
    );
    const entry = clues.find((c) => c.kind === "entry_platform_record")!;
    expect(entry.url).toBe("https://zigzagrunning.eventrac.co.uk/events/1234/my-race");
    expect(entry.host).toBe("zigzagrunning.eventrac.co.uk");
    expect(entry.tenant).toBe("zigzagrunning");
    expect(entry.path).toBe("/events/1234/my-race");
    expect(entry.role).toBe("action_destination");
    expect(entry.shared_host).toBe(true);
  });

  it("types a Facebook endpoint as a social identity clue, not an organiser", () => {
    const clues = buildClueBundle(
      event({ organiser_url: "https://www.facebook.com/somerunningclub" }),
    );
    const social = clues.find((c) => c.kind === "social_endpoint")!;
    expect(social.role).toBe("identity");
    expect(social.shared_host).toBe(true);
    expect(isSharedPlatformHost("facebook.com")).toBe(true);
  });

  it("keeps the source clue and the current flat label as separate provisional clues", () => {
    const clues = buildClueBundle(event({ organiser: "TBC" }));
    expect(clues.map((c) => c.kind)).toContain("governing_body_source");
    const flat = clues.find((c) => c.kind === "current_organiser_text")!;
    expect(flat.role).toBe("provisional");
  });
});

describe("reconcileEvent", () => {
  it("classifies an existing direct ORL link as linked_in_orl with review detail", () => {
    const graph: OrlGraph = {
      ...EMPTY_GRAPH,
      organisations: [ORG_CLUB],
      aliases: [{ organisation_id: "o1", alias_name: "Sedgefield H", alias_type: "trading" }],
      platform_accounts: [
        {
          organisation_id: "o1",
          platform: "facebook",
          account_url: "https://facebook.com/sedgefieldharriers",
          tenant_slug: null,
          platform_identifier: null,
          confidence: "high",
        },
      ],
      links: [
        {
          id: "l1",
          event_id: "e1",
          organisation_id: "o1",
          relationship: "organises",
          confidence: "high",
          review_status: "accepted",
        },
      ],
      link_evidence_counts: { l1: 3 },
      link_review_counts: { l1: 2 },
    };
    const row = reconcileEvent(event(), graph);
    expect(row.state).toBe("linked_in_orl");
    expect(row.linked[0]).toMatchObject({
      organisation_name: "Sedgefield Harriers",
      relationship: "organises",
      review_status: "accepted",
      evidence_count: 3,
      review_count: 2,
    });
    expect(row.linked[0].aliases).toEqual(["Sedgefield H (trading)"]);
    expect(row.linked[0].platform_accounts).toHaveLength(1);
  });

  it("produces a candidate from an exact alias name match, with a reason", () => {
    const graph: OrlGraph = {
      ...EMPTY_GRAPH,
      organisations: [ORG_CLUB],
      aliases: [{ organisation_id: "o1", alias_name: "Sedgefield H", alias_type: "trading" }],
    };
    const row = reconcileEvent(event({ organiser: " sedgefield h " }), graph);
    expect(row.state).toBe("candidate_match");
    expect(row.candidates[0].organisation_id).toBe("o1");
    expect(row.candidates[0].suggested_relationship).toBe("organises");
    expect(row.candidates[0].reasons[0]).toContain("alias");
  });

  it("produces a candidate from an exact platform-account endpoint match", () => {
    const graph: OrlGraph = {
      ...EMPTY_GRAPH,
      organisations: [ORG_CLUB],
      platform_accounts: [
        {
          organisation_id: "o1",
          platform: "facebook",
          account_url: "https://www.facebook.com/sedgefieldharriers",
          tenant_slug: null,
          platform_identifier: null,
          confidence: "high",
        },
      ],
    };
    const row = reconcileEvent(
      event({ organiser_url: "https://facebook.com/sedgefieldharriers" }),
      graph,
    );
    expect(row.state).toBe("candidate_match");
    expect(row.candidates[0].reasons[0]).toContain("exact facebook account endpoint match");
  });

  it("keeps an exact Facebook account endpoint as source_suggests identity evidence, never organises", () => {
    const graph: OrlGraph = {
      ...EMPTY_GRAPH,
      organisations: [ORG_CLUB],
      platform_accounts: [
        {
          organisation_id: "o1",
          platform: "facebook",
          account_url: "https://www.facebook.com/sedgefieldharriers",
          tenant_slug: null,
          platform_identifier: null,
          confidence: "high",
        },
      ],
    };
    const row = reconcileEvent(
      event({ organiser_url: "https://facebook.com/sedgefieldharriers" }),
      graph,
    );
    expect(row.state).toBe("candidate_match");
    expect(row.candidates).toHaveLength(1);
    expect(row.candidates[0].organisation_id).toBe("o1");
    // Channel/identity evidence must not collapse into an event role.
    expect(row.candidates[0].suggested_relationship).toBe("source_suggests");
    // Full exact endpoint is preserved in the reason and the clue bundle.
    expect(row.candidates[0].reasons[0]).toContain(
      "exact facebook account endpoint match (https://www.facebook.com/sedgefieldharriers)",
    );
    const socialClue = row.clues.find((c) => c.kind === "social_endpoint");
    expect(socialClue?.url).toBe("https://facebook.com/sedgefieldharriers");
  });

  it("suggests entry_platform_hosts — never organises — from an entry-platform account", () => {
    const graph: OrlGraph = {
      ...EMPTY_GRAPH,
      organisations: [ORG_OTHER],
      platform_accounts: [
        {
          organisation_id: "o2",
          platform: "sientries",
          account_url: "https://www.sientries.co.uk/event.php?elid=99",
          tenant_slug: null,
          platform_identifier: null,
          confidence: "medium",
        },
      ],
    };
    const row = reconcileEvent(
      event({ entry_url: "https://sientries.co.uk/event.php?elid=99" }),
      graph,
    );
    expect(row.state).toBe("candidate_match");
    expect(row.candidates[0].suggested_relationship).toBe("entry_platform_hosts");
  });

  it("never treats an entry-platform host alone as the organiser", () => {
    const graph: OrlGraph = {
      ...EMPTY_GRAPH,
      // An organisation whose recorded domain is a shared entry platform must
      // never win a host-only match.
      organisations: [{ ...ORG_OTHER, website_domain: "sientries.co.uk" }],
    };
    const row = reconcileEvent(
      event({ entry_url: "https://sientries.co.uk/event.php?elid=1" }),
      graph,
    );
    expect(row.state).toBe("unmatched");
    expect(row.candidates).toHaveLength(0);
  });

  it("keeps several possible organisations ambiguous", () => {
    const graph: OrlGraph = {
      ...EMPTY_GRAPH,
      organisations: [ORG_CLUB, ORG_OTHER],
      aliases: [
        { organisation_id: "o1", alias_name: "Durham Ten", alias_type: "source" },
        { organisation_id: "o2", alias_name: "Durham Ten", alias_type: "trading" },
      ],
    };
    const row = reconcileEvent(event({ organiser: "Durham Ten" }), graph);
    expect(row.state).toBe("ambiguous");
    expect(row.candidates).toHaveLength(2);
  });

  it("uses existing seed quarantine for unresolved_seed", () => {
    const graph: OrlGraph = {
      ...EMPTY_GRAPH,
      unresolved: [
        { reason: "no_event_match", csv_row_number: 42, candidate_event_ids: ["e1", "e9"] },
      ],
    };
    const row = reconcileEvent(event(), graph);
    expect(row.state).toBe("unresolved_seed");
    expect(row.unresolved_reasons[0]).toContain("no_event_match");
  });

  it("matches a tenant identifier inside a full URL but not a bare host", () => {
    const graph: OrlGraph = {
      ...EMPTY_GRAPH,
      organisations: [ORG_CLUB],
      platform_accounts: [
        {
          organisation_id: "o1",
          platform: "eventrac",
          account_url: null,
          tenant_slug: "zigzagrunning",
          platform_identifier: null,
          confidence: "medium",
        },
      ],
    };
    const withTenant = reconcileEvent(
      event({ entry_url: "https://zigzagrunning.eventrac.co.uk/events/1" }),
      graph,
    );
    expect(withTenant.state).toBe("candidate_match");
    expect(withTenant.candidates[0].suggested_relationship).toBe("entry_platform_hosts");

    const hostOnly = reconcileEvent(event({ entry_url: "https://eventrac.co.uk" }), graph);
    expect(hostOnly.state).toBe("unmatched");
  });
});

describe("demand signals", () => {
  const graph = EMPTY_GRAPH;

  it("orders rows without changing classification", () => {
    const quiet = reconcileEvent(event({ id: "a", name: "A race" }), graph, {
      search_clicks: 0,
      reminder_requests: 0,
    });
    const busy = reconcileEvent(event({ id: "b", name: "B race" }), graph, {
      search_clicks: 4,
      reminder_requests: 7,
    });
    expect(quiet.state).toBe(busy.state);
    expect(sortByReviewPriority([quiet, busy]).map((r) => r.event.id)).toEqual(["b", "a"]);
    expect(busy.demand_total).toBe(11);
  });
});

describe("summariseReconciliation", () => {
  it("counts every row, independent of any display cap", () => {
    const rows = Array.from({ length: 250 }, (_, i) =>
      reconcileEvent(event({ id: `e${i}`, name: `Race ${i}` }), EMPTY_GRAPH),
    );
    const totals = summariseReconciliation(rows);
    expect(totals.future_events).toBe(250);
    expect(totals.unmatched).toBe(250);
    // A 200-row display slice must not change the totals.
    expect(summariseReconciliation(rows).future_events).toBeGreaterThan(
      sortByReviewPriority(rows).slice(0, 200).length,
    );
  });
});

describe("provisional host matcher safety", () => {
  it("never chooses the first club for a shared or social host", () => {
    const index = buildClubHostIndex([
      { id: "c1", name: "Club One", website_url: "https://facebook.com/clubone" },
      { id: "c2", name: "Club Two", website_url: "https://facebook.com/clubtwo" },
    ]);
    expect(
      proposeOrganiser({ organiser: null, organiser_url: "https://facebook.com/clubone" }, index),
    ).toBeNull();
  });

  it("never chooses the first club when one host maps to several clubs", () => {
    const index = buildClubHostIndex([
      { id: "c1", name: "Club One", website_url: "https://sharedclubhost.example" },
      { id: "c2", name: "Club Two", website_url: "https://sharedclubhost.example" },
    ]);
    expect(
      proposeOrganiser(
        { organiser: null, organiser_url: "https://sharedclubhost.example/races" },
        index,
      ),
    ).toBeNull();
  });
});

describe("admin access + read-only guarantees in the server module", () => {
  const source = readFileSync(
    new URL("./orl-reconciliation.functions.ts", import.meta.url),
    "utf8",
  );

  it("still gates every handler behind the existing admin session check", () => {
    expect(source).toContain("admin-session.server");
    const handlers = source.match(/\.handler\(/g) ?? [];
    const guards = source.match(/await requireAdminOrThrow\(\)/g) ?? [];
    expect(handlers.length).toBeGreaterThan(0);
    expect(guards.length).toBe(handlers.length);
  });

  it("performs no writes, staging or review mutations", () => {
    for (const forbidden of [".insert(", ".update(", ".upsert(", ".delete(", ".rpc("]) {
      expect(source).not.toContain(forbidden);
    }
  });

  it("never selects subscriber email addresses", () => {
    expect(source).toMatch(/email_subscriptions[\s\S]{0,120}select\("event_id"\)/);
    expect(source).not.toMatch(/select\([^)]*email/);
  });
});

describe("accepted vs pending ORL links", () => {
  const baseGraph = (review_status: string): OrlGraph => ({
    ...EMPTY_GRAPH,
    organisations: [ORG_CLUB],
    links: [
      {
        id: "l1",
        event_id: "e1",
        organisation_id: "o1",
        relationship: "organises",
        confidence: "high",
        review_status,
      },
    ],
  });

  it("treats a proposed link as reconciliation work, not a confirmed relationship", () => {
    const row = reconcileEvent(event(), baseGraph("proposed"));
    expect(row.state).toBe("candidate_match");
    expect(row.candidates[0]?.reasons.join(" ")).toContain("awaiting review");
    expect(row.linked[0]?.review_status).toBe("proposed");
  });

  it("treats a rejected link as neither confirmed nor a candidate", () => {
    const row = reconcileEvent(event(), baseGraph("rejected"));
    expect(row.state).toBe("unmatched");
    expect(row.candidates).toHaveLength(0);
  });

  it("only an accepted link is linked_in_orl", () => {
    expect(reconcileEvent(event(), baseGraph("accepted")).state).toBe("linked_in_orl");
  });
});

describe("totals and paging", () => {
  const rows = Array.from({ length: 250 }, (_, i) =>
    reconcileEvent(event({ id: `e${i}`, slug: `race-${i}`, name: `Race ${i}` }), EMPTY_GRAPH, {
      search_clicks: i,
      reminder_requests: 0,
    }),
  );

  it("computes totals over every row, not just a displayed page", () => {
    const totals = summariseReconciliation(rows);
    expect(totals.future_events).toBe(250);
    expect(totals.unmatched).toBe(250);
    const page = sortByReviewPriority(rows).slice(0, 100);
    expect(page).toHaveLength(100);
    expect(summariseReconciliation(rows).future_events).toBeGreaterThan(page.length);
  });

  it("pages deterministically with no overlap or gaps", () => {
    const ordered = sortByReviewPriority(rows);
    const first = ordered.slice(0, 100).map((r) => r.event.id);
    const second = ordered.slice(100, 200).map((r) => r.event.id);
    expect(new Set([...first, ...second]).size).toBe(200);
    expect(ordered[0]?.demand_total).toBe(249);
  });
});

describe("dedicated-tenant organiser evidence (Part A)", () => {
  const ZIGZAG = {
    id: "o9",
    canonical_name: "Zig Zag Running",
    website_domain: null,
    status: "confirmed",
  };

  function graphWith(confidence: string, tenant: string | null = "zigzagrunning"): OrlGraph {
    return {
      ...EMPTY_GRAPH,
      organisations: [ZIGZAG],
      platform_accounts: [
        {
          organisation_id: ZIGZAG.id,
          platform: "eventrac",
          account_url: null,
          tenant_slug: tenant,
          platform_identifier: null,
          confidence,
        },
      ],
    };
  }

  it("proposes organises from a verified dedicated tenant plus an event-specific path", () => {
    const row = reconcileEvent(
      event({
        name: "The Lucky Horseshoe",
        entry_url: "https://zigzagrunning.eventrac.co.uk/e/the-lucky-horseshoe-11111",
      }),
      graphWith("verified"),
    );
    expect(row.state).toBe("candidate_match");
    const c = row.candidates[0];
    expect(c.organisation_name).toBe("Zig Zag Running");
    expect(c.suggested_relationship).toBe("organises");
    const basis = c.bases.find((b) => b.kind === "verified_dedicated_tenant")!;
    expect(basis.url).toBe("https://zigzagrunning.eventrac.co.uk/e/the-lucky-horseshoe-11111");
    expect(basis.tenant).toBe("zigzagrunning");
    expect(basis.path).toBe("/e/the-lucky-horseshoe-11111");
    expect(basis.account_confidence).toBe("verified");
    // Still only a proposal: staging remains plausible_needs_review.
    expect(planStaging(row)).toMatchObject({
      allowed: true,
      relationship: "organises",
      confidence: "plausible_needs_review",
    });
  });

  it("does not propose organises from a generic Eventrac or SI Entries host alone", () => {
    for (const url of [
      "https://www.eventrac.co.uk/e/some-race-1234",
      "https://www.sientries.co.uk/event.php?event_id=9999",
    ]) {
      const row = reconcileEvent(event({ entry_url: url }), graphWith("verified"));
      expect(
        row.candidates.some((c) => c.suggested_relationship === "organises"),
      ).toBe(false);
    }
  });

  it("does not propose organises from a plausible_needs_review account", () => {
    const row = reconcileEvent(
      event({ entry_url: "https://zigzagrunning.eventrac.co.uk/e/the-lucky-horseshoe-11111" }),
      graphWith("plausible_needs_review"),
    );
    expect(row.candidates[0].suggested_relationship).toBe("entry_platform_hosts");
    expect(planStaging(row)).toMatchObject({ allowed: true, relationship: "entry_platform_hosts" });
  });

  it("never proposes organises from a social account tenant", () => {
    const graph: OrlGraph = {
      ...EMPTY_GRAPH,
      organisations: [ZIGZAG],
      platform_accounts: [
        {
          organisation_id: ZIGZAG.id,
          platform: "facebook",
          account_url: "https://www.facebook.com/zigzagrunning",
          tenant_slug: "zigzagrunning",
          platform_identifier: null,
          confidence: "verified",
        },
      ],
    };
    const row = reconcileEvent(
      event({ organiser_url: "https://www.facebook.com/zigzagrunning/events/123" }),
      graph,
    );
    expect(row.candidates[0].suggested_relationship).not.toBe("organises");
  });
});
