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

import { classifyEventLink, isTrustedLink } from "@/lib/link-trust";

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
    // stale and misleads. Only promise "the official site" when we actually
    // have a trustworthy official link to show.
    const headEntryLink = classifyEventLink(e.entry_url);
    const headOrgLink = classifyEventLink(e.organiser_url);
    const hasOfficialLink =
      isTrustedLink(headEntryLink) || isTrustedLink(headOrgLink);
    const when = e.date_is_estimated
      ? dateLabel
        ? `, expected ${dateLabel.replace(" (date TBC)", "")} — date to be confirmed`
        : ""
      : dateLabel
        ? ` on ${dateLabel}`
        : "";
    const description = [
      `${e.name} is a ${distance} race${loc ? ` in ${loc}` : ""}${when}.`,
      hasOfficialLink
        ? "See route details, start time and how to enter on the official site."
        : "See date, location and distance details, plus more races nearby.",
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
      // Offers: entry link only — no price claim, and only event-specific
      // pages on trusted (non-aggregator) hosts are ever asserted.
      if (headEntryLink.kind === "entry") {
        jsonLd.offers = {
          "@type": "Offer",
          url: headEntryLink.href,
          availability: "https://schema.org/InStock",
        };
      }
      if (isTrustedLink(headOrgLink)) {
        const orgName = e.organiser?.trim() || headOrgLink.host || "";
        jsonLd.organizer = {
          "@type": "Organization",
          ...(orgName ? { name: orgName } : {}),
          url: headOrgLink.href,
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

  // Site-wide link-trust policy: aggregator URLs are never rendered as
  // links, homepages are "Visit organiser website", and only event-specific
  // pages earn "Enter now".
  const entryLink = classifyEventLink(e.entry_url);
  const orgLink = classifyEventLink(e.organiser_url);
  const srcLink = classifyEventLink(e.source_url);

  const dateLabel = formatEventDate(e);
  const loc = locationLabel(e.town, e.county);
  const distance = e.distances?.trim() || e.discipline?.trim();
  const regionSlug = regionSlugFromName(e.region);

  let primaryCta: { href: string; label: string } | null = null;
  if (entryLink.kind === "entry") {
    primaryCta = { href: entryLink.href!, label: "Enter now" };
  } else if (entryLink.kind === "organiser-site") {
    primaryCta = { href: entryLink.href!, label: "Visit organiser website" };
  } else if (isTrustedLink(orgLink)) {
    primaryCta = { href: orgLink.href!, label: "Visit organiser website" };
  }

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
    hasOfficialLink: !!primaryCta,
    regionCount: related.totalCount,
  });

  // No trustworthy official link → invite the organiser to claim the listing.
  const showClaim = !primaryCta;

  // Source attribution is plain text only — aggregator sites are named,
  // never linked.
  const sourceHost = srcLink.host ?? entryLink.host ?? orgLink.host;

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
