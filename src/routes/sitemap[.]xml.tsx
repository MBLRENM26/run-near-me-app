import { createFileRoute } from "@tanstack/react-router";
import { REGIONS } from "@/lib/regions";
import { SITE_URL } from "@/lib/site";
import {
  getAllActiveSlugs,
  getRegionDistanceMatrix,
} from "@/lib/events.functions";
import { getParkrunList } from "@/lib/parkrun.functions";
import { DISTANCE_PAGE_LIST } from "@/lib/distance-filters";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const today = new Date().toISOString().slice(0, 10);

        let eventEntries: { slug: string; lastmod: string }[] = [];
        try {
          const slugs = await getAllActiveSlugs();
          eventEntries = slugs.map((s) => ({
            slug: s.slug,
            lastmod: s.sort_date ?? today,
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
