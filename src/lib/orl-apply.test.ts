import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  canApplyOrganiser,
  describeOrganiserProjection,
  isPlaceholderOrganiser,
} from "./orl-apply";

const MIGRATION_PATH =
  "supabase/migrations/20260918230000_orl_accept_and_apply_organiser.sql";
const sql = readFileSync(MIGRATION_PATH, "utf8");

describe("apply eligibility", () => {
  it("treats blank, TBC and Unknown as replaceable placeholders only", () => {
    for (const v of [null, "", "  ", "TBC", "tbc", "Unknown", "N/A", "-"]) {
      expect(isPlaceholderOrganiser(v)).toBe(true);
    }
    expect(isPlaceholderOrganiser("Zig Zag Running")).toBe(false);
  });

  it("allows blank / TBC / Unknown to become the canonical organiser", () => {
    for (const prev of [null, "", "TBC", "Unknown"]) {
      const d = canApplyOrganiser({
        relationship: "organises",
        review_status: "proposed",
        current_organiser: prev,
        canonical_name: "Zig Zag Running",
      });
      expect(d.allowed).toBe(true);
      if (d.allowed) expect(d.new_organiser).toBe("Zig Zag Running");
    }
  });

  it("blocks a meaningful conflicting organiser", () => {
    const d = canApplyOrganiser({
      relationship: "organises",
      review_status: "proposed",
      current_organiser: "Some Other Club",
      canonical_name: "Zig Zag Running",
    });
    expect(d.allowed).toBe(false);
    if (!d.allowed) expect(d.code).toBe("organiser_conflict");
  });

  it("treats an already-equal organiser as a permitted no-op projection", () => {
    const d = canApplyOrganiser({
      relationship: "organises",
      review_status: "reopened",
      current_organiser: "zig zag running",
      canonical_name: "Zig Zag Running",
    });
    expect(d.allowed).toBe(true);
    if (d.allowed) expect(d.already_equal).toBe(true);
  });

  it("never projects for a non-organises relationship", () => {
    for (const rel of ["entry_platform_hosts", "source_suggests"]) {
      const d = canApplyOrganiser({
        relationship: rel,
        review_status: "proposed",
        current_organiser: null,
        canonical_name: "Zig Zag Running",
      });
      expect(d.allowed).toBe(false);
      if (!d.allowed) expect(d.code).toBe("relationship_not_organises");
    }
  });

  it("rejects invalid transitions and reports an accepted link as already applied", () => {
    const rejected = canApplyOrganiser({
      relationship: "organises",
      review_status: "rejected",
      current_organiser: null,
      canonical_name: "Zig Zag Running",
    });
    expect(rejected.allowed).toBe(false);
    if (!rejected.allowed) expect(rejected.code).toBe("invalid_transition");

    const accepted = canApplyOrganiser({
      relationship: "organises",
      review_status: "accepted",
      current_organiser: "Zig Zag Running",
      canonical_name: "Zig Zag Running",
    });
    expect(accepted.allowed).toBe(false);
    if (!accepted.allowed) expect(accepted.code).toBe("already_applied");
  });

  it("states the exact public change for the confirmation", () => {
    expect(describeOrganiserProjection(null, "Zig Zag Running")).toBe(
      "Current organiser blank → Zig Zag Running",
    );
    expect(describeOrganiserProjection("TBC", "Zig Zag Running")).toBe(
      'Current organiser "TBC" → Zig Zag Running',
    );
  });
});

