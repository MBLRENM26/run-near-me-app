import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Calendar, MapPin, Tag, Ticket, ExternalLink, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getEventBySlug } from "@/lib/events.functions";
import { formatEventDate, eventYear, isoDate, shortEventDate } from "@/lib/date";
import { REGIONS } from "@/lib/regions";
import { SITE_URL } from "@/lib/site";

const NON_FEE = new Set(["", "free", "tbc", "0", "n/a", "na"]);

function regionSlugFromName(name: string | null | undefined): string | null {
  if (!name) return null;
  return REGIONS.find((r) => r.name === name)?.slug ?? null;
}

export const Route = createFileRoute("/events/$slug")({
  loader: ({ params }) => getEventBySlug({ data: { slug: params.slug } }),
  head: ({ params, loaderData }) => {
    const e = loaderData;
    const canonical = `${SITE_URL}/events/${params.slug}`;
    if (!e) {
      return {
        meta: [{ title: "Event not found — Running Events Near Me" }],
        links: [{ rel: "canonical", href: canonical }],
      };
    }

    const year = eventYear(e);
    const loc = [e.town, e.county].filter(Boolean).join(", ");
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

    // Fee clause: "Entry £18." / "Free entry." / omitted when blank or TBC.
    const feeRaw = e.entry_fee?.trim() ?? "";
    const feeKey = feeRaw.toLowerCase();
    let feeClause = "";
    if (feeRaw && !NON_FEE.has(feeKey)) feeClause = `Entry ${feeRaw}.`;
    else if (feeKey === "free" || feeKey === "0") feeClause = "Free entry.";

    const when = e.date_is_estimated
      ? dateLabel
        ? `, expected ${dateLabel.replace(" (date TBC)", "")} — date to be confirmed`
        : ""
      : dateLabel
        ? ` on ${dateLabel}`
        : "";
    const description = [
      `${e.name} is a ${distance} race${loc ? ` in ${loc}` : ""}${when}.`,
      feeClause || null,
      "See route details, start time and enter online.",
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
      // Offers: entry link, plus a parsed numeric price when available.
      const entryUrl = e.entry_url?.trim();
      if (entryUrl) {
        const offer: Record<string, unknown> = {
          "@type": "Offer",
          url: entryUrl,
          availability: "https://schema.org/InStock",
        };
        const priceMatch =
          feeRaw && !NON_FEE.has(feeKey)
            ? feeRaw.match(/(\d+(?:\.\d{1,2})?)/)
            : null;
        if (priceMatch) {
          offer.price = priceMatch[1];
          offer.priceCurrency = "GBP";
        } else if (feeKey === "free" || feeKey === "0") {
          offer.price = "0";
          offer.priceCurrency = "GBP";
        }
        jsonLd.offers = offer;
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
      scripts: jsonLd
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify(jsonLd),
            },
          ]
        : [],
    };
  },
  component: EventDetailPage,
  notFoundComponent: EventNotFound,
  errorComponent: EventError,
});

function EventDetailPage() {
  const e = Route.useLoaderData();

  const entryUrl = e.entry_url?.trim() || null;
  const organiserUrl = e.organiser_url?.trim() || null;
  const sourceUrl = e.source_url?.trim() || null;
  const dateLabel = formatEventDate(e);
  const loc = [e.town, e.county].filter(Boolean).join(", ");
  const fee = e.entry_fee?.trim();
  const showFee = fee && !NON_FEE.has(fee.toLowerCase());
  const distance = e.distances?.trim() || e.discipline?.trim();
  const regionSlug = regionSlugFromName(e.region);

  // Per spec: Claim block triggers when both entry_url AND organiser_url are empty.
  const showClaim = !entryUrl && !organiserUrl;

  let primaryCta: { href: string; label: string } | null = null;
  if (entryUrl) primaryCta = { href: entryUrl, label: "Enter now" };
  else if (organiserUrl) primaryCta = { href: organiserUrl, label: "Visit organiser" };

  let sourceHost: string | null = null;
  if (!primaryCta && sourceUrl) {
    try {
      sourceHost = new URL(sourceUrl).hostname.replace(/^www\./, "");
    } catch {
      sourceHost = null;
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 pt-10 pb-12">
          {regionSlug ? (
            <Link
              to="/running-events/$slug"
              params={{ slug: regionSlug }}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {e.region}
            </Link>
          ) : (
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to all events
            </Link>
          )}

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
            {showFee && (
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 shrink-0" />
                <span>{fee}</span>
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
                href={sourceUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                {sourceHost}
              </a>
            </p>
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
