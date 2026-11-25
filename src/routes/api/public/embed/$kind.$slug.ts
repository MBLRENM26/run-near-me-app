import { createFileRoute } from "@tanstack/react-router";
import { parseEmbedKind, parseEmbedTheme, renderEmbedHtml, type EmbedRace } from "@/lib/embed";

const SLUG = /^[a-z0-9-]{1,120}$/;

function fmt(d: string | null, raw: string | null, est: boolean | null): string {
  if (d && !est) return new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return raw ?? (d ? new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }) : "Date TBC");
}

export const Route = createFileRoute("/api/public/embed/$kind/$slug")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const kind = parseEmbedKind(params.kind);
        if (!kind || !SLUG.test(params.slug)) return new Response("Not found", { status: 404 });
        const theme = parseEmbedTheme(new URL(request.url).searchParams.get("theme"));
        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        let heading = "Upcoming races";
        let morePath = "/";
        let races: EmbedRace[] = [];

        if (kind === "club") {
          const { data: club } = await db.from("public_clubs").select("id, name, slug").eq("slug", params.slug).eq("status", "ACTIVE").maybeSingle();
          if (!club?.id) return new Response("Not found", { status: 404 });
          const { loadClubRaces } = await import("@/lib/club-races.server");
          const rows = (await loadClubRaces(club.id)) ?? [];
          heading = `Upcoming races by ${club.name}`;
          morePath = `/running-clubs/${club.slug}`;
          races = rows.map((r) => ({ slug: r.slug, name: r.name, when: fmt(r.sort_date, r.date_raw, r.date_is_estimated), town: r.town, distances: r.distances }));
        } else {
          const { countyBySlug } = await import("@/lib/counties");
          const cfg = countyBySlug(params.slug);
          if (!cfg) return new Response("Not found", { status: 404 });
          const { DISCOVERY_EVENT_COLUMNS, UK_BOUNDS_OR_NULL } = await import("@/lib/events-query");
          const { hasDiscoverableLink } = await import("@/lib/link-trust");
          const today = new Date().toISOString().slice(0, 10);
          const { data } = await db.from("events_public_v1").select(DISCOVERY_EVENT_COLUMNS)
            .in("county", cfg.dbNames).gte("sort_date", today).or(UK_BOUNDS_OR_NULL)
            .order("sort_date", { ascending: true }).limit(60);
          type Row = { slug: string | null; name: string; sort_date: string | null; date_raw: string | null; date_is_estimated: boolean | null; town: string | null; distances: string | null; entry_url: string | null; organiser_url: string | null; governance: string | null };
          heading = `Upcoming races in ${cfg.label}`;
          morePath = `/running-events-in/${params.slug}`;
          races = ((data ?? []) as unknown as Row[])
            .filter((r) => r.slug && hasDiscoverableLink(r.entry_url, r.organiser_url, r.governance, r as never))
            .map((r) => ({ slug: r.slug as string, name: r.name, when: fmt(r.sort_date, r.date_raw, r.date_is_estimated), town: r.town, distances: r.distances }));
        }

        return new Response(renderEmbedHtml({ kind, slug: params.slug, heading, races, theme, morePath }), {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
            "X-Robots-Tag": "noindex",
            "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors *",
          },
        });
      },
    },
  },
});
