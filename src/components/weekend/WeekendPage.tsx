import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { BackToSearchBar } from "@/components/site/BackToSearchBar";
import { EventCard, type EventCardData } from "@/components/events/EventCard";
import type { WeekendPageData } from "@/lib/weekend.functions";
import type { WeekendWhich } from "@/lib/weekend";
import { formatWeekendRange } from "@/lib/weekend";
import { SITE_URL } from "@/lib/site";

function toCard(e: WeekendPageData["events"][number]): EventCardData {
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
  which: WeekendWhich;
  data: WeekendPageData;
}

export function WeekendPage({ which, data }: Props) {
  const { events, total, range } = data;
  const heading = which === "this" ? "Running Events This Weekend" : "Running Events Next Weekend";
  const otherHref = which === "this" ? "/running-events-next-weekend" : "/running-events-this-weekend";
  const otherLabel = which === "this" ? "See next weekend →" : "← See this weekend";
  const rangeLabel = formatWeekendRange(range);

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
            {heading}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {rangeLabel} ·{" "}
            <span className="font-medium text-foreground">{total}</span>{" "}
            {total === 1 ? "event" : "events"}
          </p>
          <div className="mt-4">
            <Link
              to={otherHref}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              {otherLabel}
              {which === "this" && <ArrowRight className="h-4 w-4" />}
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16">
          {events.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-muted/30">
              <p className="text-lg font-medium text-foreground">
                No races listed for {which === "this" ? "this" : "next"} weekend yet
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try{" "}
                <Link to={otherHref} className="text-primary hover:underline">
                  {which === "this" ? "next weekend" : "this weekend"}
                </Link>{" "}
                or{" "}
                <Link to="/" className="text-primary hover:underline">
                  search by location
                </Link>
                .
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

export function buildWeekendHead(which: WeekendWhich, data: WeekendPageData) {
  const { total, range } = data;
  const path = which === "this" ? "/running-events-this-weekend" : "/running-events-next-weekend";
  const canonical = `${SITE_URL}${path}`;
  const weekendWord = which === "this" ? "This Weekend" : "Next Weekend";
  const friDateShort = range.friISO;
  const sunDateShort = range.sunISO;

  const title = `Running Events ${weekendWord} — ${total} Races Across the UK | Entry & Info`;
  const description = `Find ${total} running events happening ${which === "this" ? "this" : "next"} weekend near region/county or based on their location. Entry links, distances and venue details for races on ${friDateShort}–${sunDateShort}.`;

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
      { "@type": "ListItem", position: 2, name: `Running events ${weekendWord.toLowerCase()}`, item: canonical },
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
