import { useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { REGIONS } from "@/lib/regions";
import { ChevronRight } from "lucide-react";
import {
  LocationPrompt,
  type Coords,
} from "@/components/events/LocationPrompt";
import { FilterBar, type Radius } from "@/components/events/FilterBar";
import {
  EventCard,
  isParkrunEvent,
  type EventCardData,
} from "@/components/events/EventCard";
import { Toaster } from "@/components/ui/sonner";
import { matchesEventType, type EventType } from "@/lib/distance";
import { MapPin } from "lucide-react";
import { DistanceNav } from "@/components/distance/DistanceNav";
import { classifyEventLink } from "@/lib/link-trust";

type HomeSearch = {
  lat?: number;
  lng?: number;
  label?: string;
  radius?: Radius;
  type?: EventType;
};

const VALID_RADII: readonly Radius[] = [5, 10, 25, 50];
const VALID_TYPES: readonly EventType[] = [
  "all",
  "5k",
  "10k",
  "half",
  "marathon",
  "trail",
  "ultra",
];

export const Route = createFileRoute("/")({
  validateSearch: (raw: Record<string, unknown>): HomeSearch => {
    const out: HomeSearch = {};
    const lat = Number(raw.lat);
    const lng = Number(raw.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      out.lat = lat;
      out.lng = lng;
      if (typeof raw.label === "string" && raw.label.length > 0 && raw.label.length < 200) {
        out.label = raw.label;
      }
    }
    const r = Number(raw.radius);
    if (VALID_RADII.includes(r as Radius)) out.radius = r as Radius;
    if (typeof raw.type === "string" && VALID_TYPES.includes(raw.type as EventType)) {
      out.type = raw.type as EventType;
    }
    return out;
  },
  head: () => ({
    meta: [
      { title: "Find Running Events Near You — UK Race Finder" },
      {
        name: "description",
        content:
          "Discover 5K, 10K, half marathons, marathons and trail races across the UK — sorted by distance from your location.",
      },
      {
        property: "og:title",
        content: "Find Running Events Near You — UK Race Finder",
      },
      {
        property: "og:description",
        content:
          "Discover 5K, 10K, half marathons, marathons and trail races across the UK — sorted by distance from your location.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: SITE_URL,
          description:
            "Discover running events near you across the UK — 5K to ultra, sorted by distance.",
        }),
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const coords: Coords | null =
    search.lat != null && search.lng != null
      ? { lat: search.lat, lng: search.lng, label: search.label }
      : null;
  const radius: Radius = search.radius ?? 10;
  const eventType: EventType = search.type ?? "all";

  const setCoords = (c: Coords) =>
    navigate({
      search: (prev: HomeSearch) => ({ ...prev, lat: c.lat, lng: c.lng, label: c.label }),
    });
  const setRadius = (r: Radius) =>
    navigate({ search: (prev: HomeSearch) => ({ ...prev, radius: r }) });
  const setEventType = (t: EventType) =>
    navigate({ search: (prev: HomeSearch) => ({ ...prev, type: t }) });

  const { data: nearbyEvents, isLoading } = useQuery({
    queryKey: ["events", "nearby", coords?.lat, coords?.lng, radius],
    enabled: !!coords,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("events_within_radius", {
        p_lat: coords!.lat,
        p_lng: coords!.lng,
        p_radius_miles: radius,
        p_max_results: 500,
      });
      if (error) throw error;
      return data;
    },
  });

  const { data: upcomingEvents } = useQuery({
    queryKey: ["events", "upcoming", "quality-v1"],
    queryFn: async () => {
      const now = new Date();
      const from = new Date(now.getTime() + 30 * 86400000)
        .toISOString()
        .slice(0, 10);
      const to = new Date(now.getTime() + 120 * 86400000)
        .toISOString()
        .slice(0, 10);
      const { data, error } = await supabase
        .from("events")
        .select(
          "id, slug, name, date_raw, town, county, distance_type:distances, entry_fee, entry_url, organiser_url, source_url, is_featured, date_is_estimated",
        )
        .eq("status", "ACTIVE")
        .eq("date_is_estimated", false)
        .gte("sort_date", from)
        .lte("sort_date", to)
        .not("lat", "is", null)
        .not("lng", "is", null)
        .not("town", "is", null)
        .not("county", "is", null)
        .not("distances", "is", null)
        .neq("distances", "")
        .not("name", "ilike", "%parkrun%")
        .order("is_featured", { ascending: false })
        .order("sort_date", { ascending: true })
        .limit(20);
      if (error) throw error;
      const trusted = (data ?? []).filter((e) => {
        const a = classifyEventLink(e.entry_url).kind;
        const b = classifyEventLink(e.organiser_url).kind;
        return (
          a === "entry" ||
          a === "organiser-site" ||
          b === "entry" ||
          b === "organiser-site"
        );
      });
      return trusted.slice(0, 8);
    },
  });

  const eventsWithDistance: EventCardData[] = useMemo(() => {
    if (!nearbyEvents) return [];
    return nearbyEvents.map((e) => ({
      id: e.id,
      slug: e.slug,
      name: e.name,
      date_raw: e.date_raw,
      town: e.town,
      county: e.county,
      distance_type: e.distance_type,
      entry_fee: e.entry_fee,
      entry_url: e.entry_url,
      organiser_url: e.organiser_url,
      source_url: e.source_url,
      is_featured: e.is_featured,
      date_is_estimated: e.date_is_estimated,
      distanceMiles: e.distance_miles,
    }));
  }, [nearbyEvents]);

  const visibleEvents: EventCardData[] = useMemo(() => {
    return eventsWithDistance
      .filter((e) => matchesEventType(e.distance_type, eventType))
      .sort((a, b) => a.distanceMiles! - b.distanceMiles!);
  }, [eventsWithDistance, eventType]);

  const races: EventCardData[] = useMemo(
    () => visibleEvents.filter((e) => !isParkrunEvent(e)),
    [visibleEvents],
  );
  const parkruns: EventCardData[] = useMemo(
    () => visibleEvents.filter((e) => isParkrunEvent(e)),
    [visibleEvents],
  );

  const featuredNearby: EventCardData[] = useMemo(() => {
    return eventsWithDistance
      .filter((e) => e.is_featured)
      .sort((a, b) => a.distanceMiles! - b.distanceMiles!);
  }, [eventsWithDistance]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-3xl px-4 pt-12 pb-8 sm:pt-20 sm:pb-12 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
            Find running events near you
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Discover 5Ks, 10Ks, half marathons and more across the UK — sorted
            by distance from you.
          </p>

          <div className="mt-8">
            <LocationPrompt onLocate={setCoords} />
          </div>

          {coords?.label && (
            <p className="mt-4 text-sm text-muted-foreground inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-primary" />
              Showing events near{" "}
              <span className="font-medium text-foreground">
                {coords.label}
              </span>
            </p>
          )}
        </section>

        {/* Results (after location set) */}
        {coords && (
          <section className="mx-auto max-w-6xl px-4 pb-12">
            <div className="mb-6">
              <FilterBar
                radius={radius}
                onRadiusChange={setRadius}
                eventType={eventType}
                onEventTypeChange={setEventType}
              />
            </div>

            {isLoading ? (
              <p className="text-center text-muted-foreground py-12">
                Loading events…
              </p>
            ) : visibleEvents.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-muted/30">
                <p className="text-lg font-medium text-foreground">
                  No events within {radius} miles
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try widening your radius or changing the event type.
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  {races.length} {races.length === 1 ? "event" : "events"} found
                  {parkruns.length > 0 && (
                    <>
                      {" "}
                      · {parkruns.length}{" "}
                      {parkruns.length === 1 ? "parkrun" : "parkruns"}
                    </>
                  )}
                </p>
                {races.length > 0 && (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {races.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                )}
                {parkruns.length > 0 && (
                  <div className={races.length > 0 ? "mt-10" : undefined}>
                    <h2 className="text-xl font-semibold text-foreground">
                      Free weekly parkruns near you
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Every Saturday (juniors on Sunday) — free, timed, all
                      abilities welcome.
                    </p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {parkruns.map((event) => (
                        <EventCard key={event.id} event={event} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* Featured events near you (after location set) */}
        {coords && featuredNearby.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 pb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Featured events near you
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredNearby.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </section>
        )}

        {/* Browse by region */}
        <section className="mx-auto max-w-6xl px-4 pb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Browse by region
          </h2>
          <p className="mt-2 text-muted-foreground">
            Explore running events across the UK by region.
          </p>
          <div className="mt-6 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {REGIONS.map((region) => (
              <Link
                key={region.slug}
                to="/running-events/$slug"
                params={{ slug: region.slug }}
                className="group flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-card hover:border-primary hover:shadow-card-hover transition-all"
              >
                <span>{region.name}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            ))}
          </div>
        </section>

        {/* Browse by distance */}
        <section className="mx-auto max-w-6xl px-4 pb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Browse by distance
          </h2>
          <p className="mt-2 text-muted-foreground">
            From parkrun 5Ks to ultra marathons across the UK.
          </p>
          <div className="mt-6">
            <DistanceNav />
          </div>
        </section>

        {/* Parkrun callout */}
        <section className="mx-auto max-w-6xl px-4 pb-12">
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              to="/parkrun-events"
              className="group rounded-2xl border border-border bg-card p-6 shadow-card hover:border-primary hover:shadow-card-hover transition-all"
            >
              <h3 className="text-lg font-semibold text-foreground">
                Free weekly 5K · parkrun
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                1,100+ parkrun locations across the UK. Every Saturday, 9am.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:underline">
                Find your nearest parkrun →
              </span>
            </Link>
            <Link
              to="/junior-parkrun-events"
              className="group rounded-2xl border border-border bg-card p-6 shadow-card hover:border-primary hover:shadow-card-hover transition-all"
            >
              <h3 className="text-lg font-semibold text-foreground">
                Free weekly 2K · junior parkrun
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                For ages 4–14. Every Sunday morning at 9:30am.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:underline">
                Find a junior parkrun →
              </span>
            </Link>
          </div>
        </section>

        {/* Discover events across the UK (when no location set) */}
        {!coords && upcomingEvents && upcomingEvents.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 pb-16">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Discover events across the UK
            </h2>
            <p className="mt-2 text-muted-foreground">
              A selection of races coming up across the UK.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingEvents.map((e) => (
                <EventCard
                  key={e.id}
                  event={{
                    id: e.id,
                    slug: e.slug,
                    name: e.name,
                    date_raw: e.date_raw,
                    town: e.town,
                    county: e.county,
                    distance_type: e.distance_type,
                    entry_fee: e.entry_fee,
                    entry_url: e.entry_url,
                    organiser_url: e.organiser_url,
                    source_url: e.source_url,
                    is_featured: e.is_featured,
                    date_is_estimated: e.date_is_estimated,
                  }}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
      <Toaster position="top-center" />
    </div>
  );
}
