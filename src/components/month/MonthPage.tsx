import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { BackToSearchBar } from "@/components/site/BackToSearchBar";
import { EventCard, type EventCardData } from "@/components/events/EventCard";
import { featuredFirst } from "@/lib/featured";
import type { MonthPageData } from "@/lib/month-page.functions";
import { formatMonthYearLong } from "@/lib/month-slug";
import { SITE_URL } from "@/lib/site";
import { DISTANCE_PAGES, type DistanceKey } from "@/lib/distance-filters";
import { isIndexableMonth, weekendSaturday } from "@/lib/month-summary";
import { monthKeyToSlug } from "@/lib/month-slug";

const SIBLINGS: { key: DistanceKey | "all"; label: string }[] = [
  { key: "all", label: "All races" },
  { key: "5k", label: "5K" },
  { key: "10k", label: "10K" },
  { key: "half-marathon", label: "Half marathon" },
  { key: "marathon", label: "Marathon" },
  { key: "ultra", label: "Ultra" },
];

function monthHref(key: DistanceKey | "all", monthKey: string): string | null {
  const slug = monthKeyToSlug(monthKey);
  if (key === "all") return `/running-events/${slug}`;
  if (key === "trail") return null;
  return `/${DISTANCE_PAGES[key].slug}/${slug}`;
}

function shortDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", timeZone: "UTC",
  });
}

function groupLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const sun = new Date(d); sun.setUTCDate(d.getUTCDate() + 1);
  const f = (x: Date, o: Intl.DateTimeFormatOptions) => x.toLocaleDateString("en-GB", { ...o, timeZone: "UTC" });
  return `Weekend of ${f(d, { day: "numeric" })}–${f(sun, { day: "numeric", month: "long" })}`;
}

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
            UK {noun} in {monthLabel}
            {data.summary && total > 0 && (
              <>
                {" · "}
                {data.summary.confirmed} date{data.summary.confirmed === 1 ? "" : "s"} confirmed
                {data.summary.estimated > 0 && (
                  <> · {data.summary.estimated} still to be confirmed</>
                )}
              </>
            )}
          </p>
          {data.lastCheckedAt && (
            <p className="mt-1 text-xs text-muted-foreground">
              Listings last checked{" "}
              {new Date(data.lastCheckedAt).toLocaleDateString("en-GB", {
                day: "numeric", month: "short", year: "numeric",
              })}
            </p>
          )}
          {distanceCfg && (
            <p className="mt-2 text-sm">
              <Link to={`/${distanceCfg.slug}` as "/5k-races"} className="text-primary hover:underline">
                ← All {distanceCfg.shortName} races
              </Link>
            </p>
          )}
        </section>

        <MonthBody data={data} distanceKey={distanceKey} noun={noun} monthLabel={monthLabel} />
      </main>
      <Footer />
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:border-primary"
      }`}
    >
      {children}
    </button>
  );
}

function MonthBody({
  data, distanceKey, noun, monthLabel,
}: { data: MonthPageData; distanceKey?: DistanceKey; noun: string; monthLabel: string }) {
  const { events, summary, monthKey } = data;
  const [region, setRegion] = useState<string | null>(null);
  const [terrain, setTerrain] = useState<string | null>(null);
  const courseIds = useMemo(() => new Set(data.courseMapIds ?? []), [data.courseMapIds]);

  const shown = useMemo(() => {
    return featuredFirst(events).filter((e) => {
      if (region && e.region !== region) return false;
      if (terrain) {
        const tags = (e as { terrain_tags?: string[] | null }).terrain_tags;
        if (!tags || !tags.some((t) => t.replace("-", " ").toLowerCase() === terrain.toLowerCase().replace("-", " "))) return false;
      }
      return true;
    });
  }, [events, region, terrain]);

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: typeof shown }>();
    const order: string[] = [];
    for (const e of shown) {
      let key: string; let label: string;
      if (e.date_is_estimated || !e.sort_date) { key = "zz-tbc"; label = "Date to be confirmed"; }
      else {
        const sat = weekendSaturday(e.sort_date);
        if (sat) { key = sat; label = groupLabel(sat); }
        else { key = e.sort_date; label = new Date(`${e.sort_date}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }); }
      }
      if (!map.has(key)) { map.set(key, { label, items: [] }); order.push(key); }
      map.get(key)!.items.push(e);
    }
    return order.sort().map((k) => map.get(k)!);
  }, [shown]);

  const prev = data.neighbours?.prev;
  const next = data.neighbours?.next;
  const pageKey: DistanceKey | "all" = distanceKey ?? "all";

  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 space-y-8">
      {summary && summary.total > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
          {summary.weekends.some((w) => w.saturdayCount + w.sundayCount > 0) && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-2">Races by weekend</h2>
              <div className="flex flex-wrap gap-2">
                {summary.weekends.map((w) => (
                  <div key={w.saturday} className="flex overflow-hidden rounded-lg border border-border text-sm">
                    {[{ d: w.saturday, c: w.saturdayCount }, { d: w.sunday, c: w.sundayCount }].map((x) => (
                      <div key={x.d} className={`px-3 py-1.5 text-center ${x.c > 0 ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}>
                        <div className="text-xs">{shortDay(x.d)}</div>
                        <div className="font-semibold">{x.c}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
          {summary.byRegion.length > 1 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-2">By region</h2>
              <div className="flex flex-wrap gap-2">
                <Chip active={!region} onClick={() => setRegion(null)}>All</Chip>
                {summary.byRegion.map((r) => (
                  <Chip key={r.label} active={region === r.label} onClick={() => setRegion(region === r.label ? null : r.label)}>
                    {r.label} {r.count}
                  </Chip>
                ))}
              </div>
            </div>
          )}
          {summary.byTerrain.length > 1 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-2">Type</h2>
              <div className="flex flex-wrap gap-2">
                <Chip active={!terrain} onClick={() => setTerrain(null)}>All</Chip>
                {summary.byTerrain.map((t) => (
                  <Chip key={t.label} active={terrain === t.label} onClick={() => setTerrain(terrain === t.label ? null : t.label)}>
                    {t.label} {t.count}
                  </Chip>
                ))}
              </div>
            </div>
          )}
          {summary.courseMapCount > 0 && (
            <p className="text-sm text-muted-foreground">
              {summary.courseMapCount} of {summary.total} have a course map on their race page.
            </p>
          )}
        </div>
      )}

      {events.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-muted/30">
          <p className="text-lg font-medium text-foreground">No {noun} listed for {monthLabel} yet</p>
          <p className="mt-2 text-sm text-muted-foreground">We add new races every week — check back soon.</p>
        </div>
      ) : shown.length === 0 ? (
        <p className="text-muted-foreground">No races match these filters.</p>
      ) : (
        groups.map((g) => (
          <div key={g.label}>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              {g.label} <span className="text-muted-foreground font-normal">· {g.items.length} race{g.items.length === 1 ? "" : "s"}</span>
            </h2>
            <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((e) => (
                <div key={e.id} className="space-y-1">
                  <EventCard event={toCard(e)} />
                  {courseIds.has(e.id) && (
                    <p className="px-1 text-xs text-muted-foreground">Course map on race page</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {data.siblingCounts && (
        <nav aria-label="Related months and distances" className="border-t border-border pt-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-2">Also in {monthLabel}</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {SIBLINGS.filter((s) => s.key !== pageKey).map((s) => {
                const href = monthHref(s.key, monthKey);
                const c = data.siblingCounts[s.key] ?? 0;
                if (!href || c === 0) return null;
                return (
                  <Link key={s.key} to={href as "/"} className="text-primary hover:underline">
                    {s.label} ({c})
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex justify-between text-sm">
            {prev && prev.total > 0 && monthHref(pageKey, prev.monthKey) ? (
              <Link to={monthHref(pageKey, prev.monthKey) as "/"} className="text-primary hover:underline">
                ← {formatMonthYearLong(prev.monthKey)} ({prev.total})
              </Link>
            ) : <span />}
            {next && next.total > 0 && monthHref(pageKey, next.monthKey) ? (
              <Link to={monthHref(pageKey, next.monthKey) as "/"} className="text-primary hover:underline">
                {formatMonthYearLong(next.monthKey)} ({next.total}) →
              </Link>
            ) : <span />}
          </div>
        </nav>
      )}
    </section>
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
      { name: "twitter:card", content: "summary" },
      ...(isIndexableMonth(total) ? [] : [{ name: "robots", content: "noindex, follow" }]),
    ],
    links: [{ rel: "canonical", href: canonical }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(itemList) },
      { type: "application/ld+json", children: JSON.stringify(breadcrumb) },
    ],
  };
}
