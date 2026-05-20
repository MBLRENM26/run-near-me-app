import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, MapPin, Search } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { REGIONS } from "@/lib/regions";
import type { ParkrunListData, ParkrunVariant } from "@/lib/parkrun.functions";
import { ParkrunMapClient } from "./ParkrunMapClient";

export interface ParkrunHubConfig {
  variant: ParkrunVariant;
  h1: string;
  intro: string;
  scheduleLine: string;
  siblingLink: { to: string; label: string };
  faqs: { q: string; a: string }[];
}

interface Props {
  cfg: ParkrunHubConfig;
  data: ParkrunListData;
}

const REGION_BY_SLUG = Object.fromEntries(REGIONS.map((r) => [r.slug, r]));

export function ParkrunHub({ cfg, data }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.locations;
    return data.locations.filter((l) => l.name.toLowerCase().includes(q));
  }, [data.locations, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const l of filtered) {
      const letter = l.name[0].toUpperCase().match(/[A-Z]/) ? l.name[0].toUpperCase() : "#";
      const arr = map.get(letter) ?? [];
      arr.push(l);
      map.set(letter, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

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
            {cfg.h1}
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">{cfg.intro}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {data.total.toLocaleString()}
            </span>{" "}
            locations · Free · {cfg.scheduleLine}
          </p>

          <div className="mt-4 inline-flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2 text-sm">
            <span className="text-muted-foreground">Looking for the other one?</span>
            <a href={cfg.siblingLink.to} className="font-medium text-primary hover:underline">
              {cfg.siblingLink.label} →
            </a>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-8">
          <ParkrunMapClient locations={data.locations} />
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name…"
              className="pl-9"
            />
          </div>
          {query && (
            <p className="mt-2 text-sm text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "match" : "matches"}
            </p>
          )}
        </section>

        {data.regionCounts.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 pb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {cfg.variant === "junior" ? "Junior parkrun" : "parkrun"} by region
            </h2>
            <div className="mt-6 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {REGIONS.map((region) => {
                const c =
                  data.regionCounts.find((rc) => rc.regionSlug === region.slug)
                    ?.count ?? 0;
                if (c === 0) return null;
                const href = `/parkrun-events/region/${region.slug}`;
                return (
                  <a
                    key={region.slug}
                    href={href}
                    className="group flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-card hover:border-primary hover:shadow-card-hover transition-all"
                  >
                    <span>
                      {region.name}
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        ({c})
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </a>
                );
              })}
            </div>
          </section>
        )}

        <section className="mx-auto max-w-6xl px-4 pb-10">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            All locations A–Z
          </h2>
          <div className="space-y-6">
            {grouped.map(([letter, items]) => (
              <div key={letter}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                  {letter}
                </h3>
                <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((l) => (
                    <li key={l.id}>
                      <a
                        href={`/parkrun-events/${l.slug}`}
                        className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-primary hover:underline"
                      >
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        {l.name}
                        {l.regionSlug && (
                          <span className="text-xs text-muted-foreground">
                            · {REGION_BY_SLUG[l.regionSlug]?.name}
                          </span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 pb-16">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Frequently asked questions
          </h2>
          <div className="mt-4">
            <Accordion type="single" collapsible className="w-full">
              {cfg.faqs.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-base font-medium">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                    {f.a}
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

export function buildParkrunHead(
  cfg: ParkrunHubConfig,
  data: ParkrunListData | undefined,
  canonicalPath: string,
  siteUrl: string,
  metaTitle: string,
  metaDescription: string,
) {
  const canonical = `${siteUrl}${canonicalPath}`;
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: cfg.h1,
    description: metaDescription,
    url: canonical,
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
  return {
    meta: [
      { title: metaTitle },
      { name: "description", content: metaDescription },
      { property: "og:title", content: metaTitle },
      { property: "og:description", content: metaDescription },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonical },
    ],
    links: [{ rel: "canonical", href: canonical }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(collectionLd) },
      { type: "application/ld+json", children: JSON.stringify(faqLd) },
    ],
  };
}
