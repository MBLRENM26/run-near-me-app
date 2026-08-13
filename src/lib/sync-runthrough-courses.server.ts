import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  canonicalRunThroughEventUrl,
  eventMatchesRunThroughPage,
  exactRoutesForEvent,
  parseRunThroughPage,
  parseStravaEmbed,
  routeLabel,
  type ParsedStravaRoute,
  type RunThroughEventCandidate,
} from "@/lib/runthrough-course-parser";
import { startSyncRun } from "@/lib/sync-run-log.server";

type SourceEventRow = {
  id: string;
  slug: string | null;
  name: string;
  distances: string | null;
  entry_url: string | null;
  organiser_url: string | null;
};

export type RunThroughCourseChunkResult = {
  offset: number;
  limit: number;
  totalSources: number;
  processedSources: number;
  done: boolean;
  matchedEvents: number;
  publishedRoutes: number;
  reviewItems: number;
  failedSources: number;
};

const FETCH_TIMEOUT_MS = 15_000;
const USER_AGENT = "RunNearYou course-source verifier/1.0 (+https://runnearyou.co.uk)";

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT, accept: "text/html" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function fetchAllCandidateRows(today: string): Promise<SourceEventRow[]> {
  const rows: SourceEventRow[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabaseAdmin
      .from("events")
      .select("id, slug, name, distances, entry_url, organiser_url")
      .eq("status", "ACTIVE")
      .not("slug", "is", null)
      .gte("sort_date", today)
      .or("entry_url.ilike.%runthrough.co.uk%,organiser_url.ilike.%runthrough.co.uk%")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as SourceEventRow[]));
    if ((data?.length ?? 0) < pageSize) break;
  }
  return rows;
}

function originalRunThroughUrl(row: SourceEventRow): string | null {
  return (
    [row.organiser_url, row.entry_url].find((value) => {
      if (!value) return false;
      try {
        return /(^|\.)runthrough\.co\.uk$/i.test(new URL(value).hostname);
      } catch {
        return false;
      }
    }) ?? null
  );
}

async function recordReview(input: {
  eventId: string | null;
  sourceUrl: string | null;
  providerRouteId?: string | null;
  routeName?: string | null;
  reason: string;
  detail: string;
}): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin.from("course_source_reviews").upsert(
    {
      event_id: input.eventId,
      source_url: input.sourceUrl,
      provider: input.providerRouteId ? "strava" : null,
      provider_route_id: input.providerRouteId ?? null,
      route_name: input.routeName ?? null,
      reason: input.reason,
      detail: input.detail,
      last_seen_at: now,
    },
    {
      onConflict: "event_id,source_url,provider,provider_route_id,reason",
    },
  );
  if (error) throw new Error(`Review queue: ${error.message}`);
}

async function publishRoutes(
  event: RunThroughEventCandidate,
  routes: ParsedStravaRoute[],
  canRetireStale: boolean,
): Promise<number> {
  const now = new Date().toISOString();
  const rows = routes.map((route) => ({
    event_id: event.id,
    provider: "strava",
    provider_route_id: route.providerRouteId,
    route_name: route.routeName.replace(/\s*\|\s*RunThrough\s*$/i, ""),
    distance_key: route.distanceKey!,
    distance_label: routeLabel(route.distanceKey!),
    distance_km: route.distanceKm,
    ascent_m: route.ascentM,
    route_url: `https://www.strava.com/routes/${route.providerRouteId}`,
    embed_url: `https://strava-embeds.com/route/${route.providerRouteId}?style=standard`,
    organiser_source_url: event.sourceUrl,
    source_checked_at: now,
    status: "published",
    review_reason: null,
    updated_at: now,
  }));

  const { error } = await supabaseAdmin.from("event_course_sources").upsert(rows, {
    onConflict: "event_id,provider,provider_route_id",
  });
  if (error) throw new Error(`Course upsert: ${error.message}`);

  if (!canRetireStale) return rows.length;

  const currentIds = new Set(routes.map((route) => route.providerRouteId));
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("event_course_sources")
    .select("id, provider_route_id")
    .eq("event_id", event.id)
    .eq("provider", "strava")
    .eq("organiser_source_url", event.sourceUrl)
    .eq("status", "published");
  if (existingError) throw new Error(`Course retirement read: ${existingError.message}`);

  const staleIds = (existing ?? [])
    .filter((row) => !currentIds.has(row.provider_route_id))
    .map((row) => row.id);
  if (staleIds.length) {
    const { error: retireError } = await supabaseAdmin
      .from("event_course_sources")
      .update({ status: "retired", updated_at: now })
      .in("id", staleIds);
    if (retireError) throw new Error(`Course retirement: ${retireError.message}`);
  }
  return rows.length;
}