describe("accept_and_apply_organiser migration contract", () => {
  it("defines exactly one security-definer function granted to service_role only", () => {
    expect(sql.match(/CREATE OR REPLACE FUNCTION/g)?.length).toBe(1);
    expect(sql).toContain("public.accept_and_apply_organiser");
    expect(sql).toContain("SECURITY DEFINER");
    expect(sql).toContain("SET search_path = public");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.accept_and_apply_organiser");
    expect(sql).toContain("TO service_role");
    expect(sql).toContain("FROM anon");
    expect(sql).toContain("FROM authenticated");
  });

  it("locks and validates the link before any mutation", () => {
    const lockIdx = sql.indexOf("FOR UPDATE");
    const updateIdx = sql.indexOf("UPDATE public.events");
    expect(lockIdx).toBeGreaterThan(-1);
    expect(updateIdx).toBeGreaterThan(lockIdx);
    expect(sql).toContain("v_link.relationship <> 'organises'");
    expect(sql).toContain("NOT IN ('proposed', 'reopened')");
    expect(sql).toContain("'invalid_transition'");
  });

  it("permits only placeholder or equal prior organisers and blocks conflicts", () => {
    expect(sql).toContain("'tbc', 'tba', 'unknown', 'n/a', 'na', '-', 'none'");
    expect(sql).toContain("'organiser_conflict'");
    // The conflict branch returns before any INSERT/UPDATE.
    const conflictIdx = sql.indexOf("'organiser_conflict'");
    expect(sql.indexOf("INSERT INTO public.organisation_event_link_reviews")).toBeGreaterThan(
      conflictIdx,
    );
  });

  it("appends one review row, accepts the link, projects the organiser and audits once", () => {
    expect(sql.match(/INSERT INTO public\.organisation_event_link_reviews/g)?.length).toBe(1);
    expect(sql).toContain("'accepted'");
    expect(sql).toContain("admin:cookie-session");
    expect(sql.match(/UPDATE public\.organisation_event_links/g)?.length).toBe(1);
    expect(sql.match(/UPDATE public\.events/g)?.length).toBe(1);
    expect(sql).toContain("SET organiser = v_canonical");
    expect(sql.match(/INSERT INTO public\.event_edits/g)?.length).toBe(1);
  });

  it("never writes organiser_club_id or organiser_type", () => {
    expect(sql).not.toMatch(/SET[\s\S]{0,80}organiser_club_id\s*=/);
    expect(sql).not.toMatch(/SET[\s\S]{0,80}organiser_type\s*=/);
    expect(sql).not.toMatch(/organiser_club_id\s*=\s*/);
    expect(sql).not.toMatch(/organiser_type\s*=\s*/);
  });

  it("returns the already-applied result on retry without a second review or audit row", () => {
    const acceptedBranch = sql.indexOf("v_link.review_status = 'accepted'");
    expect(acceptedBranch).toBeGreaterThan(-1);
    expect(sql).toContain("'already_applied', true");
    expect(acceptedBranch).toBeLessThan(
      sql.indexOf("INSERT INTO public.organisation_event_link_reviews"),
    );
  });

  it("records the structured automation-learning audit payload", () => {
    for (const key of [
      "'link_id'",
      "'organisation_id'",
      "'relationship'",
      "'previous_organiser'",
      "'new_organiser'",
      "'source', 'ORL'",
      "'reviewer_identity'",
      "'applied_at'",
    ]) {
      expect(sql).toContain(key);
    }
  });

  it("has no bulk route: the function applies exactly one link id", () => {
    expect(sql).toContain("_link_id uuid");
    expect(sql).not.toMatch(/uuid\[\]/);
    expect(sql).not.toMatch(/\bFOR\b[^\n]*\bIN\b[^\n]*\bLOOP\b/);
  });
});

describe("server function guards (source level)", () => {
  const src = readFileSync("src/lib/organiser-identity.functions.ts", "utf8");

  it("requires an authenticated admin for the apply mutation", () => {
    const idx = src.indexOf("export const acceptAndApplyOrganiser");
    expect(idx).toBeGreaterThan(-1);
    expect(src).toContain('if (!(await isAdminAuthenticated())) throw new Error("Unauthorized")');
    expect(src.slice(idx)).toContain("await requireAdminMutation();");
  });

  it("takes a single link id plus an explicit confirmation — no bulk path", () => {
    const fn = src.slice(src.indexOf("export const acceptAndApplyOrganiser"));
    expect(fn).toContain("link_id: z.string().uuid()");
    expect(fn).toContain("confirm: z.literal(true)");
    expect(fn).not.toContain("z.array");
  });

  it("routes an ordinary organises acceptance to accept & apply", () => {
    expect(src).toContain('return { ok: false, error: "use_accept_and_apply_organiser" }');
  });

  it("never writes organiser_club_id or organiser_type from the apply path", () => {
    expect(src).not.toContain("organiser_club_id:");
    expect(src).not.toContain("organiser_type:");
  });
});
