import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { NearYouBox } from "@/components/distance/NearYouBox";
import { getFlatHalfMarathons, type FlatRace } from "@/lib/flat-races.functions";
import { MIN_INDEXABLE_FEATURE_EVENTS } from "@/lib/flat-course";
import { formatMonthLabelLong, type MonthKey } from "@/lib/month-filter";
import { SITE_URL } from "@/lib/site";

const PATH = "/flat-half-marathons";

export const Route = createFileRoute("/flat-half-marathons")({
  loader: () => getFlatHalfMarathons(),
  head: ({ loaderData }) => {
    const n = loaderData?.events.length ?? 0;
    const title = "Flat Half Marathons in the UK — Running Events Near Me";
    const description = `${n} upcoming UK half marathons whose organisers describe the course as flat. Dates, locations and links to enter.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `${SITE_URL}${PATH}` },
        { name: "twitter:card", content: "summary" },
        ...(n < MIN_INDEXABLE_FEATURE_EVENTS ? [{ name: "robots", content: "noindex, follow" }] : []),
      ],
      links: [{ rel: "canonical", href: `${SITE_URL}${PATH}` }],
    };
  },
  component: FlatHalfPage,
});

function FlatHalfPage() {
  const { events } = Route.useLoaderData();
  const groups = new Map<string, FlatRace[]>();
  for (const e of events) {
    const k = e.sort_date?.slice(0, 7) ?? "";
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(e);
  }
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 pt-10 pb-12">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span aria-hidden>/</span>
          <Link to="/half-marathons" className="hover:text-foreground">Half marathons</Link>
          <span aria-hidden>/</span>
          <span className="text-foreground">Flat</span>
        </nav>
        <h1 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Flat half marathons in the UK</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          <span className="font-medium text-foreground">{events.length}</span> upcoming half marathons where the organiser describes the course as flat.
        </p>
        <NearYouBox distanceKey="half-marathon" label="half marathons" />

        {events.length === 0 ? (
          <p className="mt-10 text-muted-foreground">No flat half marathons listed right now. Check back soon.</p>
        ) : (
          [...groups.entries()].map(([month, list]) => (
            <section key={month} className="mt-10">
              <h2 className="text-xl font-semibold text-foreground">
                {month ? formatMonthLabelLong(month as MonthKey) : "Date to be confirmed"}{" "}
                <span className="text-sm font-normal text-muted-foreground">· {list.length}</span>
              </h2>
              <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-card">
                {list.map((e) => (
                  <li key={e.id} className="p-4">
                    <Link to="/events/$slug" params={{ slug: e.slug }} className="font-medium text-foreground hover:text-primary">
                      {e.name}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[e.date_raw, [e.town, e.county].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
                    </p>
                    <p className="mt-1 text-sm text-foreground">Course: <span className="text-muted-foreground">{e.courseProfile}</span></p>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </main>
      <Footer />
    </div>
  );
}
