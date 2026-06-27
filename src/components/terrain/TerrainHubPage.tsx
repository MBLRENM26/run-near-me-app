import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { BackToSearchBar } from "@/components/site/BackToSearchBar";
import { EventCard, type EventCardData } from "@/components/events/EventCard";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { TerrainHubData } from "@/lib/terrain.functions";
import type { TerrainCopy } from "@/content/terrain-copy";
import { SITE_URL } from "@/lib/site";

function toCard(e: TerrainHubData["events"][number]): EventCardData {
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

export type TerrainHubConfig = {
  /** URL path without leading slash, e.g. "road-races" */
  slug: string;
  /** Page H1 */
  h1: string;
  /** Short name used in body copy (e.g. "road race", "fell race") */
  noun: string;
  /** Plural noun (e.g. "road races") */
  nounPlural: string;
  /** Title text for the <title> tag */
  metaTitle: (total: number) => string;
  /** Meta description text */
  metaDescription: (total: number) => string;
  copy: TerrainCopy;
};

interface Props {
  cfg: TerrainHubConfig;
  data: TerrainHubData;
}

export function TerrainHubPage({ cfg, data }: Props) {
  const { events, total } = data;
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
          <p className="mt-3 text-muted-foreground">
            <span className="font-medium text-foreground">
              {total.toLocaleString()}
            </span>{" "}
            upcoming {cfg.nounPlural} across the UK.
          </p>
        </section>

        {/* Editorial intro — 150–250 words, hardcoded copy. */}
        <section className="mx-auto max-w-3xl px-4 pb-6">
          <div className="prose prose-sm sm:prose-base max-w-none text-foreground">
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {cfg.copy.intro}
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16">
          {events.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-muted/30">
              <p className="text-lg font-medium text-foreground">
                No {cfg.nounPlural} listed yet
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Upcoming {cfg.nounPlural}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {events.map((e) => (
                  <EventCard key={e.id} event={toCard(e)} />
                ))}
              </div>
            </>
          )}
        </section>

        <section className="mx-auto max-w-3xl px-4 pb-16">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Frequently asked questions
          </h2>
          <div className="mt-4">
            <Accordion type="single" collapsible className="w-full">
              {cfg.copy.faqs.map((faq, i) => (
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

export function buildTerrainHubHead(cfg: TerrainHubConfig, data: TerrainHubData) {
  const total = data.total;
  const canonical = `${SITE_URL}/${cfg.slug}`;
  const title = cfg.metaTitle(total);
  const description = cfg.metaDescription(total);

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

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: cfg.copy.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: cfg.h1, item: canonical },
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
      { type: "application/ld+json", children: JSON.stringify(faqLd) },
      { type: "application/ld+json", children: JSON.stringify(breadcrumb) },
    ],
  };
}
