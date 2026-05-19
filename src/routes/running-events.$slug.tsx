import { createFileRoute, Link, notFound, redirect, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { EventCard, type EventCardData } from "@/components/events/EventCard";
import { Toaster } from "@/components/ui/sonner";
import { slugToRegion } from "@/lib/regions";
import { SITE_URL } from "@/lib/site";

const SLUG_REDIRECTS: Record<string, string> = {
  kent: "south-east",
};

export const Route = createFileRoute("/running-events/$slug")({
  beforeLoad: ({ params }) => {
    const target = SLUG_REDIRECTS[params.slug];
    if (target) {
      throw redirect({
        to: "/running-events/$slug",
        params: { slug: target },
        statusCode: 301,
      });
    }
    if (!slugToRegion(params.slug)) throw notFound();
  },
  head: ({ params }) => {
    const region = slugToRegion(params.slug);
    const name = region?.name ?? "UK";
    const canonical = `${SITE_URL}/running-events/${params.slug}`;
    return {
      meta: [
        { title: `Running Events in ${name} — UK Race Finder` },
        {
          name: "description",
          content: `Browse upcoming running events in ${name}. 5K, 10K, half marathons, marathons, trail and ultra races.`,
        },
        { property: "og:title", content: `Running Events in ${name}` },
        {
          property: "og:description",
          content: `Find your next race in ${name} — UK running events near you.`,
        },
        { property: "og:type", content: "website" },
        { property: "og:url", content: canonical },
      ],
      links: [{ rel: "canonical", href: canonical }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `Running Events in ${name}`,
            description: `Upcoming running events in ${name}, UK.`,
            url: canonical,
            about: { "@type": "Place", name },
          }),
        },
      ],
    };
  },
  component: RegionPage,
  notFoundComponent: NotFoundForRegion,
  errorComponent: RegionError,
});

function RegionPage() {
  const { slug } = Route.useParams();
  const region = slugToRegion(slug)!;

  const { data: events, isLoading } = useQuery({
    queryKey: ["events", "region", region.name],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const pageSize = 1000;
      const all: EventCardData[] = [];
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
          .from("events")
          .select(
            "id, slug, name, date_raw, town, county, distance_type:distances, entry_fee, entry_url, organiser_url, source_url, is_featured",
          )
          .eq("region", region.name)
          .eq("status", "ACTIVE")
          .or(`sort_date.gte.${today},sort_date.is.null`)
          .or(
            "lat.is.null,and(lat.gte.49.9,lat.lte.60.9,lng.gte.-8.6,lng.lte.1.8)",
          )
          .order("sort_date", { ascending: true, nullsFirst: false })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...(data as EventCardData[]));
        if (data.length < pageSize) break;
      }
      return all;
    },
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pt-10 pb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to all events
          </Link>
          <h1 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Running events in {region.name}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Browse upcoming races across {region.name}.
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-12">
              Loading events…
            </p>
          ) : !events || events.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-muted/30">
              <p className="text-lg font-medium text-foreground">
                No events listed yet for {region.name}
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Upcoming events
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                {events.length} {events.length === 1 ? "event" : "events"}
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </>
          )}
        </section>
      </main>
      <Footer />
      <Toaster position="top-center" />
    </div>
  );
}

function NotFoundForRegion() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md text-center py-20">
          <h1 className="text-4xl font-bold text-foreground">Region not found</h1>
          <p className="mt-3 text-muted-foreground">
            We couldn't find that region. Try one from the homepage.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Go home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function RegionError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">
          Couldn't load events
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
