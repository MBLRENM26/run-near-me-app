export type CourseRoute = {
  key: string;
  label: string;
  routeName: string;
  routeUrl: string;
  embedUrl: string;
  distanceLabel: string;
  ascentLabel: string;
};

export type CourseProfile = {
  eventSlug: string;
  organiser: string;
  provider: "plotaroute" | "strava";
  providerLabel: string;
  introduction: string;
  elevationMetricLabel: string;
  terrainLabel: string;
  routes: CourseRoute[];
};

const NORTH_DOWNS_RUN: CourseProfile = {
  eventSlug: "north-downs-run-2026",
  organiser: "Istead & Ifield Harriers",
  provider: "plotaroute",
  providerLabel: "Plotaroute",
  introduction:
    "Istead & Ifield Harriers publish this official course for the North Downs Run. Explore the route and elevation profile below.",
  elevationMetricLabel: "Total ascent",
  terrainLabel: "Mixed terrain",
  routes: [
    {
      key: "course",
      label: "Course",
      routeName: "North Downs Run course",
      routeUrl: "https://www.plotaroute.com/route/2277816?units=km",
      embedUrl: "https://www.plotaroute.com/routeviewer/2277816?self=1&units=km",
      distanceLabel: "29.8 km",
      ascentLabel: "469 m",
    },
  ],
};

const TOWN_MOOR: CourseProfile = {
  eventSlug: "runthrough-town-moor-exhibition-park-5k-10k-half-marathon-2026",
  organiser: "RunThrough",
  provider: "strava",
  providerLabel: "Strava",
  introduction:
    "RunThrough publish official routes for each race at Town Moor and Exhibition Park. Choose a distance to explore its map and elevation profile.",
  elevationMetricLabel: "Elevation gain",
  terrainLabel: "Multi-terrain",
  routes: [
    {
      key: "5k",
      label: "5K",
      routeName: "Town Moor 5K",
      routeUrl: "https://www.strava.com/routes/3421125722292623984",
      embedUrl: "https://strava-embeds.com/route/3421125722292623984?style=standard",
      distanceLabel: "5.1 km",
      ascentLabel: "21 m",
    },
    {
      key: "10k",
      label: "10K",
      routeName: "Town Moor 10K",
      routeUrl: "https://www.strava.com/routes/3421114966165592826",
      embedUrl: "https://strava-embeds.com/route/3421114966165592826?style=standard",
      distanceLabel: "10.2 km",
      ascentLabel: "45 m",
    },
    {
      key: "half-marathon",
      label: "Half Marathon",
      routeName: "Town Moor Half Marathon",
      routeUrl: "https://www.strava.com/routes/3421112329323724310",
      embedUrl: "https://strava-embeds.com/route/3421112329323724310?style=standard",
      distanceLabel: "21.6 km",
      ascentLabel: "99 m",
    },
  ],
};

const ALLOW_LISTED_COURSES: Record<string, CourseProfile> = {
  [NORTH_DOWNS_RUN.eventSlug]: NORTH_DOWNS_RUN,
  [TOWN_MOOR.eventSlug]: TOWN_MOOR,
};

/**
 * Course enrichment is intentionally allow-listed to named canonical occurrences.
 * A future general course model must not grow out of this lookup without a
 * separately reviewed data and provenance contract.
 */
export function courseProfileForEvent(eventSlug: string): CourseProfile | null {
  return ALLOW_LISTED_COURSES[eventSlug] ?? null;
}
