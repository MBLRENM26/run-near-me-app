import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, MapPin } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { getParkrunBySlug } from "@/lib/parkrun.functions";
import { ParkrunMapClient } from "@/components/parkrun/ParkrunMapClient";
import { SITE_URL } from "@/lib/site";
import { REGIONS } from "@/lib/regions";

const REGION_BY_SLUG = Object.fromEntries(REGIONS.map((r) => [r.slug, r]));

export const Route = createFileRoute("/parkrun-events/$slug")({
  loader: ({ params }) => getParkrunBySlug({ data: { slug: params.slug } }),
  head: ({ params, loaderData }) => {
    const canonical = `${SITE_URL}/parkrun-events/${params.slug}`;
    if (!loaderData) {
      return {
        meta: [{ title: "parkrun not found — Running Events Near Me" }],
        links: [{ rel: "canonical", href: canonical }],
      };
    }
    const p = loaderData;
    const isJunior = p.variant === "junior";
    const schedule = isJunior ? "Sunday 9:30am" : "Saturday 9:00am";
    const dist = p.distance ?? (isJunior ? "2K" : "5K");
    const town = p.town?.trim() || null;
    const county = p.county?.trim() || null;
    const regionName = p.regionSlug ? REGION_BY_SLUG[p.regionSlug]?.name ?? null : null;
    // Place segment: town when known, otherwise the coord-derived region.
    const place = town ?? regionName;

    // Title: "{Name} — Free Weekly {5K|2K}, {Place} | Course & Start Time"
    // (drop the place segment when unknown)
    const title =
      `${p.name} — Free Weekly ${dist}` +
      (place ? `, ${place}` : "") +
      ` | Course & Start Time`;

    const locText = [town, county].filter(Boolean).join(", ") || regionName || "";
    const description =
      `${p.name} is a free, weekly, timed ${dist}` +
      (locText ? ` in ${locText}` : "") +
      `, every ${schedule}. See the course map, nearby parkruns and how to register.`;

    const jsonLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Event",
      name: p.name,
      description,
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      isAccessibleForFree: true,
      url: canonical,
      eventSchedule: {
        "@type": "Schedule",
        repeatFrequency: "P1W",
        byDay: isJunior ? "https://schema.org/Sunday" : "https://schema.org/Saturday",
        startTime: isJunior ? "09:30" : "09:00",
      },
      offers: { "@type": "Offer", price: "0", priceCurrency: "GBP" },
    };
    if (p.lat != null || p.lng != null || town || county || regionName) {
      const location: Record<string, unknown> = {
        "@type": "Place",
        name: p.name,
      };
      if (p.lat != null && p.lng != null) {
        location.geo = { "@type": "GeoCoordinates", latitude: p.lat, longitude: p.lng };
      }
      if (town || county || regionName) {
        location.address = {
          "@type": "PostalAddress",
          ...(town ? { addressLocality: town } : {}),
          ...(county || regionName
            ? { addressRegion: county || regionName }
            : {}),
          addressCountry: "GB",
        };
      }
      jsonLd.location = location;
    }
    if (p.organiserUrl) {
      jsonLd.organizer = {
        "@type": "Organization",
        name: "parkrun",
        url: p.organiserUrl,
      };
    }

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
        { type: "application/ld+json", children: JSON.stringify(jsonLd) },
      ],
    };
  },
  component: ParkrunLocationPage,
  notFoundComponent: NotFoundPage,
  errorComponent: ErrorPage,
});

function ParkrunLocationPage() {
  const p: import("@/lib/parkrun.functions").ParkrunDetail = Route.useLoaderData();
  const isJunior = p.variant === "junior";
  const schedule = isJunior
    ? "Every Sunday at 9:30am"
    : "Every Saturday at 9:00am";
  const distanceLabel = p.distance ?? (isJunior ? "2K" : "5K");
  const regionName = p.regionSlug ? REGION_BY_SLUG[p.regionSlug]?.name : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 pt-10 pb-12">
          <Link
            to={isJunior ? "/junior-parkrun-events" : "/parkrun-events"}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {isJunior ? "junior parkrun" : "all parkruns"}
          </Link>

          <h1 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            {p.name}
          </h1>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              Free · Weekly · {distanceLabel}
            </span>
            {regionName && (
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                <MapPin className="h-3 w-3 mr-1" />
                {regionName}
              </span>
            )}
          </div>

          <p className="mt-4 text-base text-muted-foreground">{schedule}</p>

          {p.organiserUrl && (
            <div className="mt-6">
              <Button asChild size="lg">
                <a
                  href={p.organiserUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Visit official parkrun page
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          )}

          {p.lat != null && p.lng != null && (
            <div className="mt-8">
              <ParkrunMapClient locations={[p]} height={320} />
            </div>
          )}

          {p.nearby.length > 0 && (
            <div className="mt-10">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                Nearby parkruns
              </h2>
              <ul className="space-y-2">
                {p.nearby.map((n) => (
                  <li key={n.id}>
                    <Link
                      to="/parkrun-events/$slug"
                      params={{ slug: n.slug }}
                      className="inline-flex items-center gap-2 text-sm text-foreground hover:text-primary hover:underline"
                    >
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      {n.name}
                      <span className="text-muted-foreground">
                        · {n.distanceMiles.toFixed(1)} mi
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {regionName && p.regionSlug && (
            <div className="mt-10 rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground">
                More running in {regionName}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Looking for one-off races as well as your weekly parkrun?
              </p>
              <div className="mt-4">
                <Link
                  to="/running-events/$slug"
                  params={{ slug: p.regionSlug }}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Browse races in {regionName} →
                </Link>
              </div>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md text-center py-20">
          <h1 className="text-4xl font-bold text-foreground">parkrun not found</h1>
          <p className="mt-3 text-muted-foreground">
            We couldn't find that parkrun.
          </p>
          <Link
            to="/parkrun-events"
            className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Browse all parkruns
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">
          Couldn't load this parkrun
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
