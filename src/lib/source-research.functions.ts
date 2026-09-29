import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  researchEnvelope,
  researchUrl,
  sourceSchema,
  type ResearchRow,
  type ResearchSource,
} from "@/lib/source-research";

const adminDb = createServerOnlyFn(async () => {
  const { isAdminAuthenticated } = await import("@/lib/admin-session.server");
  if (!(await isAdminAuthenticated())) throw new Error("Unauthorized");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Additive migration types are isolated at this boundary until regeneration.
  return supabaseAdmin as unknown as SupabaseClient;
});

export const approveResearchClubIdentity = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) =>
    z
      .object({
        club_id: z.string().uuid(),
        organisation_id: z.string().uuid().nullable(),
        source_url: researchUrl,
        fact: z.string().trim().min(10).max(2000),
      })
      .parse(v),
  )
  .handler(async ({ data }) => {
    const db = await adminDb();
    const { data: organisation_id, error } = await db.rpc("approve_research_club_identity", {
      _club_id: data.club_id,
      _organisation_id: data.organisation_id,
      _source_url: data.source_url,
      _fact: data.fact,
      _reviewer: "admin:cookie-session",
    });
    if (error) throw new Error(error.message);
    return { organisation_id: organisation_id as string };
  });

export const listSourceResearch = createServerFn({ method: "GET" })
  .inputValidator((v: unknown) =>
    z
      .object({
        status: z.enum(["pending", "held", "applied", "rejected", "reverted"]),
        offset: z.number().int().min(0).default(0),
      })
      .parse(v),
  )
  .handler(async ({ data }) => {
    const db = await adminDb();
    const [observations, sources, conflicts, reviews] = await Promise.all([
      db
        .from("source_research_observations")
        .select("id,source_id,run_id,evidence,proposal,conflicts,status,review_note,created_at", {
          count: "exact",
        })
        .eq("status", data.status)
        .order("created_at", { ascending: false })
        .range(data.offset, data.offset + 49),
      db.from("research_sources").select("*").order("label").limit(200),
      db
        .from("event_review_conflicts")
        .select("event_id,field,protected_value,attempted_value,last_seen_at,attempts")
        .order("last_seen_at", { ascending: false })
        .limit(25),
      db
        .from("source_research_reviews")
        .select("observation_id,action,note,reviewer_identity,created_at")
        .order("created_at", { ascending: false })
        .limit(25),
    ]);
    for (const result of [observations, sources, conflicts, reviews])
      if (result.error) throw new Error(result.error.message);
    const rows = (observations.data ?? []) as ResearchRow[];
    const ids = rows.flatMap((r) => ("event_id" in r.proposal ? [r.proposal.event_id] : []));
    const events = ids.length
      ? await db
          .from("events")
          .select(
            "id,name,date_from,sort_date,status,entry_url,organiser_url,organiser,organiser_club_id",
          )
          .in("id", ids)
      : { data: [], error: null };
    if (events.error) throw new Error(events.error.message);
    return {
      rows: rows.map((r) => {
        const eventId = "event_id" in r.proposal ? r.proposal.event_id : null;
        return { ...r, current_event: events.data?.find((e) => e.id === eventId) ?? null };
      }),
      total: observations.count ?? 0,
      sources: (sources.data ?? []) as ResearchSource[],
      conflicts: conflicts.data ?? [],
      reviews: reviews.data ?? [],
    };
  });

export const registerResearchSource = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => sourceSchema.parse(v))
  .handler(async ({ data }) => {
    const db = await adminDb();
    const { error } = await db.from("research_sources").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setResearchSourceEnabled = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) =>
    z.object({ id: z.string().uuid(), enabled: z.boolean() }).parse(v),
  )
  .handler(async ({ data }) => {
    const db = await adminDb();
    const { error } = await db
      .from("research_sources")
      .update({ enabled: data.enabled })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const importSourceResearch = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => researchEnvelope.parse(v))
  .handler(async ({ data }) => {
    const db = await adminDb();
    const { data: result, error } = await db.rpc("ingest_source_research", {
      _observations: data.observations,
    });
    if (error) throw new Error(error.message);
    return result as { received: number; inserted: number };
  });

export const reviewSourceResearch = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        action: z.enum(["hold", "reject", "apply", "revert"]),
        note: z.string().trim().min(1).max(2000),
      })
      .parse(v),
  )
  .handler(async ({ data }) => {
    const db = await adminDb();
    const { error } = await db.rpc("review_source_research", {
      _id: data.id,
      _action: data.action,
      _note: data.note,
      _reviewer: "admin:cookie-session",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
