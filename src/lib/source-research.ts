import { z } from "zod";
import { eventExtractionSchema } from "./research-event-facts";

// URLs are destinations/evidence, never instructions or fetch authorisation.
export const researchUrl = z
  .string()
  .url()
  .max(2000)
  .refine((value) => {
    try {
      const u = new URL(value);
      return ["http:", "https:"].includes(u.protocol) && !u.username && !u.password;
    } catch {
      return false;
    }
  }, "Use an HTTP(S) URL without credentials");
const uuid = z.string().uuid();
const date = z.iso.date();
export const sourceSchema = z
  .object({
    id: uuid,
    label: z.string().trim().min(1).max(200),
    url: researchUrl,
    role: z.enum([
      "club",
      "organiser",
      "entry_provider",
      "governing_body",
      "community",
      "unresolved",
    ]),
    page_type: z.enum(["listing", "race", "entry", "other"]),
    organisation_id: uuid.nullable(),
    club_id: uuid.nullable(),
    policy_note: z.string().trim().min(1).max(2000),
    enabled: z.boolean().default(false),
    interval_hours: z.number().int().min(24).max(2160).default(168),
  })
  .strict();

const evidence = z
  .object({
    source_url: researchUrl,
    final_url: researchUrl,
    captured_at: z.iso.datetime({ offset: true }),
    content_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    extractor: z.string().min(1).max(100),
    // Preserve captured evidence exactly for idempotent delivery and audit comparisons.
    summary: z
      .string()
      .min(1)
      .max(6000)
      .refine((value) => value.trim().length > 0),
  })
  .strict();
const change = z
  .object({
    kind: z.literal("event_change"),
    event_id: uuid,
    expected_date: date,
    field: z.enum(["entry_url", "organiser_url", "distances"]),
    // Imported old values may be malformed; compare them exactly without normalising.
    expected_value: z.string().max(2000).nullable(),
    proposed_value: z.string().max(2000),
  })
  .strict()
  .refine(
    (change) =>
      change.field === "distances"
        ? change.proposed_value.trim().length > 0 && change.proposed_value.length <= 500
        : researchUrl.safeParse(change.proposed_value).success,
    "Use a valid destination URL or nonblank distance text of at most 500 characters",
  );
const relationship = z
  .object({
    kind: z.literal("club_relationship"),
    event_id: uuid,
    expected_date: date,
    organisation_id: uuid,
    club_id: uuid,
    expected_organiser: z.string().max(500).nullable(),
    expected_club_id: uuid.nullable(),
  })
  .strict();
const discovery = z
  .object({
    kind: z.literal("new_occurrence"),
    name: z.string().trim().min(1).max(300),
    date: date.nullable(),
    location: z.string().max(500),
    schedule: z.string().max(500).nullable(),
    entry_url: researchUrl.nullable(),
  })
  .strict();
// Additive evidence on the existing review-only kind; historical notices and
// SQL review gates remain valid, with no events/ORL migration or new write path.
const pageChange = z
  .object({ kind: z.literal("page_change"), extraction: eventExtractionSchema.optional() })
  .strict();
export const observationSchema = z
  .object({
    id: uuid,
    source_id: uuid,
    run_id: uuid,
    evidence,
    proposal: z.discriminatedUnion("kind", [change, relationship, discovery, pageChange]),
    conflicts: z.array(z.string().trim().min(1).max(1000)).max(20),
  })
  .strict()
  .refine(
    (r) => Date.parse(r.evidence.captured_at) <= Date.now() + 300_000,
    "Capture time is in the future",
  );
export const researchEnvelope = z
  .object({
    version: z.literal(1),
    observations: z.array(observationSchema).min(1).max(50),
  })
  .strict()
  .refine(
    (b) => new Set(b.observations.map((o) => o.id)).size === b.observations.length,
    "Duplicate observation IDs",
  );
export type ResearchObservation = z.infer<typeof observationSchema>;
export type ResearchSource = z.infer<typeof sourceSchema>;
export type ResearchRow = Omit<ResearchObservation, "proposal" | "evidence"> & {
  origin: "research" | "change_feed";
  proposal:
    | ResearchObservation["proposal"]
    | {
        kind: "legacy_report";
        event_id: string;
        field: string;
        expected_value: string | null;
        proposed_value: string | null;
      };
  evidence: Omit<ResearchObservation["evidence"], "content_sha256"> & { content_sha256?: string };
  status: "pending" | "held" | "applied" | "rejected" | "reverted";
  created_at: string;
  review_note: string | null;
  current_event: Record<string, unknown> | null;
  candidate_events?: Record<string, unknown>[];
  candidate_search_limited?: boolean;
};
export function canApplyResearch(row: Pick<ResearchRow, "proposal" | "conflicts">): boolean {
  return (
    row.conflicts.length === 0 && ["event_change", "club_relationship"].includes(row.proposal.kind)
  );
}
