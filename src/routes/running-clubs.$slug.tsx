import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { ExternalLink, MapPin } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getClubPageData } from "@/lib/clubs.functions";
import { classifyEventLink, isTrustedLink } from "@/lib/link-trust";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { track } from "@/lib/analytics";

const GOVERNING_BODY_LABEL: Record<string, string> = {
  "england-athletics": "England Athletics",
  "scottish-athletics": "Scottish Athletics",
  "welsh-athletics": "Welsh Athletics",
  "athletics-ni": "Athletics Northern Ireland",
};

export const Route = createFileRoute("/running-clubs/$slug")({
  loader: ({ params }) => getClubPageData({ data: { slug: params.slug } }),
  head: ({ params, loaderData }) => {
    const c = loaderData?.club;
    const canonical = `${SITE_URL}/running-clubs/${params.slug}`;
    if (!c) {
      return {
        meta: [{ title: `Club not found — ${SITE_NAME}` }],
        links: [{ rel: "canonical", href: canonical }],
      };
    }
    const place =
      [c.town, c.county].filter(Boolean).join(", ") ||
      c.region ||
      "United Kingdom";
    const title = `${c.name} — Running Club in ${place} | ${SITE_NAME}`;
    const desc = `${c.name} is a running club based in ${place}, affiliated to ${GOVERNING_BODY_LABEL[c.governing_body] ?? c.governing_body}.`;

    const sportsClubJsonLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "SportsClub",
      name: c.name,
      sport: "Running",
      url: canonical,
    };
    if (c.lat != null && c.lng != null) {
      sportsClubJsonLd.geo = {
        "@type": "GeoCoordinates",
        latitude: c.lat,
        longitude: c.lng,
      };
    }
    if (c.town || c.county || c.region || c.postcode) {
      sportsClubJsonLd.address = {
        "@type": "PostalAddress",
        addressLocality: c.town ?? undefined,
        addressRegion: c.county ?? c.region ?? undefined,
        postalCode: c.postcode ?? undefined,
        addressCountry: c.country ?? "GB",
      };
    }

    const breadcrumbJsonLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        {
          "@type": "ListItem",
          position: 2,
          name: "Running Clubs",
          item: `${SITE_URL}/running-clubs`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: c.name,
          item: canonical,
        },
      ],
    };

    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: canonical },
      ],
      links: [{ rel: "canonical", href: canonical }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(sportsClubJsonLd),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(breadcrumbJsonLd),
        },
      ],
    };
  },
  errorComponent: ({ reset }) => {
    const router = useRouter();
    return (
      <FullShell>
        <p className="text-sm text-muted-foreground">
          Couldn't load this club.{" "}
          <button
            onClick={() => {
              reset();
              router.invalidate();
            }}
            className="text-primary underline"
          >
            Retry
          </button>
        </p>
      </FullShell>
    );
  },
  notFoundComponent: () => (
    <FullShell>
      <h1 className="text-2xl font-bold">Club not found</h1>
      <p className="mt-2 text-muted-foreground">
        We couldn't find that club. <Link to="/running-clubs" className="text-primary underline">Browse all clubs</Link>.
      </p>
    </FullShell>
  ),
  component: ClubDetailPage,
});

function FullShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 mx-auto max-w-3xl w-full px-4 py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}

function ClubDetailPage() {
  const { club: c } = Route.useLoaderData();
  const websiteLink = classifyEventLink(c.website_url);
  const showWebsite = isTrustedLink(websiteLink);
  const place =
    [c.town, c.county].filter(Boolean).join(", ") || c.region || "United Kingdom";

  useEffect(() => {
    track("Club Page View", {
      slug: c.slug,
      region: c.region ?? undefined,
      is_claimed: c.is_claimed,
      governing_body: c.governing_body,
    });
  }, [c.slug, c.region, c.is_claimed, c.governing_body]);

  return (
    <FullShell>
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/running-clubs">Running Clubs</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{c.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className="mb-6">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          {c.name}
        </h1>
        <p className="mt-1 text-muted-foreground flex items-center gap-1.5">
          <MapPin className="h-4 w-4" />
          {place}
        </p>
        {c.is_claimed && (
          <span className="mt-2 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            Verified club
          </span>
        )}
      </header>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Affiliation</dt>
            <dd className="font-medium text-foreground">
              {GOVERNING_BODY_LABEL[c.governing_body] ?? c.governing_body}
              {c.affiliation_number ? ` · #${c.affiliation_number}` : ""}
            </dd>
          </div>
          {c.disciplines.length > 0 && (
            <div>
              <dt className="text-muted-foreground">Disciplines</dt>
              <dd className="font-medium text-foreground capitalize">
                {c.disciplines.join(", ")}
              </dd>
            </div>
          )}
          {c.postcode && (
            <div>
              <dt className="text-muted-foreground">Postcode</dt>
              <dd className="font-medium text-foreground">{c.postcode}</dd>
            </div>
          )}
          {c.region && (
            <div>
              <dt className="text-muted-foreground">Region</dt>
              <dd className="font-medium text-foreground">{c.region}</dd>
            </div>
          )}
        </dl>

        {showWebsite && websiteLink.href && (
          <Button asChild className="w-full sm:w-auto">
            <a
              href={websiteLink.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                track("Club Website Click", {
                  slug: c.slug,
                  host: websiteLink.host ?? undefined,
                  kind: websiteLink.kind,
                })
              }
            >
              {websiteLink.kind === "entry"
                ? "Visit club page"
                : "Visit club website"}
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        )}
      </section>

      {!c.is_claimed && (
        <aside className="mt-6 rounded-xl border border-border bg-muted/30 p-5">
          <h2 className="font-semibold text-foreground">Run this club?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Claim your listing to update details and verify your club.
          </p>
          <Link
            to="/running-clubs/$slug/claim"
            params={{ slug: c.slug }}
            className="mt-3 inline-flex items-center text-sm font-medium text-primary hover:underline"
          >
            Claim this club →
          </Link>
        </aside>
      )}
    </FullShell>
  );
}
