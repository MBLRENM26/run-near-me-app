import { useEffect, useState } from "react";
import {
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import { z } from "zod";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { HeaderSearch } from "@/components/site/HeaderSearch";
import { searchEvents, type SearchResult } from "@/lib/search.functions";
import { track, trackSearchResultClick } from "@/lib/analytics";
import { isUkPostcode, geocodePostcode } from "@/lib/postcode";
import { formatEventDate } from "@/lib/date";
import { Loader2 } from "lucide-react";

const searchSchema = z.object({
  q: z.string().trim().max(80).optional().default(""),
});

type LoaderData = {
  q: string;
  results: SearchResult[];
  isPostcode: boolean;
};

export const Route = createFileRoute("/search")({
  validateSearch: (raw): { q: string } => {
    const parsed = searchSchema.safeParse(raw);
    return { q: parsed.success ? parsed.data.q : "" };
  },
  loaderDeps: ({ search }) => ({ q: search.q }),
  loader: async ({ deps }): Promise<LoaderData> => {
    const q = deps.q.trim();
    if (!q) return { q: "", results: [], isPostcode: false };
    if (isUkPostcode(q)) {
      // Don't run a text search for postcodes — the page redirects on mount.
      return { q, results: [], isPostcode: true };
    }
    const results = await searchEvents({ data: { q } });
    return { q, results, isPostcode: false };
  },
  head: ({ loaderData }) => {
    const q = loaderData?.q ?? "";
    const title = q
      ? `Search: ${q} — Running Events Near Me`
      : "Search — Running Events Near Me";
    return {
      meta: [
        { title },
        { name: "robots", content: "noindex, follow" },
      ],
    };
  },
  component: SearchPage,
});

function SearchPage() {
  const { q, results, isPostcode } = Route.useLoaderData() as LoaderData;
  const navigate = useNavigate();
  const [searchLogId, setSearchLogId] = useState<string | null>(null);

  // Postcode → homepage nearby flow.
  useEffect(() => {
    if (!isPostcode) return;
    let cancelled = false;
    (async () => {
      const geo = await geocodePostcode(q);
      if (cancelled) return;
      if (!geo) {
        // Fallback: stay on /search, show a friendly miss.
        navigate({ to: "/search", search: { q: "" }, replace: true });
        return;
      }
      navigate({
        to: "/",
        search: { lat: geo.lat, lng: geo.lng, label: geo.postcode },
        replace: true,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [isPostcode, q, navigate]);

  // Fire-and-forget search log once per query.
  useEffect(() => {
    if (!q || isPostcode) return;
    let cancelled = false;
    setSearchLogId(null);
    track("Search Performed", {
      query: q,
      results_count: results.length,
      has_results: results.length > 0,
    });
    fetch("/api/public/track-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q, results_count: results.length }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { search_log_id?: string } | null) => {
        if (cancelled || !data?.search_log_id) return;
        setSearchLogId(data.search_log_id);
      })
      .catch(() => {
        /* analytics is best-effort */
      });
    return () => {
      cancelled = true;
    };
  }, [q, isPostcode, results.length]);

  const trackClick = (slug: string, position: number) => {
    // Plausible goal — works without a server-side log id, so we always fire it.
    trackSearchResultClick({
      query: q,
      slug,
      position,
      results_count: results.length,
    });
    if (!searchLogId) return;
    // Fire-and-forget — must not block navigation. Use keepalive so the
    // request survives the page transition.
    fetch("/api/public/track-search-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        search_log_id: searchLogId,
        clicked_slug: slug,
        position,
      }),
      keepalive: true,
    }).catch(() => {
      /* best-effort */
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 pt-10 pb-16">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Search events
          </h1>

          <div className="mt-6 sm:hidden">
            {/* Mobile-visible inline search input (header version is sm+ only). */}
            <HeaderSearch />
          </div>

          {isPostcode && (
            <div className="mt-10 flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Looking up {q}…</span>
            </div>
          )}

          {!isPostcode && q && results.length === 0 && (
            <div className="mt-10 rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
              <p className="text-lg font-medium text-foreground">
                No events match "{q}"
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try a different spelling, a town name, or browse by distance
                or region from the homepage.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2 text-sm">
                <Link
                  to="/"
                  className="rounded-md border border-border bg-card px-3 py-1.5 font-medium text-foreground hover:border-primary"
                >
                  Home
                </Link>
                <Link
                  to="/10k-races"
                  className="rounded-md border border-border bg-card px-3 py-1.5 font-medium text-foreground hover:border-primary"
                >
                  10K races
                </Link>
                <Link
                  to="/half-marathons"
                  className="rounded-md border border-border bg-card px-3 py-1.5 font-medium text-foreground hover:border-primary"
                >
                  Half marathons
                </Link>
                <Link
                  to="/marathons"
                  className="rounded-md border border-border bg-card px-3 py-1.5 font-medium text-foreground hover:border-primary"
                >
                  Marathons
                </Link>
              </div>
            </div>
          )}

          {!isPostcode && q && results.length > 0 && (
            <>
              <p className="mt-3 text-sm text-muted-foreground">
                {results.length} result{results.length === 1 ? "" : "s"}
              </p>
              <ul className="mt-5 divide-y divide-border rounded-2xl border border-border bg-card">
                {results.map((r, i) => {
                  const dateLabel = formatEventDate({
                    date_raw: null,
                    sort_date: r.sort_date,
                    date_is_estimated: r.date_is_estimated,
                  });
                  const loc = [r.town, r.county].filter(Boolean).join(", ");
                  return (
                    <li key={r.id}>
                      <Link
                        to="/events/$slug"
                        params={{ slug: r.slug }}
                        onClick={() => trackClick(r.slug, i + 1)}
                        className="flex flex-col gap-0.5 px-4 py-3 hover:bg-muted/50 transition-colors"
                      >
                        <span className="flex items-center gap-2 font-medium text-foreground">
                          {r.name}
                          {r.is_past && (
                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                              Past event
                            </span>
                          )}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {[dateLabel, loc, r.distances]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {!q && !isPostcode && (
            <p className="mt-6 text-muted-foreground">
              Search for an event by name or town. Enter a UK postcode to see
              events near you.
            </p>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
