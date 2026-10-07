import { UK_BOUNDS_OR_NULL } from "./events-query";
import { hasDiscoverableLink } from "./link-trust";

export type ClubRace = {
  id: string;
  slug: string;
  name: string;
  date_from: string | null;
  date_to: string | null;
  sort_date: string | null;
  date_raw: string | null;
  date_is_estimated: boolean;
  town: string | null;
  distances: string | null;
};

/** Read-only projection of accepted identities and organising relationships.
 * No name matching and no profile/contact fields cross this boundary.
 */
export async function loadClubRaces(clubId: string): Promise<ClubRace[] | null> {
  try {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: mappings, error: mappingError } = await db
      .from("organisation_club_links")
      .select("organisation_id, organisations!inner(status)")
      .eq("club_id", clubId)
      .eq("review_status", "accepted")
      .eq("organisations.status", "approved");
    if (mappingError) throw mappingError;
    if (!mappings?.length) return [];
    if (mappings.length !== 1) return null; // Ambiguous identity is not an empty portfolio.
    const organisationId = mappings[0].organisation_id;
    const { data: reverseMappings, error: reverseError } = await db
      .from("organisation_club_links")
      .select("club_id")
      .eq("organisation_id", organisationId)
      .eq("review_status", "accepted");
    if (reverseError) throw reverseError;
    if (reverseMappings?.length !== 1 || reverseMappings[0].club_id !== clubId) return null;

    const today = new Date().toISOString().slice(0, 10);
    const races: ClubRace[] = [];
    const pageSize = 100;
    for (let from = 0; ; from += pageSize) {
      const { data: rows, error } = await db
        .from("events")
        .select("id, slug, name, date_from, date_to, sort_date, date_raw, date_is_estimated, town, distances, entry_url, organiser_url, governance, organisation_event_links!inner(organisation_id, relationship, review_status, confidence)")
        .eq("organiser_club_id", clubId)
        .eq("status", "ACTIVE")
        .is("duplicate_of", null)
        .not("slug", "is", null)
        .gte("sort_date", today)
        .or(UK_BOUNDS_OR_NULL)
        .eq("organisation_event_links.organisation_id", organisationId)
        .eq("organisation_event_links.relationship", "organises")
        .eq("organisation_event_links.review_status", "accepted")
        .eq("organisation_event_links.confidence", "verified")
        .order("sort_date", { ascending: true })
        .order("id", { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      for (const row of rows ?? []) {
        if (!row.slug || !hasDiscoverableLink(row.entry_url, row.organiser_url, row.governance, row)) continue;
        // Explicit public fields: never serialize ORL internals or source provenance.
        races.push({
          id: row.id, slug: row.slug, name: row.name,
          date_from: row.date_from, date_to: row.date_to, sort_date: row.sort_date,
          date_raw: row.date_raw, date_is_estimated: row.date_is_estimated,
          town: row.town, distances: row.distances,
        });
      }
      if ((rows?.length ?? 0) < pageSize) break;
    }
    return races;
  } catch {
    console.warn("[club-races] Upcoming races unavailable");
    return null;
  }
}
