import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
import { EventCard, type EventCardData } from "@/components/events/EventCard";
import { Toaster } from "@/components/ui/sonner";
import { matchesEventType, type EventType } from "@/lib/distance";
import { MapPin } from "lucide-react";

export const Route = createFileRoute("/")({
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
  const [coords, setCoords] = useState<Coords | null>(null);
  const [radius, setRadius] = useState<Radius>(10);
  const [eventType, setEventType] = useState<EventType>("all");

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
    queryKey: ["events", "upcoming"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(
          "id, name, date_raw, town, county, distance_type:distances, entry_fee, url:entry_url, is_featured",
        )
        .eq("status", "ACTIVE")
        .eq("is_upcoming", true)
        .order("sort_date", { ascending: true, nullsFirst: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  const eventsWithDistance: EventCardData[] = useMemo(() => {
    if (!nearbyEvents) return [];
    return nearbyEvents.map((e) => ({
      id: e.id,
      name: e.name,
      date_raw: e.date_raw,
      town: e.town,
      county: e.county,
      distance_type: e.distance_type,
      entry_fee: e.entry_fee,
      url: e.url,
      is_featured: e.is_featured,
      distanceMiles: e.distance_miles,
    }));
  }, [nearbyEvents]);

  const visibleEvents: EventCardData[] = useMemo(() => {
    return eventsWithDistance
      .filter((e) => matchesEventType(e.distance_type, eventType))
      .sort((a, b) => a.distanceMiles! - b.distanceMiles!);
  }, [eventsWithDistance, eventType]);

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
                  {visibleEvents.length}{" "}
                  {visibleEvents.length === 1 ? "event" : "events"} found
                </p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
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
                    name: e.name,
                    date_raw: e.date_raw,
                    town: e.town,
                    county: e.county,
                    distance_type: e.distance_type,
                    entry_fee: e.entry_fee,
                    url: e.url,
                    is_featured: e.is_featured,
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
