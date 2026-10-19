import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { z } from "zod";
import { validateRichResearch } from "./rich-race-research";

const dbForAdmin = createServerOnlyFn(async () => {
  const { isAdminAuthenticated } = await import("./admin-session.server");
  if (!(await isAdminAuthenticated())) throw new Error("Unauthorized");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
});
const sha256 = createServerOnlyFn(async (text: string) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)))].map((v) => v.toString(16).padStart(2, "0")).join(""));
export const importRichRaceResearch = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => z.object({ factsCsv: z.string().max(1000000), evidenceCsv: z.string().max(1000000) }).parse(v))
  .handler(async ({ data }) => {
    const db = await dbForAdmin();
    const parsed = validateRichResearch(data.factsCsv, data.evidenceCsv);
    const [fileHash, evidenceHash] = await Promise.all([sha256(data.factsCsv), sha256(data.evidenceCsv)]);
    const existing = await db.from("race_research_batches").select("id,evidence_file_sha256").eq("file_sha256", fileHash).maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    if (existing.data && existing.data.evidence_file_sha256 !== evidenceHash) throw new Error("This facts file already has a different evidence version; preserve it as a separate revision");
    const batchId = existing.data?.id ?? crypto.randomUUID();
    if (!existing.data) {
      const result = await db.from("race_research_batches").insert({ id: batchId, file_sha256: fileHash, evidence_file_sha256: evidenceHash, label: "Uploaded race facts — October 2026", row_count: parsed.facts.length, assertion_count: parsed.assertions.length, limitations: "Partial best-effort research. Rate compliance and reproduction terms not established. Researcher confidence is not reviewer acceptance." });
      if (result.error) throw new Error(result.error.message);
    }
    const slugs = [...new Set(parsed.assertions.map((r) => r.slug))];
    const result = await db.from("events").select("id,slug,name,date_from,sort_date,status,date_is_estimated").in("slug", slugs);
    if (result.error) throw new Error(result.error.message);
    const rows = parsed.assertions.map((r) => {
      const matches = (result.data ?? []).filter((e) => e.slug === r.slug);
      const event = matches.length === 1 ? matches[0] : null;
      const caveats = [...r.caveats];
      if (event?.date_is_estimated || event?.date_from !== event?.sort_date) caveats.push("Stored occurrence date uncertain or inconsistent");
      const slugYears: string[] = r.slug.match(/(?:19|20)\d{2}/g) ?? [];
      if (event?.date_from && slugYears.length && !slugYears.includes(event.date_from.slice(0, 4))) caveats.push("Slug year differs from stored edition");
      return { id: crypto.randomUUID(), batch_id: batchId, event_id: event?.id ?? null, slug: r.slug, field: r.field, candidate_value: r.candidate_value, raw_value: r.value, evidence_quote: r.evidence_quote, source_url: r.source_url, checked_at: r.checked_at, researcher_confidence: r.confidence, match_state: r.quarantined ? "quarantined" : event ? "needs_edition_review" : "unresolved", caveats, occurrence_snapshot: event };
    });
    const inserted = await db.from("race_research_assertions").upsert(rows, { onConflict: "batch_id,slug,field,raw_value,source_url,checked_at", ignoreDuplicates: true });
    if (inserted.error) throw new Error(inserted.error.message);
    const count = await db.from("race_research_assertions").select("id", { count: "exact", head: true }).eq("batch_id", batchId);
    if (count.error || count.count !== rows.length) throw new Error("Import incomplete; retry the same files to resume safely");
    return { count: count.count, batchId };
  });
export const listRichRaceResearch = createServerFn({ method: "GET" }).handler(async () => {
  const db = await dbForAdmin();
  const batch = await db.from("race_research_batches").select("id,label,status,assertion_count,limitations").eq("status", "staged").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (batch.error) throw new Error(batch.error.message);
  if (!batch.data) return { batch: null, rows: [], reviews: [] };
  const rows = await db.from("race_research_assertions").select("*").eq("batch_id", batch.data.id).order("slug").order("field").limit(1000);
  if (rows.error) throw new Error(rows.error.message);
  const reviews = await db.from("race_research_fact_reviews").select("*").in("assertion_id", (rows.data ?? []).map((r) => r.id)).order("created_at", { ascending: false }).limit(1000);
  if (reviews.error) throw new Error(reviews.error.message);
  return { batch: batch.data, rows: rows.data ?? [], reviews: reviews.data ?? [] };
});
export const reviewRichRaceFact = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => z.object({ id: z.uuid(), action: z.enum(["hold", "reject", "reopen"]), note: z.string().trim().min(1).max(2000) }).parse(v))
  .handler(async ({ data }) => {
    const db = await dbForAdmin();
    const result = await db.from("race_research_fact_reviews").insert({ assertion_id: data.id, action: data.action, note: data.note, reviewer_identity: "admin:cookie-session" });
    if (result.error) throw new Error(result.error.message);
    return { ok: true };
  });