import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Calendar, MapPin, Tag, ExternalLink, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getEventPageData } from "@/lib/events.functions";
import {
  buildAboutParagraph,
  distancePlural,
} from "@/lib/event-description";
import { DISTANCE_PAGES } from "@/lib/distance-filters";
import { formatEventDate, eventYear, isoDate, shortEventDate } from "@/lib/date";
import { REGIONS } from "@/lib/regions";
import { SITE_URL } from "@/lib/site";

function regionSlugFromName(name: string | null | undefined): string | null {
  if (!name) return null;
  return REGIONS.find((r) => r.name === name)?.slug ?? null;
}

/** "Town, County" with duplicates collapsed (e.g. Conwy, Conwy → Conwy). */
function locationLabel(town: string | null, county: string | null): string {
  if (town && county && town.trim().toLowerCase() === county.trim().toLowerCase()) {
    return town.trim();
  }
  return [town, county].filter(Boolean).join(", ");
}

/**
 * True when a scraped URL is an aggregator's *regional listing* page rather
 * than an event-specific page — e.g. https://runabc.co.uk/kent. These must
 * never be presented as the event's official website / entry link.
 */
function isGenericListingUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== "runabc.co.uk" && host !== "runabc.scot") return false;
    const segments = u.pathname.split("/").filter(Boolean);
    // Region listing pages are a single short slug with no digits
    // (e.g. /kent, /scotland). Real event pages have deeper or dated paths.
    if (segments.length === 0) return true;
    return segments.length === 1 && !/\d/.test(segments[0]);
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/events/$slug")({
  loader: ({ params }) => getEventPageData({ data: { slug: params.slug } }),
  head: ({ params, loaderData }) => {
    const e = loaderData?.event;
    const canonical = `${SITE_URL}/events/${params.slug}`;
    if (!e) {
      return {
        meta: [{ title: "Event not found — Running Events Near Me" }],
        links: [{ rel: "canonical", href: canonical }],
      };
    }

    const year = eventYear(e);
    const loc = locationLabel(e.town, e.county);
    const place = e.town || e.county || "";

    // Title: "{Name} {Year} — {Day Month}, {Town} | Entry & Info"
    // (month only for estimated dates; date/place segments drop out when unknown)
    const shortDate = shortEventDate(e);
    const mid = [shortDate || null, place || null].filter(Boolean).join(", ");
    const titleSpec =
      `${[e.name, year].filter(Boolean).join(" ")}` +
      (mid ? ` — ${mid}` : "") +
      ` | Entry & Info`;

    const dateLabel = formatEventDate(e);
    const distance = e.distances?.trim() || e.discipline?.trim() || "running";

    // No fee claims in the description — scraped single-value pricing goes
    // stale and misleads. Point readers at the official site instead.
    const when = e.date_is_estimated
      ? dateLabel
        ? `, expected ${dateLabel.replace(" (date TBC)", "")} — date to be confirmed`
        : ""
      : dateLabel
        ? ` on ${dateLabel}`
        : "";
    const description = [
      `${e.name} is a ${distance} race${loc ? ` in ${loc}` : ""}${when}.`,
      "See route details, start time and how to enter on the official site.",
    ]
      .filter(Boolean)
      .join(" ")
      .slice(0, 300);

    // Event JSON-LD: Google requires a full-precision startDate and a Place
    // location. Estimated (month-only) dates can't satisfy the date format,
    // so those events ship no JSON-LD rather than invalid markup.
    const startISO = e.date_is_estimated
      ? null
      : (isoDate(e.date_from) ?? isoDate(e.sort_date));
    const endISO = isoDate(e.date_to) ?? startISO;

    let jsonLd: Record<string, unknown> | null = null;
    if (startISO) {
      jsonLd = {
        "@context": "https://schema.org",
        "@type": "Event",
        name: e.name,
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        url: canonical,
        startDate: startISO,
      };
      if (endISO) jsonLd.endDate = endISO;
      if (description) jsonLd.description = description;
      const placeName = e.town || e.county || e.region || "United Kingdom";
      jsonLd.location = {
        "@type": "Place",
        name: placeName,
        address: {
          "@type": "PostalAddress",
          ...(e.town ? { addressLocality: e.town } : {}),
          ...(e.county || e.region
            ? { addressRegion: e.county || e.region }
            : {}),
          addressCountry: "GB",
        },
      };
      // Offers: entry link only — no price claim. Scraped fees are stale and
      // single-valued, so the structured data never asserts a price. Generic
      // aggregator listing URLs are never asserted as the entry link.
      const entryUrl = e.entry_url?.trim();
      if (entryUrl && !isGenericListingUrl(entryUrl)) {
        jsonLd.offers = {
          "@type": "Offer",
          url: entryUrl,
          availability: "https://schema.org/InStock",
        };
      }
      if (e.organiser_url?.trim()) {
        const orgUrl = e.organiser_url.trim();
        let orgName = e.organiser?.trim() || "";
        if (!orgName) {
          try {
            orgName = new URL(orgUrl).hostname.replace(/^www\./, "");
          } catch {
            orgName = "";
          }
        }
        jsonLd.organizer = {
          "@type": "Organization",
          ...(orgName ? { name: orgName } : {}),
          url: orgUrl,
        };
      }
    }

    // BreadcrumbList JSON-LD: Home → Region → Event.
    const regionSlug = regionSlugFromName(e.region);
    const crumbs: { name: string; item?: string }[] = [
      { name: "Home", item: SITE_URL },
    ];
    if (e.region && regionSlug) {
      crumbs.push({
        name: e.region,
        item: `${SITE_URL}/running-events/${regionSlug}`,
      });
    }
    crumbs.push({ name: e.name });
    const breadcrumbLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.name,
        ...(c.item ? { item: c.item } : {}),
      })),
    };

    const scripts = [
      ...(jsonLd
        ? [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }]
        : []),
      {
        type: "application/ld+json",
        children: JSON.stringify(breadcrumbLd),
      },
    ];

    return {
      meta: [
        { title: titleSpec },
        { name: "description", content: description },
        { property: "og:title", content: titleSpec },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: canonical },
      ],
      links: [{ rel: "canonical", href: canonical }],
      scripts,
    };
  },
  component: EventDetailPage,
  notFoundComponent: EventNotFound,
  errorComponent: EventError,
});

