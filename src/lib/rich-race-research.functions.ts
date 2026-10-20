import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { z } from "zod";
import { compareWithEarlierBatches, validateRichResearch } from "./rich-race-research";

const dbForAdmin = createServerOnlyFn(async () => {
  const { isAdminAuthenticated } = await import("./admin-session.server");
  if (!(await isAdminAuthenticated())) throw new Error("Unauthorized");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
});
const sha256 = createServerOnlyFn(async (text: string) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)))].map((v) => v.toString(16).padStart(2, "0")).join(""));
const chunk = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

export const importRichRaceResearch = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => z.object({ factsCsv: z.string().max(3000000), evidenceCsv: z.string().max(3000000) }).parse(v))
  .handler(async ({ data }) => {
    const db = await dbForAdmin();
    const parsed = validateRichResearch(data.factsCsv, data.evidenceCsv);
    const [fileHash, evidenceHash] = await Promise.all([sha256(data.factsCsv), sha256(data.evidenceCsv)]);
    const existing = await db.from("race_research_batches").select("id,evidence_file_sha256").eq("file_sha256", fileHash).maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    if (existing.data && existing.data.evidence_file_sha256 !== evidenceHash) throw new Error("This facts file already has a different evidence version; preserve it as a separate revision");
    const batchId = existing.data?.id ?? crypto.randomUUID();
    const slugs = [...new Set(parsed.assertions.map((r) => r.slug))];
    // Earlier staged batches: compare, never modify.
    const earlier: { slug: string; field: string; raw_value: string }[] = [];
    for (const part of chunk(slugs, 200)) {
      const r = await db.from("race_research_assertions").select("slug,field,raw_value,batch_id").in("slug", part).neq("batch_id", batchId).limit(10000);
      if (r.error) throw new Error(r.error.message);
      earlier.push(...(r.data ?? []));
    }
    const compared = compareWithEarlierBatches(parsed.assertions, earlier);
    if (!existing.data) {
      const result = await db.from("race_research_batches").insert({ id: batchId, file_sha256: fileHash, evidence_file_sha256: evidenceHash, label: `Uploaded race facts — ${new Date().toISOString().slice(0, 10)}`, row_count: parsed.facts.length, assertion_count: compared.length, limitations: "Best-effort research. One inherited batch has unconfirmed robots/request-pacing logs; course-map reproduction terms not checked. Researcher confidence is not reviewer acceptance." });
      if (result.error) throw new Error(result.error.message);
    }
    const events: { id: string; slug: string | null; date_from: string | null; sort_date: string | null; date_is_estimated: boolean | null }[] = [];
    for (const part of chunk(slugs, 200)) {
      const r = await db.from("events").select("id,slug,name,date_from,sort_date,status,date_is_estimated").in("slug", part);
      if (r.error) throw new Error(r.error.message);
      events.push(...(r.data ?? []));
    }
    const rows = compared.map((r) => {
      const matches = events.filter((e) => e.slug === r.slug);
      const event = matches.length === 1 ? matches[0] : null;
      const caveats = [...r.caveats];
      if (event?.date_is_estimated || event?.date_from !== event?.sort_date) caveats.push("Stored occurrence date uncertain or inconsistent");
      const slugYears: string[] = r.slug.match(/(?:19|20)\d{2}/g) ?? [];
      if (event?.date_from && slugYears.length && !slugYears.includes(event.date_from.slice(0, 4))) caveats.push("Slug year differs from stored edition");
      return { id: crypto.randomUUID(), batch_id: batchId, event_id: event?.id ?? null, slug: r.slug, field: r.field, candidate_value: r.candidate_value, raw_value: r.value, evidence_quote: r.evidence_quote, source_url: r.source_url, checked_at: r.checked_at, researcher_confidence: r.confidence, match_state: r.quarantined ? "quarantined" : event ? "needs_edition_review" : "unresolved", caveats, occurrence_snapshot: event };
    });
    for (const part of chunk(rows, 500)) {
      const inserted = await db.from("race_research_assertions").upsert(part, { onConflict: "batch_id,slug,field,raw_value,source_url,checked_at", ignoreDuplicates: true });
      if (inserted.error) throw new Error(inserted.error.message);
    }
    const count = await db.from("race_research_assertions").select("id", { count: "exact", head: true }).eq("batch_id", batchId);
    if (count.error || count.count !== rows.length) throw new Error("Import incomplete; retry the same files to resume safely");
    return { count: count.count, batchId, quarantined: rows.filter((r) => r.match_state === "quarantined").length };
  });

