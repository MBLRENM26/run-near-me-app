import { useEffect } from "react";
import { createFileRoute, Link, notFound, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { trackRegionView } from "@/lib/analytics";
import { ArrowLeft, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { EventCard, type EventCardData } from "@/components/events/EventCard";
import { MonthFilter } from "@/components/events/MonthFilter";
import { Toaster } from "@/components/ui/sonner";
import { slugToRegion } from "@/lib/regions";
import { SITE_URL } from "@/lib/site";
import { BackToSearchBar } from "@/components/site/BackToSearchBar";
import { hasOrganiserOwnedLink } from "@/lib/link-trust";


import { DistanceNav } from "@/components/distance/DistanceNav";
import {
  availableMonths,
  filterByMonth,
  formatMonthLabelLong,
  monthSearchValidator,
  sortEstimatedLastWithinMonth,
  type MonthKey,
  type MonthSearch,
} from "@/lib/month-filter";

const SLUG_REDIRECTS: Record<string, string> = {
  kent: "south-east",
};

export const Route = createFileRoute("/running-events/$slug")({
  validateSearch: monthSearchValidator,
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
    const year = new Date().getUTCFullYear();
    const canonical = `${SITE_URL}/running-events/${params.slug}`;
    const title = `Running Events in ${name} ${year} — 5K, 10K, Half Marathon & More | Running Events Near Me`;
    const description = `Upcoming running events in ${name} for ${year}. Browse 5K, 10K, half marathons, marathons, trail and ultra races by date and enter direct.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        {
          property: "og:description",
          content: description,
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
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
              { "@type": "ListItem", position: 2, name, item: canonical },
            ],
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
  const search = Route.useSearch() as MonthSearch;
  const navigate = useNavigate({ from: "/running-events/$slug" });
  const month = search.month;

  const setMonth = (m: MonthKey | undefined) =>
    navigate({
      search: (prev: MonthSearch) => ({ ...prev, month: m }),
      replace: true,
    });

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
            "id, slug, name, date_raw, sort_date, town, county, distance_type:distances, entry_fee, entry_url, organiser_url, is_featured, date_is_estimated",
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
      return sortEstimatedLastWithinMonth(all);
    },
  });

  const months = events ? availableMonths(events) : [];
  const filtered = events ? filterByMonth(events, month) : [];

  useEffect(() => {
    if (events) trackRegionView({ region: region.name, total_events: events.length });
  }, [region.name, events]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pt-10 pb-6">
          <BackToSearchBar />
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

        <section className="mx-auto max-w-6xl px-4 pb-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Browse by distance in {region.name}
          </h2>
          <DistanceNav regionSlug={slug} />
          <p className="mt-4 text-sm">
            <Link
              to="/parkrun-events/region/$region"
              params={{ region: slug }}
              className="font-medium text-primary hover:underline"
            >
              Find a parkrun in {region.name} →
            </Link>
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16">
          {months.length >= 2 && (
            <div className="mb-4">
              <MonthFilter months={months} value={month} onChange={setMonth} />
            </div>
          )}
          {month && (
            <p className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
              Showing events in{" "}
              <span className="font-medium text-foreground">
                {formatMonthLabelLong(month)}
              </span>
              <button
                type="button"
                onClick={() => setMonth(undefined)}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <X className="h-3.5 w-3.5" />
                clear
              </button>
            </p>
          )}
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
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-muted/30">
              <p className="text-lg font-medium text-foreground">
                No events in {region.name} in {month ? formatMonthLabelLong(month) : "this month"} yet
              </p>
              <button
                type="button"
                onClick={() => setMonth(undefined)}
                className="mt-3 text-sm text-primary hover:underline"
              >
                Show all months
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Upcoming events
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                {filtered.length} {filtered.length === 1 ? "event" : "events"}
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((event) => (
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
