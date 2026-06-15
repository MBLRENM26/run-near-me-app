import { useEffect } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, X } from "lucide-react";
import { trackRegionView } from "@/lib/analytics";
import { Header } from "@/components/site/Header";
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
import { REGIONS, type Region } from "@/lib/regions";
import {
  DISTANCE_PAGES,
  DISTANCE_PAGE_LIST,
  type DistancePageConfig,
  type DistanceKey,
} from "@/lib/distance-filters";
import type {
  DistanceEvent,
  RegionDistancePageData,
} from "@/lib/events.functions";
import {
  availableMonths,
  filterByMonth,
  formatMonthLabelLong,
  type MonthKey,
} from "@/lib/month-filter";
import { CURRENT_YEAR } from "@/lib/site";

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

interface RegionDistancePageProps {
  cfg: DistancePageConfig;
  region: Region;
  data: RegionDistancePageData;
}

export function RegionDistancePage({
  cfg,
  region,
  data,
}: RegionDistancePageProps) {
  const { events, total, otherDistanceCounts } = data;
  const search = useSearch({ strict: false }) as { month?: MonthKey };
  const navigate = useNavigate();
  const month = search.month;
  const months = availableMonths(events);
  const filtered = filterByMonth(events, month);
  const showing = filtered.length;
  const h1 = `${headingDistance(cfg)} in ${region.name} ${CURRENT_YEAR}`;
  const noun = pluralNoun(cfg);

  useEffect(() => {
    trackRegionView({ region: region.name, distance: cfg.key, total_events: total });
  }, [region.name, cfg.key, total]);

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
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-sm text-muted-foreground"
          >
            <Link to="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <span aria-hidden>/</span>
            <Link
              to="/running-events/$slug"
              params={{ slug: region.slug }}
              className="hover:text-foreground transition-colors"
            >
              {region.name}
            </Link>
            <span aria-hidden>/</span>
            <span className="text-foreground">{cfg.label}</span>
          </nav>
          <Link
            to="/running-events/$slug"
            params={{ slug: region.slug }}
            className="mt-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            All running events in {region.name}
          </Link>
          <h1 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            {h1}
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            {total > 0 ? (
              <>
                <span className="font-medium text-foreground">
                  {total.toLocaleString()}
                </span>{" "}
                upcoming {noun} in {region.name}. Browse dates, entry fees and
                links to enter.
              </>
            ) : (
              <>
                We don't currently have any {noun} listed in {region.name}.
                Check back soon — we add new listings every week.
              </>
            )}
          </p>
          <div className="mt-6">
            <DistanceNav active={cfg.key} regionSlug={region.slug} />
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
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
              <p className="text-lg font-medium text-foreground">
                {month
                  ? `No ${noun} in ${region.name} in ${formatMonthLabelLong(month)} yet`
                  : `No ${noun} listed in ${region.name} yet`}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {month ? "Try a different month or widen your search." : "Try expanding your search."}
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                {month && (
                  <button
                    type="button"
                    onClick={() => setMonth(undefined)}
                    className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Show all months
                  </button>
                )}
                <DistanceHomeLink cfg={cfg}>
                  See all {noun} in the UK
                </DistanceHomeLink>
                <Link
                  to="/running-events/$slug"
                  params={{ slug: region.slug }}
                  className="inline-flex items-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:border-primary"
                >
                  All events in {region.name}
                </Link>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Upcoming {noun} in {region.name}
              </h2>
              {!month && total > showing ? (
                <p className="text-sm text-muted-foreground mb-4">
                  Showing the next {showing} of {total.toLocaleString()}.
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


        <section className="mx-auto max-w-6xl px-4 pb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Other distances in {region.name}
          </h2>
          <p className="mt-2 text-muted-foreground">
            Browse races by distance across {region.name}.
          </p>
          <div className="mt-6 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-3">
            {DISTANCE_PAGE_LIST.filter((p) => p.key !== cfg.key).map((p) => {
              const c = otherDistanceCounts[p.key] ?? 0;
              return (
                <Link
                  key={p.key}
                  to="/running-events/$slug/$distance"
                  params={{ slug: region.slug, distance: p.slug }}
                  className="group flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-card hover:border-primary hover:shadow-card-hover transition-all"
                >
                  <span>
                    {p.label} in {region.name}
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

        <section className="mx-auto max-w-6xl px-4 pb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {headingDistance(cfg)} in other UK regions
          </h2>
          <p className="mt-2 text-muted-foreground">
            Find {noun} elsewhere in the UK.
          </p>
          <div className="mt-6 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {REGIONS.filter((r) => r.slug !== region.slug).map((r) => (
              <Link
                key={r.slug}
                to="/running-events/$slug/$distance"
                params={{ slug: r.slug, distance: cfg.slug }}
                className="group flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-card hover:border-primary hover:shadow-card-hover transition-all"
              >
                <span>{r.name}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            ))}
          </div>
          <p className="mt-6 text-sm">
            <Link
              to="/parkrun-events/region/$region"
              params={{ region: region.slug }}
              className="font-medium text-primary hover:underline"
            >
              Find a parkrun in {region.name} →
            </Link>
          </p>
        </section>

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
      </main>
      <Footer />
    </div>
  );
}

function headingDistance(cfg: DistancePageConfig): string {
  const idx = cfg.h1.indexOf(" in the UK");
  return idx > 0 ? cfg.h1.slice(0, idx) : cfg.label;
}

function pluralNoun(cfg: DistancePageConfig): string {
  switch (cfg.key) {
    case "5k":
      return "5K races";
    case "10k":
      return "10K races";
    case "half-marathon":
      return "half marathons";
    case "marathon":
      return "marathons";
    case "trail":
      return "trail running events";
    case "ultra":
      return "ultra marathons";
  }
}

function DistanceHomeLink({
  cfg,
  children,
}: {
  cfg: DistancePageConfig;
  children: React.ReactNode;
}) {
  const cls =
    "inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90";
  switch (cfg.key) {
    case "5k":
      return <Link to="/5k-races" className={cls}>{children}</Link>;
    case "10k":
      return <Link to="/10k-races" className={cls}>{children}</Link>;
    case "half-marathon":
      return <Link to="/half-marathons" className={cls}>{children}</Link>;
    case "marathon":
      return <Link to="/marathons" className={cls}>{children}</Link>;
    case "trail":
      return <Link to="/trail-running-events" className={cls}>{children}</Link>;
    case "ultra":
      return <Link to="/ultra-marathons" className={cls}>{children}</Link>;
  }
}

interface BuildHeadArgs {
  cfg: DistancePageConfig;
  region: Region;
  data: RegionDistancePageData | undefined;
  canonicalPath: string;
  siteUrl: string;
}

export function buildRegionDistanceHead({
  cfg,
  region,
  data,
  canonicalPath,
  siteUrl,
}: BuildHeadArgs) {
  const total = data?.total ?? 0;
  const noun = pluralNoun(cfg);
  const heading = headingDistance(cfg);
  const title = `${heading} in ${region.name} ${CURRENT_YEAR} — Running Events Near Me`;
  const description =
    total > 0
      ? `Find ${total.toLocaleString()} upcoming ${noun} in ${region.name} for ${CURRENT_YEAR}. Browse dates, entry fees and links to enter.`
      : `Upcoming ${noun} in ${region.name}. Browse dates, entry fees and links to enter when new events are listed.`;
  const canonical = `${siteUrl}${canonicalPath}`;
  const thin = total < 3;

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${heading} in ${region.name}`,
    description,
    url: canonical,
    about: { "@type": "Place", name: region.name },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${siteUrl}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: `Running events in ${region.name}`,
        item: `${siteUrl}/running-events/${region.slug}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${heading} in ${region.name}`,
        item: canonical,
      },
    ],
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

  const meta = [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: canonical },
  ];
  if (thin) {
    meta.push({ name: "robots", content: "noindex, follow" });
  }

  return {
    meta,
    links: [{ rel: "canonical", href: canonical }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(collectionLd) },
      { type: "application/ld+json", children: JSON.stringify(breadcrumbLd) },
      { type: "application/ld+json", children: JSON.stringify(faqLd) },
    ],
  };
}

export { DISTANCE_PAGES };
export type { DistanceKey };
