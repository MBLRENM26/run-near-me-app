import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { getEventsForCity } from "@/lib/city.functions";
import type { CityPageData } from "@/lib/city.functions";
import { cityBySlug, nearestCities } from "@/lib/cities";
import { CITY_RADIUS_KM } from "@/lib/cities";
import { slugToRegion } from "@/lib/regions";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { BackToSearchBar } from "@/components/site/BackToSearchBar";
import { EventCard, type EventCardData } from "@/components/events/EventCard";
import { ChipLinkRow, type Chip } from "@/components/site/ChipLinkRow";
import { SITE_URL, CURRENT_YEAR } from "@/lib/site";
import { DISTANCE_PAGE_LIST } from "@/lib/distance-filters";

function toCard(e: CityPageData["events"][number]): EventCardData {
  return {
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
    is_featured: e.is_featured,
    sort_date: e.sort_date,
    date_is_estimated: e.date_is_estimated,
    is_recurring: e.is_recurring,
  };
}

export const Route = createFileRoute("/running-events-in-city/$city")({
  beforeLoad: ({ params }) => {
    if (!cityBySlug(params.city)) throw notFound();
  },
  loader: async ({ params }) => {
    const data = await getEventsForCity({ data: { slug: params.city } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ params, loaderData }) => {
    const cfg = cityBySlug(params.city);
    const name = cfg?.name ?? "UK";
    const total = loaderData?.total ?? 0;
    const canonical = `${SITE_URL}/running-events-in-city/${params.city}`;
    const title = `Running Events in ${name} ${CURRENT_YEAR} — ${total.toLocaleString()} Races | Running Events Near Me`;
    const description = `Find ${total.toLocaleString()} upcoming running events within ${CITY_RADIUS_KM} km of ${name}. 5K, 10K, half marathons and more — dates, distances and direct entry links.`;
    const itemList = loaderData
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: title,
          numberOfItems: loaderData.events.length,
          itemListElement: loaderData.events.slice(0, 50).map((e, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: e.slug ? `${SITE_URL}/events/${e.slug}` : undefined,
            name: e.name,
          })),
        }
      : null;
    const region = cfg ? slugToRegion(cfg.region) : null;
    const breadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        ...(region
          ? [{
              "@type": "ListItem",
              position: 2,
              name: region.name,
              item: `${SITE_URL}/running-events/${region.slug}`,
            }]
          : []),
        { "@type": "ListItem", position: region ? 3 : 2, name, item: canonical },
      ],
    };
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: canonical },
      ],
      links: [{ rel: "canonical", href: canonical }],
      scripts: [
        ...(itemList
          ? [{ type: "application/ld+json", children: JSON.stringify(itemList) }]
          : []),
        { type: "application/ld+json", children: JSON.stringify(breadcrumb) },
      ],
    };
  },
  component: CityPage,
  notFoundComponent: NotFound,
  errorComponent: CityError,
});

function CityPage() {
  const data = Route.useLoaderData();
  const { events, total, city, distanceCounts } = data;
  const region = slugToRegion(city.region);

  const distanceChips: Chip[] = DISTANCE_PAGE_LIST.filter(
    (d) => (distanceCounts[d.key] ?? 0) > 0,
  ).map((d) => ({
    kind: "disabled",
    key: d.key,
    label: d.label,
    count: distanceCounts[d.key],
    title: "Filter coming soon",
  }));

  const nearby = nearestCities(city, 3);
  const nearbyChips: Chip[] = nearby.map((c) => ({
    kind: "link",
    key: c.slug,
    label: c.name,
    linkProps: {
      to: "/running-events-in-city/$city",
      params: { city: c.slug },
    },
  }));

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
            Running events in {city.name} {CURRENT_YEAR}
          </h1>
          <p className="mt-3 text-muted-foreground">
            <span className="font-medium text-foreground">
              {total.toLocaleString()}
            </span>{" "}
            upcoming races within {CITY_RADIUS_KM} km of {city.name}
            {region && (
              <>
                {" "}
                ·{" "}
                <Link
                  to="/running-events/$slug"
                  params={{ slug: region.slug }}
                  className="text-primary hover:underline"
                >
                  All {region.name} events
                </Link>
              </>
            )}
          </p>
          {distanceChips.length > 0 && (
            <div className="mt-5">
              <ChipLinkRow ariaLabel="Distance mix in this city" chips={distanceChips} />
            </div>
          )}
        </section>
        <section className="mx-auto max-w-6xl px-4 pb-10">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e: CityPageData["events"][number]) => (
              <EventCard key={e.id} event={toCard(e)} />
            ))}
          </div>
        </section>
        {nearbyChips.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 pb-16">
            <h2 className="text-xl font-semibold text-foreground">Nearby cities</h2>
            <div className="mt-4">
              <ChipLinkRow ariaLabel="Nearby cities" chips={nearbyChips} />
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md text-center py-20">
          <h1 className="text-3xl font-bold text-foreground">City page not available</h1>
          <p className="mt-3 text-muted-foreground">
            We don't yet have a landing page for that city — either it isn't in
            our registry or there aren't enough upcoming events within{" "}
            {CITY_RADIUS_KM} km to publish one.
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

function CityError({ error }: { error: Error }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md text-center py-20">
          <h1 className="text-3xl font-bold text-foreground">Couldn't load this city</h1>
          <p className="mt-3 text-muted-foreground">{error.message}</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
