import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { lookupEventSlug } from "@/lib/events.functions";

// Reserved top-level segments that must NEVER be treated as a legacy event
// slug, even if a DB row happens to share the name. Concrete route files
// already take precedence in TanStack file routing — this is a belt-and-
// braces guard for future additions.
const RESERVED_TOP_LEVEL = new Set([
  "events",
  "running-events",
  "parkrun-events",
  "junior-parkrun-events",
  "5k-races",
  "10k-races",
  "half-marathons",
  "marathons",
  "ultra-marathons",
  "trail-running-events",
  "list-your-event",
  "privacy",
  "admin",
  "api",
  "lovable",
  "email",
  "sitemap.xml",
  "robots.txt",
  "favicon.ico",
  "index.html",
  "auth",
]);

// Catch-all single-segment route for legacy flat event URLs that pre-date the
// /events/{slug} canonical. Only redirects when the slug resolves to a real,
// ACTIVE event — anything else returns a genuine 404 so we don't mask broken
// links or typos.
export const Route = createFileRoute("/$slug")({
  beforeLoad: async ({ params }) => {
    const slug = params.slug;
    if (!slug || RESERVED_TOP_LEVEL.has(slug)) throw notFound();
    if (!/^[a-z0-9-]+$/.test(slug)) throw notFound();

    const { exists } = await lookupEventSlug({ data: { slug } });
    if (!exists) throw notFound();

    throw redirect({
      to: "/events/$slug",
      params: { slug },
      statusCode: 301,
    });
  },
  component: () => null,
});
