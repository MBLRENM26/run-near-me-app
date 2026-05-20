import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getParkrunsByRegion } from "@/lib/parkrun.functions";
import { ParkrunMapClient } from "@/components/parkrun/ParkrunMapClient";
import { slugToRegion } from "@/lib/regions";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/parkrun-events/region/$region")({
  beforeLoad: ({ params }) => {
    if (!slugToRegion(params.region)) throw notFound();
  },
  loader: ({ params }) =>
    getParkrunsByRegion({
      data: { region: params.region, variant: "all" },
    }),
  head: ({ params, loaderData }) => {
    const region = slugToRegion(params.region);
    const name = region?.name ?? "UK";
    const canonical = `${SITE_URL}/parkrun-events/region/${params.region}`;
    const total = loaderData?.total ?? 0;
    const title = `parkrun in ${name} — ${total} Free Weekly 5K Locations`;
    const description = `Find every parkrun in ${name}. ${total} free, weekly, timed 5K and junior 2K runs every weekend.`;
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
    };
  },
  component: ParkrunRegionPage,
});

function ParkrunRegionPage() {
  const { region: regionSlug } = Route.useParams();
  const region = slugToRegion(regionSlug)!;
  const data: import("@/lib/parkrun.functions").ParkrunListData = Route.useLoaderData();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pt-10 pb-6">
          <Link
            to="/parkrun-events"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to all parkruns
          </Link>
          <h1 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            parkrun in {region.name}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {data.total} parkrun {data.total === 1 ? "location" : "locations"}
            {" "}in {region.name} — free, weekly, every weekend.
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-8">
          <ParkrunMapClient locations={data.locations} height={400} />
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16">
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.locations.map((l) => (
              <li key={l.id}>
                <Link
                  to="/parkrun-events/$slug"
                  params={{ slug: l.slug }}
                  className="block rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-card hover:border-primary hover:shadow-card-hover transition-all"
                >
                  {l.name}
                  <span className="ml-1 text-xs text-muted-foreground">
                    · {l.distance ?? (l.variant === "junior" ? "2K" : "5K")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <Footer />
    </div>
  );
}
