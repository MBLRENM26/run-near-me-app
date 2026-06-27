import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { BackToSearchBar } from "@/components/site/BackToSearchBar";
import { EventCard, type EventCardData } from "@/components/events/EventCard";
import type { MonthPageData } from "@/lib/month-page.functions";
import { formatMonthYearLong } from "@/lib/month-slug";
import { SITE_URL } from "@/lib/site";
import { DISTANCE_PAGES, type DistanceKey } from "@/lib/distance-filters";

function toCard(e: MonthPageData["events"][number]): EventCardData {
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

interface Props {
  data: MonthPageData;
  distanceKey?: DistanceKey;
}

export function MonthPage({ data, distanceKey }: Props) {
  const { events, total, monthKey } = data;
  const monthLabel = formatMonthYearLong(monthKey);
  const distanceCfg = distanceKey ? DISTANCE_PAGES[distanceKey] : null;
  const noun = distanceCfg
    ? `${distanceCfg.shortName === "5K" || distanceCfg.shortName === "10K" ? distanceCfg.shortName + " races" : distanceCfg.shortName + "s"}`
    : "running events";
  const h1 = distanceCfg
    ? `${distanceCfg.shortName === "5K" || distanceCfg.shortName === "10K" ? distanceCfg.shortName + " Races" : distanceCfg.h1.split(" in ")[0]} in ${monthLabel}`
    : `Running Events in ${monthLabel}`;

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
            {h1}
          </h1>
          <p className="mt-3 text-muted-foreground">
            <span className="font-medium text-foreground">{total.toLocaleString()}</span>{" "}
            UK {noun} in {monthLabel}.
          </p>
          {distanceCfg && (
            <p className="mt-2 text-sm">
              <Link to={`/${distanceCfg.slug}` as "/5k-races"} className="text-primary hover:underline">
                ← All {distanceCfg.shortName} races
              </Link>
            </p>
          )}
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16">
          {events.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-muted/30">
              <p className="text-lg font-medium text-foreground">
                No {noun} listed for {monthLabel} yet
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                We add new races every week — check back soon.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((e) => (
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

export function buildMonthHead(
  data: MonthPageData,
  path: string,
  distanceKey?: DistanceKey,
) {
  const { total, monthKey } = data;
  const monthLabel = formatMonthYearLong(monthKey);
  const canonical = `${SITE_URL}${path}`;
  const cfg = distanceKey ? DISTANCE_PAGES[distanceKey] : null;
  const noun = cfg
    ? cfg.shortName === "5K" || cfg.shortName === "10K"
      ? `${cfg.shortName} races`
      : `${cfg.shortName}s`
    : "Running Events";

  const title = cfg
    ? `${noun.replace(/^./, (c) => c.toUpperCase())} in ${monthLabel} — ${total} UK Races`
    : `Running Events in ${monthLabel} — ${total} UK Races`;
  const description = cfg
    ? `Browse ${total} UK ${noun} in ${monthLabel}. Dates, locations, distances and direct entry links.`
    : `Browse ${total} UK running events in ${monthLabel}. Dates, locations, distances and direct entry links to every race.`;

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: title,
    numberOfItems: data.events.length,
    itemListElement: data.events.slice(0, 50).map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: e.slug ? `${SITE_URL}/events/${e.slug}` : undefined,
      name: e.name,
    })),
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      ...(cfg
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: cfg.h1.split(" in ")[0],
              item: `${SITE_URL}/${cfg.slug}`,
            },
            { "@type": "ListItem", position: 3, name: monthLabel, item: canonical },
          ]
        : [
            { "@type": "ListItem", position: 2, name: monthLabel, item: canonical },
          ]),
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
      { type: "application/ld+json", children: JSON.stringify(itemList) },
      { type: "application/ld+json", children: JSON.stringify(breadcrumb) },
    ],
  };
}
