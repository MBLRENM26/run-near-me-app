import { createFileRoute } from "@tanstack/react-router";
import { REGIONS } from "@/lib/regions";
import { SITE_URL } from "@/lib/site";
import {
  getIndexableEventSlugsForSitemap,
  getRegionDistanceMatrix,
} from "@/lib/events.functions";
import { getParkrunList } from "@/lib/parkrun.functions";
import { getAllClubSlugs } from "@/lib/clubs.functions";
import { DISTANCE_PAGE_LIST, type DistanceKey } from "@/lib/distance-filters";
import { getMonthPageMatrix } from "@/lib/month-page.functions";
import { monthSlugFromKey, nextNMonthKeys } from "@/lib/month-slug";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const today = new Date().toISOString().slice(0, 10);

        let eventEntries: { slug: string; lastmod: string }[] = [];
        try {
          // Mirror the per-page indexability rule so we don't ask Google to
          // crawl URLs that emit <meta robots="noindex"> (see
          // src/lib/event-indexability.ts). This excludes past events,
          // slug-suffix duplicates, orphans, and non-earliest series siblings.
          const slugs = await getIndexableEventSlugsForSitemap();
          eventEntries = slugs.map((s) => ({
            slug: s.slug,
            // lastmod must not be a future date — clamp to today.
            lastmod:
              s.sort_date && s.sort_date < today ? s.sort_date : today,
          }));
        } catch (err) {
          console.error("Sitemap: failed to load event slugs", err);
        }

        let parkrunSlugs: string[] = [];
        try {
          const list = await getParkrunList({ data: { variant: "all" } });
          parkrunSlugs = list.locations.map((l) => l.slug);
        } catch (err) {
          console.error("Sitemap: failed to load parkrun slugs", err);
        }

        let comboEntries: { regionSlug: string; distanceSlug: string }[] = [];
        try {
          const matrix = await getRegionDistanceMatrix();
          comboEntries = matrix
            .filter((m) => m.total >= 3)
            .map((m) => ({
              regionSlug: m.regionSlug,
              distanceSlug: m.distanceSlug,
            }));
        } catch (err) {
          console.error("Sitemap: failed to load region×distance matrix", err);
        }

        let clubEntries: { slug: string; lastmod: string }[] = [];
        try {
          const slugs = await getAllClubSlugs();
          clubEntries = slugs.map((s) => ({
            slug: s.slug,
            lastmod: (s.created_at ?? today).slice(0, 10),
          }));
        } catch (err) {
          console.error("Sitemap: failed to load club slugs", err);
        }

        const urls = [
          { loc: `${SITE_URL}/`, lastmod: today, priority: "1.0", changefreq: "daily" },
          {
            loc: `${SITE_URL}/list-your-event`,
            lastmod: today,
            priority: "0.5",
            changefreq: "monthly",
          },
          {
            loc: `${SITE_URL}/privacy`,
            lastmod: today,
            priority: "0.3",
            changefreq: "monthly",
          },
          ...DISTANCE_PAGE_LIST.map((p) => ({
            loc: `${SITE_URL}/${p.slug}`,
            lastmod: today,
            priority: "0.9",
            changefreq: "weekly",
          })),
          {
            loc: `${SITE_URL}/running-events-this-weekend`,
            lastmod: today,
            priority: "0.9",
            changefreq: "daily",
          },
          {
            loc: `${SITE_URL}/running-events-next-weekend`,
            lastmod: today,
            priority: "0.8",
            changefreq: "daily",
          },
          {
            loc: `${SITE_URL}/parkrun-events`,
            lastmod: today,
            priority: "0.9",
            changefreq: "weekly",
          },
          {
            loc: `${SITE_URL}/junior-parkrun-events`,
            lastmod: today,
            priority: "0.9",
            changefreq: "weekly",
          },
          ...REGIONS.map((r) => ({
            loc: `${SITE_URL}/running-events/${r.slug}`,
            lastmod: today,
            priority: "0.8",
            changefreq: "weekly",
          })),
          ...comboEntries.map((c) => ({
            loc: `${SITE_URL}/running-events/${c.regionSlug}/${c.distanceSlug}`,
            lastmod: today,
            priority: "0.7",
            changefreq: "weekly",
          })),
          ...REGIONS.map((r) => ({
            loc: `${SITE_URL}/parkrun-events/region/${r.slug}`,
            lastmod: today,
            priority: "0.7",
            changefreq: "weekly",
          })),
          ...parkrunSlugs.map((slug) => ({
            loc: `${SITE_URL}/parkrun-events/${slug}`,
            lastmod: today,
            priority: "0.6",
            changefreq: "monthly",
          })),
          ...eventEntries.map((e) => ({
            loc: `${SITE_URL}/events/${e.slug}`,
            lastmod: e.lastmod,
            priority: "0.7",
            changefreq: "weekly",
          })),
          {
            loc: `${SITE_URL}/running-clubs`,
            lastmod: today,
            priority: "0.8",
            changefreq: "weekly",
          },
          ...clubEntries.map((c) => ({
            loc: `${SITE_URL}/running-clubs/${c.slug}`,
            lastmod: c.lastmod,
            priority: "0.5",
            changefreq: "monthly",
          })),
        ];

        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`,
  )
  .join("\n")}
</urlset>`;

        return new Response(body, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
