import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { listClubs, type ClubListItem } from "@/lib/clubs.functions";
import { REGIONS } from "@/lib/regions";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { BackToSearchBar } from "@/components/site/BackToSearchBar";


const searchSchema = z.object({
  region: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).max(500).optional(),
  from: z.literal("search").optional(),
  fromQ: z.string().max(80).optional(),
});


const PAGE_SIZE = 50;

export const Route = createFileRoute("/running-clubs/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({
    region: search.region,
    page: search.page ?? 1,
  }),
  loader: ({ deps }) =>
    listClubs({
      data: {
        region: deps.region,
        limit: PAGE_SIZE,
        offset: (deps.page - 1) * PAGE_SIZE,
      },
    }),
  head: () => {
    const canonical = `${SITE_URL}/running-clubs`;
    const breadcrumbJsonLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        {
          "@type": "ListItem",
          position: 2,
          name: "Running Clubs",
          item: canonical,
        },
      ],
    };
    return {
      meta: [
        { title: `Running Clubs Near Me — UK Directory | ${SITE_NAME}` },
        {
          name: "description",
          content:
            "Browse running clubs across the UK. Affiliated to England Athletics, Scottish Athletics, Welsh Athletics and Athletics NI.",
        },
        { property: "og:title", content: "Running Clubs Near Me — UK Directory" },
        {
          property: "og:description",
          content:
            "Find affiliated running clubs across the UK by region.",
        },
        { property: "og:url", content: canonical },
      ],
      links: [{ rel: "canonical", href: canonical }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(breadcrumbJsonLd),
        },
      ],
    };
  },
  errorComponent: () => (
    <FullShell>
      <p className="text-sm text-muted-foreground">
        Couldn't load clubs right now. Please try again.
      </p>
    </FullShell>
  ),
  notFoundComponent: () => (
    <FullShell>
      <p className="text-sm text-muted-foreground">Not found.</p>
    </FullShell>
  ),
  component: ClubsIndexPage,
});

function FullShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 mx-auto max-w-6xl w-full px-4 py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}

function ClubsIndexPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const initial = Route.useLoaderData();
  const fetchList = useServerFn(listClubs);

  const region = search.region;
  const page = search.page ?? 1;

  const { data } = useQuery({
    queryKey: ["clubs-list", region ?? "all", page],
    queryFn: () =>
      fetchList({
        data: {
          region,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        },
      }),
    initialData: initial,
  });

  const clubs = data.clubs;
  const total = data.total;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <FullShell>
      <BackToSearchBar />
      <Breadcrumb className="mb-4">

        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Running Clubs</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className="mb-6">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          Running clubs near me
        </h1>
        <p className="mt-2 text-muted-foreground">
          {total.toLocaleString()} affiliated clubs across the UK.
        </p>
      </header>

      <RegionFilter
        active={region}
        onChange={(r) =>
          navigate({
            search: { region: r ?? undefined, page: undefined },
          })
        }
      />

      {clubs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center mt-6">
          <p className="text-sm text-muted-foreground">
            No clubs found for this filter yet.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 mt-6">
          {clubs.map((c: ClubListItem) => (
            <li
              key={c.id}
              className="rounded-xl border border-border bg-card p-4 shadow-card hover:shadow-card-hover transition-shadow"
            >
              <Link
                to="/running-clubs/$slug"
                params={{ slug: c.slug }}
                className="block"
              >
                <h2 className="font-semibold text-foreground leading-snug">
                  {c.name}
                  {c.is_claimed && (
                    <span className="ml-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary align-middle">
                      Verified
                    </span>
                  )}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[c.town, c.county].filter(Boolean).join(", ") ||
                    c.region ||
                    "United Kingdom"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <nav className="mt-8 flex items-center justify-between text-sm">
          <button
            disabled={page <= 1}
            onClick={() =>
              navigate({ search: { region, page: page > 2 ? page - 1 : undefined } })
            }
            className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => navigate({ search: { region, page: page + 1 } })}
            className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </nav>
      )}
    </FullShell>
  );
}

function RegionFilter({
  active,
  onChange,
}: {
  active: string | undefined;
  onChange: (r: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <FilterChip active={!active} onClick={() => onChange(null)}>
        All UK
      </FilterChip>
      {REGIONS.map((r) => (
        <FilterChip
          key={r.slug}
          active={active === r.name}
          onClick={() => onChange(r.name)}
        >
          {r.name}
        </FilterChip>
      ))}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
