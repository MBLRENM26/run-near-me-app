import { createFileRoute } from "@tanstack/react-router";
import { REGIONS } from "@/lib/regions";
import { SITE_URL } from "@/lib/site";
import { getIndexableEventSlugsForSitemap, getRegionDistanceMatrix } from "@/lib/events.functions";
import { getParkrunList } from "@/lib/parkrun.functions";
import { getAllClubSlugs } from "@/lib/clubs.functions";
import { DISTANCE_PAGE_LIST, type DistanceKey } from "@/lib/distance-filters";
import { getMonthPageMatrix } from "@/lib/month-page.functions";
import { monthSlugFromKey, nextNMonthKeys } from "@/lib/month-slug";
import { COUNTIES, type CountyConfig } from "@/lib/counties";
import { getCityEventCounts } from "@/lib/city.functions";
import { TAXONOMY_PAGES } from "@/lib/taxonomy-pages";
import { sitemapResponse } from "@/lib/sitemap-response";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        let complete = true;

        let eventEntries: { slug: string }[] = [];
        try {
          // Mirror the per-page indexability rule so we don't ask Google to
          // crawl URLs that emit <meta robots="noindex"> (see
          // src/lib/event-indexability.ts). This excludes past events,
          // slug-suffix duplicates, orphans, and non-earliest series siblings.
          const slugs = await getIndexableEventSlugsForSitemap();
          eventEntries = slugs.map((s) => ({
            slug: s.slug,
          }));
        } catch (err) {
          complete = false;
          console.error("Sitemap: failed to load event slugs", err);
        }

        let parkrunSlugs: string[] = [];
        try {
          const list = await getParkrunList({ data: { variant: "all" } });
          parkrunSlugs = list.locations.map((l) => l.slug);
        } catch (err) {
          complete = false;
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
          complete = false;
          console.error("Sitemap: failed to load region×distance matrix", err);
        }

        // Month landing pages (terrain-agnostic + per distance). Only
        // include URLs with ≥3 events to avoid thin pages.
        const monthEntries: { loc: string; priority: string }[] = [];
        try {
          const matrix = await getMonthPageMatrix();
          const monthsWindow = new Set(nextNMonthKeys(12));
          const distanceSlugByKey: Record<DistanceKey, string> = {
            "5k": "5k-races",
            "10k": "10k-races",
            "half-marathon": "half-marathons",
            marathon: "marathons",
            trail: "trail-running-events",
            ultra: "ultra-marathons",
          };
          for (const row of matrix) {
            if (!monthsWindow.has(row.monthKey)) continue;
            if (row.total < 3) continue;
            const slug = monthSlugFromKey(row.monthKey);
            if (row.distanceKey === "all") {
              monthEntries.push({
                loc: `${SITE_URL}/running-events/${slug}`,
                priority: "0.7",
              });
            } else if (row.distanceKey !== "trail") {
              // Distance × month routes ship for the 5 numeric distances;
              // trail uses the terrain hub instead.
              monthEntries.push({
                loc: `${SITE_URL}/${distanceSlugByKey[row.distanceKey]}/${slug}`,
                priority: "0.6",
              });
            }
          }
        } catch (err) {
          complete = false;
          console.error("Sitemap: failed to load month matrix", err);
        }

        let clubEntries: { slug: string }[] = [];
        try {
          const slugs = await getAllClubSlugs();
          clubEntries = slugs.map((s) => ({
            slug: s.slug,
          }));
        } catch (err) {
          complete = false;
          console.error("Sitemap: failed to load club slugs", err);
        }

        let cityEntries: { slug: string }[] = [];
        try {
          const counts = await getCityEventCounts();
          cityEntries = counts.map((c) => ({ slug: c.slug }));
        } catch (err) {
          complete = false;
          console.error("Sitemap: failed to load city counts", err);
        }

        const urls = [
          { loc: `${SITE_URL}/`, priority: "1.0", changefreq: "daily" },
          {
            loc: `${SITE_URL}/list-your-event`,
            priority: "0.5",
            changefreq: "monthly",
          },
          {
            loc: `${SITE_URL}/about`,
            priority: "0.5",
            changefreq: "monthly",
          },
          {
            loc: `${SITE_URL}/privacy`,
            priority: "0.3",
            changefreq: "monthly",
          },
          ...["for-runners", "for-clubs", "for-organisers"].map((slug) => ({
            loc: `${SITE_URL}/${slug}`,
            priority: "0.6",
            changefreq: "monthly",
          })),

          ...DISTANCE_PAGE_LIST.map((p) => ({
            loc: `${SITE_URL}/${p.slug}`,
            priority: "0.9",
            changefreq: "weekly",
          })),
          {
            loc: `${SITE_URL}/running-events-this-weekend`,
            priority: "0.9",
            changefreq: "daily",
          },
          {
            loc: `${SITE_URL}/running-events-next-weekend`,
            priority: "0.8",
            changefreq: "daily",
          },
          ...["road-races", "fell-races", "multi-terrain-races"].map((slug) => ({
            loc: `${SITE_URL}/${slug}`,
            priority: "0.8",
            changefreq: "weekly",
          })),
          ...TAXONOMY_PAGES.map((p) => ({
            loc: `${SITE_URL}/${p.slug}`,
            priority: "0.7",
            changefreq: "weekly",
          })),
          ...COUNTIES.map((c: CountyConfig) => ({
            loc: `${SITE_URL}/running-events-in/${c.slug}`,
            priority: "0.7",
            changefreq: "weekly",
          })),
          ...cityEntries.map((c) => ({
            loc: `${SITE_URL}/running-events-in-city/${c.slug}`,
            priority: "0.7",
            changefreq: "weekly",
          })),
          {
            loc: `${SITE_URL}/parkrun-events`,
            priority: "0.9",
            changefreq: "weekly",
          },
          {
            loc: `${SITE_URL}/junior-parkrun-events`,
            priority: "0.9",
            changefreq: "weekly",
          },
          ...REGIONS.map((r) => ({
            loc: `${SITE_URL}/running-events/${r.slug}`,
            priority: "0.8",
            changefreq: "weekly",
          })),
          ...comboEntries.map((c) => ({
            loc: `${SITE_URL}/running-events/${c.regionSlug}/${c.distanceSlug}`,
            priority: "0.7",
            changefreq: "weekly",
          })),
          ...REGIONS.map((r) => ({
            loc: `${SITE_URL}/parkrun-events/region/${r.slug}`,
            priority: "0.7",
            changefreq: "weekly",
          })),
          ...parkrunSlugs.map((slug) => ({
            loc: `${SITE_URL}/parkrun-events/${slug}`,
            priority: "0.6",
            changefreq: "monthly",
          })),
          ...eventEntries.map((e) => ({
            loc: `${SITE_URL}/events/${e.slug}`,
            priority: "0.7",
            changefreq: "weekly",
          })),
          {
            loc: `${SITE_URL}/running-clubs`,
            priority: "0.8",
            changefreq: "weekly",
          },
          ...clubEntries.map((c) => ({
            loc: `${SITE_URL}/running-clubs/${c.slug}`,
            priority: "0.5",
            changefreq: "monthly",
          })),
          ...monthEntries.map((m) => ({
            loc: m.loc,
            priority: m.priority,
            changefreq: "weekly",
          })),
        ];

        // Never publish a success-shaped partial sitemap after a data failure.
        // Omit lastmod until we have a reliable significant-content timestamp;
        // the current date and race date are not modification dates.
        return sitemapResponse(urls, complete);
      },
    },
  },
});