export async function runRunThroughCourseChunk(input: {
  offset: number;
  limit: number;
}): Promise<RunThroughCourseChunkResult> {
  // The browser runs many small chunks. Keep each in the audit table but do
  // not send an email per chunk; the admin UI reports cumulative progress.
  const run = await startSyncRun("runthrough-courses", { notify: false });
  let candidates: SourceEventRow[] = [];
  let processedSources = 0;
  let matchedEvents = 0;
  let publishedRoutes = 0;
  let reviewItems = 0;
  let failedSources = 0;

  try {
    const today = new Date().toISOString().slice(0, 10);
    candidates = await fetchAllCandidateRows(today);
    const bySource = new Map<string, RunThroughEventCandidate[]>();

    for (const row of candidates) {
      const sourceUrl =
        canonicalRunThroughEventUrl(row.organiser_url) ??
        canonicalRunThroughEventUrl(row.entry_url);
      if (!sourceUrl) {
        if (input.offset === 0) {
          await recordReview({
            eventId: row.id,
            sourceUrl: originalRunThroughUrl(row),
            reason: "no_specific_event_url",
            detail: "RunThrough link is not an event-specific /event/ URL.",
          });
          reviewItems += 1;
        }
        continue;
      }
      const event: RunThroughEventCandidate = {
        id: row.id,
        slug: row.slug!,
        name: row.name,
        distances: row.distances,
        sourceUrl,
      };
      const group = bySource.get(sourceUrl) ?? [];
      group.push(event);
      bySource.set(sourceUrl, group);
    }

    const sourceUrls = [...bySource.keys()].sort();
    const selected = sourceUrls.slice(input.offset, input.offset + input.limit);

    for (const sourceUrl of selected) {
      processedSources += 1;
      const events = bySource.get(sourceUrl) ?? [];
      try {
        const page = parseRunThroughPage(await fetchText(sourceUrl));
        if (!page.eventName) {
          for (const event of events) {
            await recordReview({
              eventId: event.id,
              sourceUrl,
              reason: "source_name_missing",
              detail: "Could not read the organiser page event heading.",
            });
            reviewItems += 1;
          }
          continue;
        }
        if (!page.routeIds.length) {
          for (const event of events) {
            await recordReview({
              eventId: event.id,
              sourceUrl,
              reason: "no_strava_routes",
              detail: `No embedded Strava routes found on “${page.eventName}”.`,
            });
            reviewItems += 1;
          }
          continue;
        }

        const parsedRoutes: ParsedStravaRoute[] = [];
        let allRoutesParsed = true;
        for (const routeId of page.routeIds) {
          try {
            const parsed = parseStravaEmbed(
              await fetchText(`https://strava-embeds.com/route/${routeId}`),
              routeId,
            );
            if (parsed) parsedRoutes.push(parsed);
            else {
              allRoutesParsed = false;
              await recordReview({
                eventId: null,
                sourceUrl,
                providerRouteId: routeId,
                reason: "strava_metadata_unreadable",
                detail: "Route embed did not expose a title, distance and elevation gain.",
              });
              reviewItems += 1;
            }
          } catch (error) {
            allRoutesParsed = false;
            await recordReview({
              eventId: null,
              sourceUrl,
              providerRouteId: routeId,
              reason: "strava_fetch_failed",
              detail: error instanceof Error ? error.message : String(error),
            });
            reviewItems += 1;
          }
        }

        for (const event of events) {
          if (!eventMatchesRunThroughPage(event.name, page.eventName)) {
            await recordReview({
              eventId: event.id,
              sourceUrl,
              reason: "event_name_mismatch",
              detail: `RENM “${event.name}” did not safely match organiser page “${page.eventName}”.`,
            });
            reviewItems += 1;
            continue;
          }
          const { publishable } = exactRoutesForEvent(event, parsedRoutes);
          if (!publishable.length) {
            await recordReview({
              eventId: event.id,
              sourceUrl,
              reason: "distance_mismatch",
              detail: `No named Strava route exactly matched advertised distances “${event.distances ?? "unknown"}”.`,
            });
            reviewItems += 1;
            continue;
          }
          publishedRoutes += await publishRoutes(event, publishable, allRoutesParsed);
          matchedEvents += 1;
        }
      } catch (error) {
        failedSources += 1;
        for (const event of events) {
          await recordReview({
            eventId: event.id,
            sourceUrl,
            reason: "source_fetch_failed",
            detail: error instanceof Error ? error.message : String(error),
          });
          reviewItems += 1;
        }
      }
    }

    const result: RunThroughCourseChunkResult = {
      offset: input.offset,
      limit: input.limit,
      totalSources: sourceUrls.length,
      processedSources,
      done: input.offset + selected.length >= sourceUrls.length,
      matchedEvents,
      publishedRoutes,
      reviewItems,
      failedSources,
    };
    await run.finish({
      status: failedSources ? "partial" : "success",
      fetched: processedSources,
      active: matchedEvents,
      written: publishedRoutes,
      skipped_dupes: reviewItems,
      failed_pages: failedSources,
    });
    return result;
  } catch (error) {
    await run.finish({
      status: "error",
      fetched: processedSources,
      active: matchedEvents,
      written: publishedRoutes,
      skipped_dupes: reviewItems,
      failed_pages: failedSources,
      error_message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
