import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { getEventsForCounty } from "@/lib/county.functions";
import { countyBySlug } from "@/lib/counties";
import { CITIES } from "@/lib/cities";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { BackToSearchBar } from "@/components/site/BackToSearchBar";
import { EventCard, type EventCardData } from "@/components/events/EventCard";
import { ChipLinkRow, type Chip } from "@/components/site/ChipLinkRow";
import { SITE_URL, CURRENT_YEAR } from "@/lib/site";
import type { CountyPageData } from "@/lib/county.functions";

function toCard(e: CountyPageData["events"][number]): EventCardData {
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

export const Route = createFileRoute("/running-events-in/$county")({
  beforeLoad: ({ params }) => {
    if (!countyBySlug(params.county)) throw notFound();
  },
  loader: ({ params }) => getEventsForCounty({ data: { slug: params.county } }),
  head: ({ params, loaderData }) => {
    const cfg = countyBySlug(params.county);
    const label = cfg?.label ?? "UK";
    const total = loaderData?.total ?? 0;
    const canonical = `${SITE_URL}/running-events-in/${params.county}`;
    const title = `${label} Running Events ${CURRENT_YEAR} — ${total.toLocaleString()} Races`;
    const description = `Find ${total.toLocaleString()} upcoming running events in ${label}. 5K, 10K, half marathons and more — dates, distances and direct entry links.`;
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
    const breadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: label, item: canonical },
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
  component: CountyPage,
  notFoundComponent: NotFound,
});

function CountyPage() {
  const data = Route.useLoaderData();
  const { county: countySlug } = Route.useParams();
  const { events, total, countyLabel } = data;
  const dbNames = (countyBySlug(countySlug)?.dbNames ?? []).map((n) => n.toLowerCase());
  const cityChips: Chip[] = CITIES.filter((c) =>
    dbNames.includes(c.county.toLowerCase()),
  ).map((c) => ({
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
            Running events in {countyLabel}
          </h1>
          <p className="mt-3 text-muted-foreground">
            <span className="font-medium text-foreground">
              {total.toLocaleString()}
            </span>{" "}
            upcoming races across {countyLabel}.
          </p>
          {cityChips.length > 0 && (
            <div className="mt-5">
              <ChipLinkRow ariaLabel="Cities in this county" chips={cityChips} />
            </div>
          )}
        </section>
        <section className="mx-auto max-w-6xl px-4 pb-16">
          {events.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-muted/30">
              <p className="text-lg font-medium text-foreground">
                No events listed yet for {countyLabel}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((e: CountyPageData["events"][number]) => (
                <EventCard key={e.id} event={toCard(e)} />
              ))}
            </div>
          )}
        </section>
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
          <h1 className="text-3xl font-bold text-foreground">County not found</h1>
          <p className="mt-3 text-muted-foreground">
            We don't yet have a landing page for that county.
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