function EventDetailPage() {
  const { event: e, related }: import("@/lib/events.functions").EventPageData =
    Route.useLoaderData();

  const rawEntryUrl = e.entry_url?.trim() || null;
  const rawOrganiserUrl = e.organiser_url?.trim() || null;
  const sourceUrl = e.source_url?.trim() || null;

  // Scraped aggregator URLs that point at a regional listing page (e.g.
  // runabc.co.uk/kent) are not the event's official site — never present
  // them as the primary CTA. Demote to source attribution instead.
  const entryUrl = isGenericListingUrl(rawEntryUrl) ? null : rawEntryUrl;
  const organiserUrl = isGenericListingUrl(rawOrganiserUrl)
    ? null
    : rawOrganiserUrl;

  const dateLabel = formatEventDate(e);
  const loc = locationLabel(e.town, e.county);
  const distance = e.distances?.trim() || e.discipline?.trim();
  const regionSlug = regionSlugFromName(e.region);

  const about = buildAboutParagraph({
    slug: e.slug,
    name: e.name,
    town: e.town,
    county: e.county,
    region: e.region,
    date_from: e.date_from,
    date_to: e.date_to,
    sort_date: e.sort_date,
    date_raw: e.date_raw,
    date_is_estimated: e.date_is_estimated,
    distanceKey: related.distanceKey,
    hasOfficialLink: !!(entryUrl || organiserUrl),
    regionCount: related.totalCount,
  });

  // Per spec: Claim block triggers when both entry_url AND organiser_url are empty.
  const showClaim = !entryUrl && !organiserUrl;

  let primaryCta: { href: string; label: string } | null = null;
  if (entryUrl) primaryCta = { href: entryUrl, label: "Enter now" };
  else if (organiserUrl) primaryCta = { href: organiserUrl, label: "Visit organiser" };

  // Attribution link when there is no trustworthy primary CTA: prefer the
  // source URL, falling back to a demoted generic listing URL.
  const attributionUrl = sourceUrl || rawEntryUrl || rawOrganiserUrl;
  let sourceHost: string | null = null;
  if (!primaryCta && attributionUrl) {
    try {
      sourceHost = new URL(attributionUrl).hostname.replace(/^www\./, "");
    } catch {
      sourceHost = null;
    }
  }

  const relatedLabel = related.distanceKey
    ? distancePlural(related.distanceKey)
    : "running events";
  const comboSlug = related.distanceKey
    ? DISTANCE_PAGES[related.distanceKey].slug
    : null;
  const showCombo =
    !!regionSlug && !!comboSlug && related.totalCount >= 3;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 pt-10 pb-12">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {e.region && regionSlug && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link
                        to="/running-events/$slug"
                        params={{ slug: regionSlug }}
                      >
                        {e.region}
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </>
              )}
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="line-clamp-1">
                  {e.name}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <h1 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            {e.name}
          </h1>

          <div className="mt-5 space-y-2 text-base text-muted-foreground">
            {dateLabel && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0" />
                <span>{dateLabel}</span>
              </div>
            )}
            {loc && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{loc}</span>
              </div>
            )}
            {distance && (
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 shrink-0" />
                <span>{distance}</span>
              </div>
            )}
          </div>

          {primaryCta && (
            <div className="mt-8">
              <Button asChild size="lg">
                <a href={primaryCta.href} target="_blank" rel="noopener noreferrer">
                  {primaryCta.label}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              {sourceUrl && primaryCta.href !== sourceUrl && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Originally listed at{" "}
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground"
                  >
                    {(() => {
                      try { return new URL(sourceUrl).hostname.replace(/^www\./, ""); }
                      catch { return "source"; }
                    })()}
                  </a>
                </p>
              )}
            </div>
          )}

          {!primaryCta && sourceHost && (
            <p className="mt-6 text-sm text-muted-foreground inline-flex items-center gap-1.5">
              <Info className="h-4 w-4" />
              Listed on{" "}
              <a
                href={attributionUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                {sourceHost}
              </a>
            </p>
          )}

          {about && (
            <div className="mt-10">
              <h2 className="text-xl font-semibold text-foreground">
                About this race
              </h2>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                {about}
              </p>
            </div>
          )}

          {showClaim && (
            <div className="mt-10 rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-card">
              <h2 className="text-xl font-semibold text-foreground">
                Are you the organiser?
              </h2>
              <p className="mt-2 text-muted-foreground">
                Add your website and entry link to this listing — it's free and
                takes 2 minutes.
              </p>
              <div className="mt-5">
                <Button asChild>
                  <Link
                    to="/list-your-event"
                    search={{ claim: e.slug }}
                  >
                    Claim this listing
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {related.events.length > 0 && e.region && (
            <div className="mt-12">
              <h2 className="text-xl font-semibold text-foreground">
                More {relatedLabel} in {e.region}
              </h2>
              <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
                {related.events.map((r) => {
                  const rDate = formatEventDate(r);
                  const rLoc = r.town || r.county;
                  return (
                    <li key={r.id}>
                      <Link
                        to="/events/$slug"
                        params={{ slug: r.slug }}
                        className="flex flex-col gap-0.5 px-4 py-3 hover:bg-muted/50 transition-colors"
                      >
                        <span className="font-medium text-foreground">
                          {r.name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {[rDate, rLoc].filter(Boolean).join(" · ")}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 text-sm">
                {showCombo && regionSlug && comboSlug ? (
                  <Link
                    to="/running-events/$slug/$distance"
                    params={{ slug: regionSlug, distance: comboSlug }}
                    className="font-medium text-primary hover:underline"
                  >
                    View all {related.totalCount.toLocaleString()} {relatedLabel}{" "}
                    in {e.region} →
                  </Link>
                ) : regionSlug ? (
                  <Link
                    to="/running-events/$slug"
                    params={{ slug: regionSlug }}
                    className="font-medium text-primary hover:underline"
                  >
                    View all running events in {e.region} →
                  </Link>
                ) : null}
              </p>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

function EventNotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md text-center py-20">
          <h1 className="text-4xl font-bold text-foreground">Event not found</h1>
          <p className="mt-3 text-muted-foreground">
            We couldn't find that event. It may have been removed or the link is incorrect.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Browse all events
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function EventError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">
          Couldn't load this event
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
