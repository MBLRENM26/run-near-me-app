import { buildMonthSummary, type SummaryInput } from "./month-summary";

export type MonthHostClub = { id: string; slug: string; name: string; eventIds: string[] };
export type HostLink = { event_id: string; organisation_id: string; relationship: string; review_status: string; confidence: string };
export type ClubMapping = { club_id: string; organisation_id: string; review_status: string; approved: boolean };

/** Inputs are private; output contains only public names, slugs and eligible event IDs. */
export function resolveMonthHostClubs(
  events: { id: string; organiser_club_id: string | null }[],
  links: HostLink[],
  mappings: ClubMapping[],
  clubs: { id: string; slug: string; name: string; status: string }[],
): MonthHostClub[] {
  const accepted = mappings.filter((m) => m.review_status === "accepted");
  const result: MonthHostClub[] = [];
  for (const club of clubs) {
    if (club.status !== "ACTIVE" || !club.slug) continue;
    const forward = accepted.filter((m) => m.club_id === club.id);
    if (forward.length !== 1 || !forward[0].approved) continue;
    const org = forward[0].organisation_id;
    if (accepted.filter((m) => m.organisation_id === org).length !== 1) continue;
    const eventIds = [...new Set(events.filter((e) => e.organiser_club_id === club.id && links.some((l) =>
      l.event_id === e.id && l.organisation_id === org && l.relationship === "organises" &&
      l.review_status === "accepted" && l.confidence === "verified",
    )).map((e) => e.id))];
    if (eventIds.length) result.push({ id: club.id, slug: club.slug, name: club.name, eventIds });
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

export function summarizeMonthHostClubs(monthKey: string, shown: SummaryInput[], clubs: MonthHostClub[]) {
  return clubs.flatMap((club) => {
    const ids = new Set(club.eventIds);
    const events = [...new Map(shown.filter((e) => ids.has(e.id)).map((e) => [e.id, e])).values()];
    const count = buildMonthSummary(monthKey, events).total;
    return count ? [{ ...club, count }] : [];
  });
}