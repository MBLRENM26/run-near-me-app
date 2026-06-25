import { useEffect } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, X } from "lucide-react";
import { trackRegionView } from "@/lib/analytics";
import { Header } from "@/components/site/Header";
import { BackToSearchBar } from "@/components/site/BackToSearchBar";

import { Footer } from "@/components/site/Footer";
import { EventCard, type EventCardData } from "@/components/events/EventCard";
import { MonthFilter } from "@/components/events/MonthFilter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DistanceNav } from "./DistanceNav";
import { REGIONS } from "@/lib/regions";
import type {
  DistancePageConfig,
  DistanceKey,
} from "@/lib/distance-filters";
import type {
  DistanceEvent,
  DistancePageData,
} from "@/lib/events.functions";
import {
  availableMonths,
  filterByMonth,
  formatMonthLabelLong,
  type MonthKey,
} from "@/lib/month-filter";

function regionSlugFromName(name: string): string | null {
  return REGIONS.find((r) => r.name === name)?.slug ?? null;
}

function toEventCardData(e: DistanceEvent): EventCardData {
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
    date_is_estimated: e.date_is_estimated,
    is_recurring: e.is_recurring,
  };
}

interface DistancePageProps {
  cfg: DistancePageConfig;
  data: DistancePageData;
}

export function DistancePage({ cfg, data }: DistancePageProps) {
  const { events, regionCounts, total } = data;
  const search = useSearch({ strict: false }) as { month?: MonthKey };
  const navigate = useNavigate();
  const month = search.month;

  useEffect(() => {
    trackRegionView({ region: "UK", distance: cfg.key, total_events: total });
  }, [cfg.key, total]);

  const months = availableMonths(events);
  const filtered = filterByMonth(events, month);
  const showing = filtered.length;

  const setMonth = (m: MonthKey | undefined) =>
    navigate({
      to: ".",
      search: (prev: Record<string, unknown>) => ({ ...prev, month: m }),
      replace: true,
    });

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
            {cfg.h1}
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">{cfg.intro}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {total.toLocaleString()}
            </span>{" "}
            upcoming {cfg.shortName === "5K" || cfg.shortName === "10K" ? cfg.shortName + " races" : cfg.shortName + "s"} across the UK
          </p>
          <div className="mt-6">
            <DistanceNav active={cfg.key} />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-12">
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
          {filtered.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-muted/30">
              <p className="text-lg font-medium text-foreground">
                {month
                  ? `No ${cfg.shortName} races in ${formatMonthLabelLong(month)} yet`
                  : "No upcoming events found"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {month ? (
                  <button
                    type="button"
                    onClick={() => setMonth(undefined)}
                    className="text-primary hover:underline"
                  >
                    Show all months
                  </button>
                ) : (
                  "Check back soon — we add new listings every week."
                )}
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Upcoming {cfg.shortName} races
              </h2>
              {!month && total > showing ? (
                <p className="text-sm text-muted-foreground mb-4">
                  Showing the next {showing} of {total.toLocaleString()} —{" "}
                  <Link
                    to="/"
                    className="underline hover:text-foreground"
                  >
                    use the location finder
                  </Link>{" "}
                  to see races near you.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mb-4">
                  {showing} {showing === 1 ? "event" : "events"}
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((e) => (
                  <EventCard key={e.id} event={toEventCardData(e)} />
                ))}
              </div>
            </>
          )}
        </section>


        {regionCounts.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 pb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {cfg.h1.replace(`in the UK`, "by region")}
            </h2>
            <p className="mt-2 text-muted-foreground">
              Browse {cfg.shortName} races by UK region.
            </p>
            <div className="mt-6 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {REGIONS.map((region) => {
                const c =
                  regionCounts.find((rc) => rc.region === region.name)
                    ?.count ?? 0;
                return (
                  <Link
                    key={region.slug}
                    to="/running-events/$slug/$distance"
                    params={{ slug: region.slug, distance: cfg.slug }}
                    className="group flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-card hover:border-primary hover:shadow-card-hover transition-all"
                  >
                    <span>
                      {region.name}
                      {c > 0 && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          ({c})
                        </span>
                      )}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section className="mx-auto max-w-3xl px-4 pb-16">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Frequently asked questions
          </h2>
          <div className="mt-4">
            <Accordion type="single" collapsible className="w-full">
              {cfg.faqs.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-base font-medium">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Looking for a different distance?
          </h2>
          <DistanceNav active={cfg.key} />
        </section>
      </main>
      <Footer />
    </div>
  );
}

/**
 * Build the meta + JSON-LD head config for a distance page.
 * Used inside each route's `head()` so title/description/JSON-LD all
 * come from one source.
 */
export function buildDistanceHead(
  cfg: DistancePageConfig,
  data: DistancePageData | undefined,
  canonicalPath: string,
  siteUrl: string,
) {
  const total = data?.total ?? 0;
  const description = cfg.metaDescription(total);
  const canonical = `${siteUrl}${canonicalPath}`;
  // Append live count to the title when known — front-loads volume,
  // gives the listing a "fresh / actively curated" signal in SERPs.
  const title =
    total > 0
      ? cfg.metaTitle.replace(
          / — Running Events Near Me$/,
          ` — ${total.toLocaleString()} Upcoming | Running Events Near Me`,
        )
      : cfg.metaTitle;

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: cfg.h1,
    description,
    url: canonical,
    about: { "@type": "Thing", name: `${cfg.shortName} running events` },
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: cfg.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: `${cfg.shortName} Races`, item: canonical },
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
      {
        type: "application/ld+json",
        children: JSON.stringify(collectionLd),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(breadcrumbLd),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(faqLd),
      },
    ],
  };
}

export type { DistanceKey };