export const listRichRaceResearch = createServerFn({ method: "GET" })
  .inputValidator((v: unknown) => z.object({ batchId: z.uuid().optional(), view: z.enum(["all", "flagged", "upcoming", "unresolved"]).default("all"), field: z.string().max(40).optional(), search: z.string().max(100).optional(), offset: z.number().int().min(0).default(0) }).default({ view: "all", offset: 0 }).parse(v ?? {}))
  .handler(async ({ data }) => {
    const db = await dbForAdmin();
    const batches = await db.from("race_research_batches").select("id,label,status,assertion_count,row_count,limitations,created_at").eq("status", "staged").order("created_at", { ascending: false }).limit(20);
    if (batches.error) throw new Error(batches.error.message);
    const batch = batches.data?.find((b) => b.id === data.batchId) ?? batches.data?.[0] ?? null;
    if (!batch) return { batches: [], batch: null, rows: [], reviews: [], total: 0, stats: null };
    const countOf = async (state?: string) => {
      let c = db.from("race_research_assertions").select("id", { count: "exact", head: true }).eq("batch_id", batch.id);
      if (state) c = c.eq("match_state", state);
      const r = await c; if (r.error) throw new Error(r.error.message); return r.count ?? 0;
    };
    const [assertions, quarantined, unresolved] = await Promise.all([countOf(), countOf("quarantined"), countOf("unresolved")]);
    const slugSet = new Set<string>();
    for (let from = 0; from < assertions; from += 1000) {
      const r = await db.from("race_research_assertions").select("slug").eq("batch_id", batch.id).order("id").range(from, from + 999);
      if (r.error) throw new Error(r.error.message);
      for (const x of r.data ?? []) slugSet.add(x.slug);
    }
    let q = db.from("race_research_assertions").select("*", { count: "exact" }).eq("batch_id", batch.id);
    if (data.view === "flagged") q = q.eq("match_state", "quarantined");
    if (data.view === "unresolved") q = q.eq("match_state", "unresolved");
    if (data.view === "upcoming") q = q.gte("occurrence_snapshot->>sort_date", new Date().toISOString().slice(0, 10));
    if (data.field) q = q.eq("field", data.field);
    if (data.search) q = q.ilike("slug", `%${data.search.replace(/[%_]/g, "")}%`);
    const rows = await q.order("slug").order("field").range(data.offset, data.offset + 199);
    if (rows.error) throw new Error(rows.error.message);
    const ids = (rows.data ?? []).map((r) => r.id);
    const reviews = ids.length ? await db.from("race_research_fact_reviews").select("*").in("assertion_id", ids).order("created_at", { ascending: false }).limit(2000) : { data: [], error: null };
    if (reviews.error) throw new Error(reviews.error.message);
    return {
      batches: batches.data ?? [], batch, rows: rows.data ?? [], reviews: reviews.data ?? [], total: rows.count ?? 0,
      stats: { races: slugSet.size, assertions, quarantined, unresolved },
    };
  });

export const reviewRichRaceFact = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => z.object({ id: z.uuid(), action: z.enum(["hold", "reject", "reopen"]), note: z.string().trim().min(1).max(2000) }).parse(v))
  .handler(async ({ data }) => {
    const db = await dbForAdmin();
    const result = await db.from("race_research_fact_reviews").insert({ assertion_id: data.id, action: data.action, note: data.note, reviewer_identity: "admin:cookie-session" });
    if (result.error) throw new Error(result.error.message);
    return { ok: true };
  });
