import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
import {
  haversineMiles,
  matchesEventType,
  type EventType,
} from "@/lib/distance";
import { MapPin } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Running Events Near Me — Find your next race in the UK" },
      {
        name: "description",
        content:
          "Discover running events near you across the UK. 5K, 10K, half marathons, marathons, trail and ultra races — sorted by distance from your location.",
      },
      {
        property: "og:title",
        content: "Running Events Near Me — Find your next race",
      },
      {
        property: "og:description",
        content:
          "Discover UK running events near you, sorted by distance. 5K to ultra.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [radius, setRadius] = useState<Radius>(10);
  const [eventType, setEventType] = useState<EventType>("all");

  const { data: events, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(
          "id, name, date_raw, town, county, distance_type, entry_fee, url, latitude, longitude, is_featured",
        );
      if (error) throw error;
      return data;
    },
  });

  const visibleEvents: EventCardData[] = useMemo(() => {
    if (!coords || !events) return [];
    return events
      .filter((e) => e.latitude != null && e.longitude != null)
      .map((e) => ({
        id: e.id,
        name: e.name,
        date_raw: e.date_raw,
        town: e.town,
        county: e.county,
        distance_type: e.distance_type,
        entry_fee: e.entry_fee,
        url: e.url,
        is_featured: e.is_featured,
        distanceMiles: haversineMiles(
          coords.lat,
          coords.lng,
          e.latitude!,
          e.longitude!,
        ),
      }))
      .filter(
        (e) =>
          e.distanceMiles <= radius && matchesEventType(e.distance_type, eventType),
      )
      .sort((a, b) => a.distanceMiles - b.distanceMiles);
  }, [coords, events, radius, eventType]);

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

        {/* Results */}
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
      </main>

      <Footer />
      <Toaster position="top-center" />
    </div>
  );
}
