import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import {
  DISTANCE_PAGES,
  slugToDistanceKey,
} from "@/lib/distance-filters";
import { slugToRegion } from "@/lib/regions";
import { getEventsByRegionAndDistance } from "@/lib/events.functions";
import {
  RegionDistancePage,
  buildRegionDistanceHead,
} from "@/components/distance/RegionDistancePage";
import { SITE_URL } from "@/lib/site";

import { monthSearchValidator } from "@/lib/month-filter";

export const Route = createFileRoute("/running-events/$slug_/$distance")({
  validateSearch: monthSearchValidator,
  beforeLoad: ({ params }) => {
    if (!slugToRegion(params.slug)) throw notFound();
    if (!slugToDistanceKey(params.distance)) throw notFound();
  },
  loader: ({ params }) => {
    const key = slugToDistanceKey(params.distance)!;
    return getEventsByRegionAndDistance({
      data: { regionSlug: params.slug, distanceKey: key },
    });
  },
  head: ({ params, loaderData }) => {
    const region = slugToRegion(params.slug);
    const key = slugToDistanceKey(params.distance);
    if (!region || !key) return { meta: [] };
    return buildRegionDistanceHead({
      cfg: DISTANCE_PAGES[key],
      region,
      data: loaderData,
      canonicalPath: `/running-events/${region.slug}/${params.distance}`,
      siteUrl: SITE_URL,
    });
  },
  component: RegionDistanceRoute,
  notFoundComponent: NotFoundCombo,
  errorComponent: ComboError,
});

function RegionDistanceRoute() {
  const { slug, distance } = Route.useParams();
  const region = slugToRegion(slug)!;
  const key = slugToDistanceKey(distance)!;
  const cfg = DISTANCE_PAGES[key];
  const data = Route.useLoaderData();
  return <RegionDistancePage cfg={cfg} region={region} data={data} />;
}

function NotFoundCombo() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md text-center py-20">
          <h1 className="text-4xl font-bold text-foreground">Page not found</h1>
          <p className="mt-3 text-muted-foreground">
            We couldn't find that region or distance combination.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ComboError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">
          Couldn't load events
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
