import { createHmac } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResearchEventFacts } from "@/components/admin/ResearchEventFacts";
import { researchEnvelope, researchIntakeEnvelope } from "./source-research";
import example from "../../services/race-monitor/research-payload-example.json";

const fixture = {
  ...example,
  observations: example.observations.map((observation) => ({
    ...observation,
    conflicts: observation.conflicts as string[],
    proposal: {
      ...observation.proposal,
      extraction: {
        ...observation.proposal.extraction,
        issues: observation.proposal.extraction.issues as string[],
      },
    },
  })),
};

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: mocks }));

function signed(body: unknown, signatureOverride?: string) {
  const raw = JSON.stringify(body);
  const ts = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", "offline-test-only").update(`${ts}.${raw}`).digest("hex");
  return new Request("https://example.org/api/public/ingest/research", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-renm-timestamp": ts,
      "x-renm-signature": signatureOverride ?? signature,
    },
    body: raw,
  });
}

async function post(body: unknown, signature?: string) {
  const { Route } = await import("@/routes/api/public/ingest/research");
  const route = Route as unknown as {
    options: { server: { handlers: { POST: (ctx: { request: Request }) => Promise<Response> } } };
  };
  return route.options.server.handlers.POST({ request: signed(body, signature) });
}

describe("structured research handoff", () => {
  beforeEach(() => {
    vi.stubEnv("RESEARCH_FEED_SECRET", "offline-test-only");
    mocks.rpc.mockReset().mockResolvedValue({ data: { received: 1, inserted: 1 }, error: null });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("validates Python output and renders the existing four-column review table", () => {
    const parsed = researchIntakeEnvelope.parse(fixture);
    const proposal = parsed.observations[0].proposal;
    if (proposal.kind !== "page_change" || !proposal.extraction) throw new Error("fixture");
    const html = renderToStaticMarkup(<ResearchEventFacts extraction={proposal.extraction} />);
    for (const heading of [
      "Database field",
      "Current value",
      "Source candidate",
      "Supporting evidence",
    ])
      expect(html).toContain(heading);
    expect(html).toContain("2027-03-21");
    expect(html).toContain("Race date: 21 March 2027");
    expect(html).toContain("Select a record");
    expect(html).not.toContain("<pre");
  });

  it("accepts signed structured facts only through the existing review RPC", async () => {
    expect((await post(fixture)).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("ingest_source_research", {
      _observations: fixture.observations,
    });
  });

  it("rejects blank proposals, page dumps and hidden issues before any database call", async () => {
    for (const mutate of [
      (o: (typeof fixture.observations)[number]) => {
        Reflect.deleteProperty(o.proposal, "extraction");
      },
      (o: (typeof fixture.observations)[number]) => {
        o.evidence.summary = "page text ".repeat(100);
      },
      (o: (typeof fixture.observations)[number]) => {
        o.evidence.summary = "<p>Raw page</p>";
      },
      (o: (typeof fixture.observations)[number]) => {
        o.proposal.extraction.issues = ["Mixed editions"];
      },
      (o: (typeof fixture.observations)[number]) => {
        o.proposal.extraction.facts[0].field = "course_profile";
      },
      (o: (typeof fixture.observations)[number]) => {
        o.proposal.extraction.missing_fields = [];
      },
    ]) {
      const body = structuredClone(fixture);
      mutate(body.observations[0]);
      expect((await post(body)).status).toBe(400);
    }
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("preserves historical evidence compatibility, but refuses it as a new import", () => {
    const old = structuredClone(fixture);
    Reflect.deleteProperty(old.observations[0].proposal, "extraction");
    old.observations[0].evidence.summary = "historical page text ".repeat(100);
    expect(researchEnvelope.safeParse(old).success).toBe(true);
    expect(researchIntakeEnvelope.safeParse(old).success).toBe(false);
  });

  it("retains unknowns and explicit conflicts without inventing facts", () => {
    const body = structuredClone(fixture);
    const extraction = body.observations[0].proposal.extraction;
    extraction.missing_fields.push(...extraction.facts.map((f) => f.field));
    extraction.facts = [];
    expect(researchIntakeEnvelope.safeParse(body).success).toBe(false);
    extraction.issues = ["No supported facts; rendered review needed."];
    body.observations[0].conflicts = [...extraction.issues];
    expect(researchIntakeEnvelope.safeParse(body).success).toBe(true);
  });

  it("keeps authentication and duplicate identity refusal intact", async () => {
    expect((await post(fixture, "a".repeat(64))).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
    const duplicate = {
      ...fixture,
      observations: [...fixture.observations, ...fixture.observations],
    };
    expect((await post(duplicate)).status).toBe(400);
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "immutable ID or disabled source" },
    });
    expect((await post(fixture)).status).toBe(409);
  });
});
