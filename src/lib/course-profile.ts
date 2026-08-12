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

export type StoredCourseSource = {
  provider: string;
  provider_route_id: string;
  route_name: string;
  distance_key: string;
  distance_label: string;
  distance_km: number | null;
  ascent_m: number | null;
  route_url: string;
  embed_url: string;
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

function terrainLabel(raceProfile: string | null): string {
  const labels: Record<string, string> = {
    road: "Road",
    trail: "Trail",
    multi_terrain: "Multi-terrain",
    fell: "Fell",
    cross_country: "Cross-country",
    track: "Track",
  };
  return (raceProfile && labels[raceProfile]) || "Course details";
}

/** Build the public course module from verified, server-loaded source rows. */
export function courseProfileFromSources(input: {
  eventSlug: string;
  organiser: string | null;
  raceProfile: string | null;
  sources: StoredCourseSource[];
}): CourseProfile | null {
  if (!input.sources.length) return courseProfileForEvent(input.eventSlug);
  const provider = input.sources[0].provider;
  if (provider !== "strava" && provider !== "plotaroute") return null;
  const organiser = input.organiser?.trim() || "The organiser";
  const providerLabel = provider === "strava" ? "Strava" : "Plotaroute";
  return {
    eventSlug: input.eventSlug,
    organiser,
    provider,
    providerLabel,
    introduction: `${organiser} publish ${
      input.sources.length === 1 ? "this official route" : "official routes"
    } for the event. ${
      input.sources.length === 1
        ? "Explore its map and elevation profile below."
        : "Choose a distance to explore its map and elevation profile."
    }`,
    elevationMetricLabel: provider === "strava" ? "Elevation gain" : "Total ascent",
    terrainLabel: terrainLabel(input.raceProfile),
    routes: input.sources.map((source) => ({
      key:
        input.sources.filter((item) => item.distance_key === source.distance_key).length === 1
          ? source.distance_key
          : `${source.distance_key}-${source.provider_route_id}`,
      label: source.distance_label,
      routeName: source.route_name,
      routeUrl: source.route_url,
      embedUrl: source.embed_url,
      distanceLabel:
        source.distance_km === null ? source.distance_label : `${source.distance_km} km`,
      ascentLabel: source.ascent_m === null ? "Not published" : `${source.ascent_m} m`,
    })),
  };
}
