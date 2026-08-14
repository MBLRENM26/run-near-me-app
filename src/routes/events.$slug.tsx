import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { Calendar, MapPin, Tag, ExternalLink, Mountain } from "lucide-react";
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
import { RaceReminderSignup } from "@/components/events/RaceReminderSignup";
import { TrustProfileStrip } from "@/components/events/TrustProfileStrip";
import { CourseIntelligence } from "@/components/events/CourseIntelligence";
import { getEventPageData } from "@/lib/events.functions";
import { setEventResponseHeaders } from "@/lib/event-response-headers";

import {
  buildAboutParagraph,
  distancePlural,
  formatListingAdded,
  listingPublishedISO,
} from "@/lib/event-description";
import { eventPageFaqs } from "@/lib/site-faqs";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DISTANCE_PAGES } from "@/lib/distance-filters";
import {
  formatEventDate,
  eventYear,
  isoDate,
  shortEventDate,
  eventProximity,
} from "@/lib/date";
import { REGIONS } from "@/lib/regions";
import { SITE_URL } from "@/lib/site";
import { fromSearchValidator } from "@/lib/from-search";
import { BackToSearchBar } from "@/components/site/BackToSearchBar";
import {
  monthLinkForEvent,
  distanceMonthLinkForEvent,
  terrainHubFor,
} from "@/lib/event-internal-links";
import { buildEventCtas } from "@/lib/event-ctas";


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

// Humanise terrain_tags into a display label. Falls back to `discipline` text
// when no structured tags are present (older rows). Rendered independently
// from the distance line so adding a distance never displaces terrain.
const TERRAIN_LABELS: Record<string, string> = {
  road: "Road",
  trail: "Trail",
  "multi-terrain": "Multi-terrain",
  fell: "Fell",
  "cross-country": "Cross-country",
  obstacle: "Obstacle",
  track: "Track",
  parkrun: "parkrun",
  "night-trail": "Night trail",
};
function formatTerrain(
  tags: string[] | null | undefined,
  discipline: string | null | undefined,
): string | null {
  const labelled = (tags ?? [])
    .map((t) => TERRAIN_LABELS[t] ?? null)
    .filter((v): v is string => !!v);
  if (labelled.length > 0) return labelled.join(" / ");
  const d = discipline?.trim();
  return d && d.length > 0 ? d : null;
}

import { classifyEventLink, isTrustedLink } from "@/lib/link-trust";
import { trackOutboundClick, trackClaimInterest } from "@/lib/analytics";
import { classifyDestinationRole } from "@/lib/destination-role";

