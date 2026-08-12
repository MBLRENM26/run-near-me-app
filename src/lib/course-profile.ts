export type CourseProfile = {
  eventSlug: string;
  organiser: string;
  routeName: string;
  routeUrl: string;
  embedUrl: string;
  distanceLabel: string;
  ascentLabel: string;
  terrainLabel: string;
};

const NORTH_DOWNS_RUN: CourseProfile = {
  eventSlug: "north-downs-run-2026",
  organiser: "Istead & Ifield Harriers",
  routeName: "North Downs Run course",
  routeUrl: "https://www.plotaroute.com/route/2277816?units=km",
  embedUrl: "https://www.plotaroute.com/routeviewer/2277816?self=1&units=km",
  distanceLabel: "29.8 km",
  ascentLabel: "469 m",
  terrainLabel: "Mixed terrain",
};

/**
 * PX2C-E is intentionally allow-listed to one canonical occurrence.
 * A future general course model must not grow out of this lookup without a
 * separately reviewed data and provenance contract.
 */
export function courseProfileForEvent(eventSlug: string): CourseProfile | null {
  return eventSlug === NORTH_DOWNS_RUN.eventSlug ? NORTH_DOWNS_RUN : null;
}