function hostnameOf(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

export const Route = createFileRoute("/events/$slug")({
  validateSearch: fromSearchValidator,
  beforeLoad: ({ params }) => {
    // Guard against malformed slugs (e.g. literal "$slug" from stale crawls)
    // so they return a clean 404 instead of falling through to a 5xx.
    if (!/^[a-z0-9-]+$/.test(params.slug)) throw notFound();
  },
  loader: async ({ params }) => {
    const data = await getEventPageData({ data: { slug: params.slug } });
    // SSR-only header side effects for 410 tombstones and noindex flags.
    // See src/lib/event-response-headers.ts — createServerOnlyFn keeps the
    // server-only import out of the client bundle.
    if (import.meta.env.SSR) {
      setEventResponseHeaders({
        gone: !!data.gone,
        noindex: !data.gone && !!(data.indexability && !data.indexability.indexable),
      });
    }


    return data;
  },

  head: ({ params, loaderData }) => {
    const canonical = `${SITE_URL}/events/${params.slug}`;
    if (loaderData?.gone) {
      return {
        meta: [
          { title: "This event has already taken place — Running Events Near Me" },
          { name: "robots", content: "noindex, follow" },
        ],
        links: [{ rel: "canonical", href: canonical }],
      };
    }
    const e = loaderData?.event;
    if (!e) {
      return {
        meta: [{ title: "Event not found — Running Events Near Me" }],
        links: [{ rel: "canonical", href: canonical }],
      };
    }

    const year = eventYear(e);
    const loc = locationLabel(e.town, e.county);
    const place = e.town || e.county || "";

    // Title: "{Name} {Year} — {Distance}, {Town}, {Day Month} | Entry & Info"
    // Front-loads name + distance + location + date for CTR; any unknown
    // segment is dropped rather than fudged.
    const shortDate = shortEventDate(e);
    const distLabel = (e.distances?.trim() || e.discipline?.trim() || "").trim();
    const distForTitle =
      distLabel && distLabel.toLowerCase() !== "running" ? distLabel : "";
    const mid = [distForTitle || null, place || null, shortDate || null]
      .filter(Boolean)
      .join(", ");
    // Keep under ~60 chars for SERP display: drop mid-segments first, then year.
    const nameYear = [e.name, year].filter(Boolean).join(" ");
    let titleSpec = mid ? `${nameYear} — ${mid}` : nameYear;
    if (titleSpec.length > 60) {
      const shorter = shortDate
        ? `${nameYear}${shortDate ? ` — ${shortDate}` : ""}`
        : nameYear;
      titleSpec = shorter.length <= 60 ? shorter : (e.name ?? nameYear).slice(0, 60);
    }

    const dateLabel = formatEventDate(e);
    const distance = distLabel || "running";


    const headProximity = eventProximity(e);
    const headIsPast = headProximity === "past";

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
    const description = headIsPast
      ? [
          `Took place${dateLabel ? ` on ${dateLabel}` : ""}.`,
          `${e.name} was a ${distance} race${loc ? ` in ${loc}` : ""}.`,
          hasOfficialLink
            ? "Visit the organiser website for results or future dates."
            : "See more upcoming races nearby.",
        ]
          .filter(Boolean)
          .join(" ")
          .slice(0, 300)
      : [
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

    // Indexability gate: when the event is a series-instance duplicate,
    // an orphan, slug-suffix duplicate, or past, we noindex the page and
    // skip Event JSON-LD entirely (stale `startDate` + thin/duplicate
    // content is the canonical soft-404 signal Google was hitting).
    const indexable = loaderData?.indexability?.indexable ?? true;

    let jsonLd: Record<string, unknown> | null = null;
    if (startISO && indexable) {
      jsonLd = {
        "@context": "https://schema.org",
        "@type": "Event",
        name: e.name,
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        url: canonical,
        startDate: startISO,
        // Google Event rich-result requires `image`. We don't have per-event
        // photography, so fall back to the sitewide OG image — permitted.
        image: [`${SITE_URL}/og-image.png`],
      };
      if (endISO) jsonLd.endDate = endISO;
      if (description) jsonLd.description = description;
      // datePublished reflects when our LISTING was created — honest.
      // We deliberately do NOT emit dateModified: there is no updated_at
      // or last_checked_at field in the schema, so claiming the underlying
      // event facts were re-verified would be a misleading freshness signal.
      const publishedISO = listingPublishedISO(e.norm_created_at, e.created_at);
      if (publishedISO) jsonLd.datePublished = publishedISO;
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
      // Offers: entry link only — no price claim, only event-specific pages
      // on trusted (non-aggregator) hosts, and never for imminent/past
      // events where "InStock" availability would overpromise.
      if (headEntryLink.kind === "entry" && eventProximity(e) === null) {
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

    // No FAQPage JSON-LD on event pages — the trust module below is
    // site-level content (about Running Events Near Me as a site), not
    // event-specific FAQ content. The /about page emits FAQPage schema
    // where it semantically belongs.

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
        ...(indexable
          ? []
          : [{ name: "robots", content: "noindex, follow" }]),
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
  const loaderData: import("@/lib/events.functions").EventPageResult =
    Route.useLoaderData();

  if (loaderData.gone) {
    return <EventGoneTombstone />;
  }

  const {
    event: e,
    related,
    sameTown,
    sameWeekendNearby,
    matchingClub,
    otherRacesByOrganiser,
    courseProfile,
  } = loaderData;

  // Site-wide link-trust policy: aggregator URLs are never rendered as
  // links, homepages are "Visit organiser website", and only event-specific
  // pages earn "Enter now".
  const entryLink = classifyEventLink(e.entry_url);
  const orgLink = classifyEventLink(e.organiser_url);

  const dateLabel = formatEventDate(e);
  const loc = locationLabel(e.town, e.county);
  const distance = e.distances?.trim() || null;
  const terrainLabel = formatTerrain(e.terrain_tags, e.discipline);
  const regionSlug = regionSlugFromName(e.region);

  // Imminent (within 7 days) or past events don't promise open entries.
  const proximity = eventProximity(e);
  const isPast = proximity === "past";

  // Contextual internal links to Sprint B hub pages.
  const monthLink = monthLinkForEvent(e, { isPast });
  const distanceMonthLink = distanceMonthLinkForEvent(
    e,
    related.distanceKey,
    { isPast },
  );
  // Build linked terrain segments matching the visible terrainLabel order.
  const terrainSegments: Array<{ key: string; label: string; hub: ReturnType<typeof terrainHubFor> }> =
    (e.terrain_tags ?? [])
      .map((tag) => {
        const hub = terrainHubFor(tag);
        // Reuse the same visible labels as formatTerrain.
        const label =
          tag === "road" ? "Road" :
          tag === "trail" ? "Trail" :
          tag === "multi-terrain" ? "Multi-terrain" :
          tag === "fell" ? "Fell" :
          tag === "cross-country" ? "Cross-country" :
          tag === "obstacle" ? "Obstacle" :
          tag === "track" ? "Track" :
          tag === "parkrun" ? "parkrun" :
          tag === "night-trail" ? "Night trail" :
          "";
        return label ? { key: tag, label, hub } : null;
      })
      .filter((s): s is { key: string; label: string; hub: ReturnType<typeof terrainHubFor> } => s !== null);

  // Past events: no entry CTA at all — the race is done. Keep organiser
  // links accessible inline (see pastOrganiserLink below) but stop
  // promising "Enter now" / "View event details".
  const proximityForCta =
    proximity === "today" || proximity === "imminent" ? proximity : null;
  const ctas = buildEventCtas(e, { isPast, proximity: proximityForCta });
  const primaryCta = ctas?.primary ?? null;
  const secondaryCta = ctas?.secondary ?? null;
  const usefulLinks = ctas?.usefulLinks ?? [];

  const proximityNote =
    proximity === "today"
      ? "Race day is today — check the linked event page for availability."
      : proximity === "imminent"
        ? "Race day is near — entries may have closed. Check the linked event page for availability."
        : null;

  // Past events still link to the organiser inline (read-only) when one exists.
  const pastOrganiserLink = isPast
    ? entryLink.kind === "organiser-site"
      ? entryLink
      : isTrustedLink(orgLink)
        ? orgLink
        : null
    : null;

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
  const showClaim = !primaryCta && !isPast;

  // "About this listing" — site-level trust Q&A, NOT event-specific FAQs.
  // 3 fixed Qs; a 4th appears only when the listing has no trusted entry
  // OR organiser link (missing URLs and untrusted/aggregator URLs both
  // count as absent — only `entry` or `organiser-site` classify as trusted).
  const hasAnyTrustedLink =
    entryLink.kind === "entry" ||
    entryLink.kind === "organiser-site" ||
    orgLink.kind === "entry" ||
    orgLink.kind === "organiser-site";
  const aboutListingFaqs = eventPageFaqs(!hasAnyTrustedLink);


  // "Other races in {Town}" — internal linking only when there are enough
  // genuine siblings to be useful.
  const showSameTown = sameTown.length >= 3 && !!e.town?.trim();

  // Honest listing-added line — never labelled "Last updated" because the
  // events table has no updated_at/last_checked_at column to back that.
  const listingAdded = formatListingAdded(e.norm_created_at, e.created_at);

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
          <BackToSearchBar />
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
              <div className="flex flex-wrap items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0" />
                <span>
                  {monthLink ? (
                    <Link
                      to="/running-events/$slug"
                      params={{ slug: monthLink.slug }}
                      className="text-foreground underline-offset-2 hover:text-primary hover:underline"
                    >
                      {dateLabel}
                    </Link>
                  ) : (
                    dateLabel
                  )}
                  {distanceMonthLink && (
                    <>
                      {" · "}
                      <Link
                        to={distanceMonthLink.to}
                        params={distanceMonthLink.params}
                        className="text-foreground underline-offset-2 hover:text-primary hover:underline"
                      >
                        {distanceMonthLink.label}
                      </Link>
                    </>
                  )}
                </span>
                {isPast && (
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    Took place
                  </span>
                )}
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
            {terrainSegments.length > 0 ? (
              <div className="flex items-center gap-2">
                <Mountain className="h-4 w-4 shrink-0" />
                <span>
                  {terrainSegments.map((seg, i) => (
                    <span key={seg.key}>
                      {i > 0 && " / "}
                      {seg.hub ? (
                        <Link
                          to={seg.hub.to}
                          className="text-foreground underline-offset-2 hover:text-primary hover:underline"
                        >
                          {seg.label}
                        </Link>
                      ) : (
                        seg.label
                      )}
                    </span>
                  ))}
                </span>
              </div>
            ) : terrainLabel ? (
              <div className="flex items-center gap-2">
                <Mountain className="h-4 w-4 shrink-0" />
                <span>{terrainLabel}</span>
              </div>
            ) : null}
          </div>

          <TrustProfileStrip
            governance={e.governance}
            organiser_type={e.organiser_type}
            race_profile={e.race_profile}
          />

          {/* Organiser identity is a supported fact and must render even when
              there is no trusted outbound CTA (aggregator-only entry_url,
              missing organiser_url). No external link is invented here. */}
          {!primaryCta && (
            <OrganiserLine
              organiser={e.organiser}
              matchingClub={matchingClub}
              className="mt-6"
            />
          )}

          {primaryCta && (

            <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
              <Button
                asChild
                size="lg"
                className="h-12 w-full px-6 text-base font-semibold shadow-card sm:h-14 sm:w-auto sm:px-8 sm:text-lg"
              >
                <a
                  href={primaryCta.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackOutboundClick({
                      slug: e.slug,
                      region: e.region,
                      link_type: primaryCta!.linkType,
                      proximity,
                      event_name: e.name,
                      distance: e.distances ?? "unknown",
                      discipline: e.discipline ?? "road",
                      entry_domain: hostnameOf(primaryCta!.href),
                      destination_role: classifyDestinationRole(
                        primaryCta!.href,
                        primaryCta!.label,
                      ),
                    })
                  }
                >
                  {primaryCta.label}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <OrganiserLine
                organiser={e.organiser}
                matchingClub={matchingClub}
                className="mt-3"
              />

              {secondaryCta && (
                <p className="mt-2 text-sm">
                  <a
                    href={secondaryCta.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      trackOutboundClick({
                        slug: e.slug,
                        region: e.region,
                        link_type: secondaryCta.linkType,
                        proximity,
                        event_name: e.name,
                        distance: e.distances ?? "unknown",
                        discipline: e.discipline ?? "road",
                        entry_domain: hostnameOf(secondaryCta.href),
                        destination_role: classifyDestinationRole(
                          secondaryCta.href,
                          secondaryCta.label,
                        ),
                      })
                    }
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
                  >
                    <span>{secondaryCta.label}: {secondaryCta.host}</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </p>
              )}
              {proximityNote && (
                <p className="mt-3 text-sm text-muted-foreground">
                  {proximityNote}
                </p>
              )}
            </div>
          )}

          <div className="mt-2 text-xs text-muted-foreground">
            {listingAdded ? `Listed ${listingAdded}` : "Listed recently"}
          </div>

          {usefulLinks.length >= 1 && (
            <div className="mt-4 rounded-xl border border-border bg-card p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground mb-2.5">
                Useful links
              </h3>
              <ul className="space-y-2">
                {usefulLinks.map((ul) => (
                  <li key={ul.href}>
                    <a
                      href={ul.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        trackOutboundClick({
                          slug: e.slug,
                          region: e.region,
                          link_type: ul.linkType,
                          proximity,
                          event_name: e.name,
                          distance: e.distances ?? "unknown",
                          discipline: e.discipline ?? "road",
                          entry_domain: hostnameOf(ul.href),
                          destination_role: classifyDestinationRole(
                            ul.href,
                            ul.label,
                          ),
                        })
                      }
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <span>{ul.label} ({ul.host})</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isPast && (
            <div className="mt-8 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              <p>This event has taken place.</p>
              {pastOrganiserLink?.href && (
                <p className="mt-1">
                  <a
                    href={pastOrganiserLink.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      trackOutboundClick({
                        slug: e.slug,
                        region: e.region,
                        link_type: "organiser-site",
                        proximity: "past",
                        event_name: e.name,
                        distance: e.distances ?? "unknown",
                        discipline: e.discipline ?? "road",
                        entry_domain: hostnameOf(pastOrganiserLink!.href),
                        destination_role: classifyDestinationRole(
                          pastOrganiserLink!.href,
                        ),
                      })
                    }
                    className="font-medium text-primary hover:underline"
                  >
                    Visit organiser website
                  </a>{" "}
                  for results or future dates.
                </p>
              )}
            </div>
          )}


          {about && (
            <div className="mt-10">
              <h2 className="text-xl font-semibold text-foreground">
                About this race
              </h2>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                {about.intro}
                {about.count && (
                  <>
                    {" "}
                    {about.count.before}
                    {regionSlug && comboSlug ? (
                      <Link
                        to="/running-events/$slug/$distance"
                        params={{ slug: regionSlug, distance: comboSlug }}
                        className="font-medium text-primary hover:underline"
                      >
                        {about.count.linkText}
                      </Link>
                    ) : regionSlug ? (
                      <Link
                        to="/running-events/$slug"
                        params={{ slug: regionSlug }}
                        className="font-medium text-primary hover:underline"
                      >
                        {about.count.linkText}
                      </Link>
                    ) : (
                      about.count.linkText
                    )}
                    {about.count.after}
                  </>
                )}
              </p>
            </div>
          )}

          {courseProfile && <CourseIntelligence course={courseProfile} />}


          <div className="mt-8">
            <RaceReminderSignup
              eventId={e.id}
              eventName={e.name}
              sortDate={e.sort_date ?? null}
            />
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            Spotted an error with this listing?{" "}
            <Link
              to="/events/$slug/report"
              params={{ slug: e.slug }}
              className="font-medium text-primary hover:underline"
            >
              Let us know
            </Link>
            .
          </p>

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
                    onClick={() =>
                      trackClaimInterest({ slug: e.slug, region: e.region })
                    }
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
                  const rMiles =
                    typeof r.distance_miles === "number"
                      ? `${r.distance_miles.toFixed(1)} miles away`
                      : null;
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
                          {[rDate, rLoc, rMiles].filter(Boolean).join(" · ")}
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

          {showSameTown && (
            <div className="mt-12">
              <h2 className="text-xl font-semibold text-foreground">
                Other races in {e.town!.trim()}
              </h2>
              <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
                {sameTown.map((r) => {
                  const rDate = formatEventDate(r);
                  const rLoc = r.county;
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
            </div>
          )}

          {sameWeekendNearby.length >= 3 && (e.county || e.region) && (() => {
            const hasRegionFill = sameWeekendNearby.some((r) => r.scope === "region");
            const allCounty = !hasRegionFill && !!e.county;
            const heading = allCounty
              ? `Same weekend nearby in ${e.county}`
              : e.region
                ? `Same weekend nearby in ${e.region}`
                : "Same weekend nearby";
            return (
              <div className="mt-12">
                <h2 className="text-xl font-semibold text-foreground">
                  {heading}
                </h2>
                <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
                  {sameWeekendNearby.map((r) => {
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
              </div>
            );
          })()}

          {otherRacesByOrganiser.length >= 2 && matchingClub && e.organiser && (
            <div className="mt-12">
              <h2 className="text-xl font-semibold text-foreground">
                Other races by {matchingClub.name}
              </h2>
              <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
                {otherRacesByOrganiser.map((r) => {
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
            </div>
          )}

          <section className="mt-12">
            <h2 className="text-xl font-semibold text-foreground">
              About this listing
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              How Running Events Near Me works.
            </p>
            <Accordion type="single" collapsible className="mt-3">
              {aboutListingFaqs.map((f) => (
                <AccordionItem key={f.id} value={f.id}>
                  <AccordionTrigger className="text-base text-foreground text-left">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <p className="mt-4 text-sm">
              <Link
                to="/about"
                className="font-medium text-primary hover:underline"
              >
                See all FAQs →
              </Link>
            </p>
          </section>


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

function EventGoneTombstone() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md text-center py-20">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
            This event has already taken place
          </h1>
          <p className="mt-3 text-muted-foreground">
            The race has finished and this listing is no longer active. Browse
            upcoming events, or find similar races by distance or region.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/search"
              search={{ q: "" }}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Search upcoming events
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Browse by region
            </Link>
          </div>
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
