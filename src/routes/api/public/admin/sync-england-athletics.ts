import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { normaliseRegion } from "@/lib/region-normalize";

// Syncs licensed running events from the England Athletics RunEvents
// public event finder API into the events table. Idempotent: upserts on
// norm_id `ea-<EA event UUID>` — the same key format used by the original
// May import (source = "england-athletics") — so existing records are
// updated in place, never duplicated. Existing slugs are preserved so
// published URLs don't change.

const EA_URL =
  "https://www.englandathletics.org/runevents/wp-admin/admin-ajax.php";
const PAGE_SIZE = 10; // fixed by the EA API
const MAX_PAGES = 120;
const SOURCE = "england-athletics";

type EaRace = {
  name: string | null;
  distance: string | null;
  event_race_distance: { name: string | null } | null;
};

type EaEvent = {
  id: string;
  type: string;
  status: string;
  licensed: boolean;
  name: string;
  start: string | null; // "2026-09-27 10:30:00"
  end: string | null;
  registration_url: string | null;
  website_url: string | null;
  races: EaRace[] | null;
  address: {
    city: string | null;
    region: string | null; // county-level, e.g. "Northamptonshire"
    postcode: string | null;
    country: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  discipline: { name: string | null } | null;
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseEaDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDateRaw(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** "BRACKLEY" → "Brackley"; leaves mixed-case names alone. */
function titleCaseTown(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  if (t !== t.toUpperCase()) return t;
  return t
    .toLowerCase()
    .replace(/(^|[\s\-'])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase());
}

function distancesFromRaces(races: EaRace[] | null | undefined): string | null {
  if (!races || races.length === 0) return null;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of races) {
    const d = r.distance?.trim() || r.event_race_distance?.name?.trim();
    if (d && !seen.has(d.toLowerCase())) {
      seen.add(d.toLowerCase());
      out.push(d);
    }
  }
  return out.length > 0 ? out.join(", ") : null;
}

async function fetchPage(
  page: number,
): Promise<{ events: EaEvent[]; lastPage: number }> {
  const url = `${EA_URL}?action=data_api_search&types%5B%5D=event&page=${page}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; RunningEventsNearMe/1.0)",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`EA API returned ${res.status} for page ${page}`);
  const text = await res.text();
  // admin-ajax sometimes prefixes "0" or returns an HTML error with HTTP 200
  const start = text.indexOf("{");
  if (start === -1) throw new Error(`EA API returned non-JSON for page ${page}`);
  const json = JSON.parse(text.slice(start)) as {
    data: EaEvent[];
    meta: { last_page: number };
  };
  return { events: json.data ?? [], lastPage: json.meta?.last_page ?? page };
}

/** Fetch a page with retries; returns null if the EA API keeps failing. */
async function fetchPageSafe(
  page: number,
): Promise<{ events: EaEvent[]; lastPage: number } | null> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await fetchPage(page);
    } catch {
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
  }
  return null;
}

function isAuthorized(request: Request): boolean {
  const adminSecret = process.env.IMPORT_SECRET;
  const provided = request.headers.get("x-admin-secret");
  if (adminSecret && provided && provided === adminSecret) return true;
  const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const apikey = request.headers.get("apikey");
  if (anonKey && apikey && apikey === anonKey) return true;
  return false;
}

export const Route = createFileRoute(
  "/api/public/admin/sync-england-athletics",
)({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!process.env.IMPORT_SECRET) {
          return Response.json(
            { error: "Server not configured" },
            { status: 500 },
          );
        }
        if (!isAuthorized(request)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Optional page range for chunked runs: ?from=1&to=30
        const u = new URL(request.url);
        const fromPage = Math.max(1, Number(u.searchParams.get("from")) || 1);
        const toParam = Number(u.searchParams.get("to")) || MAX_PAGES;

        // 1. Fetch pages from the EA RunEvents API
        const all: EaEvent[] = [];
        const failedPages: number[] = [];
        let lastPage = toParam;
        for (let p = fromPage; p <= Math.min(toParam, lastPage, MAX_PAGES); p++) {
          const result = await fetchPageSafe(p);
          if (!result) {
            failedPages.push(p);
            continue;
          }
          lastPage = result.lastPage;
          all.push(...result.events);
          if (p >= lastPage) break;
        }

        // 2. Keep active event records only
        const active = all.filter(
          (e) => e.type === "event" && e.status === "ACTIVE" && e.name,
        );

        // 3. Existing records — preserve slugs for ea-* rows, dedupe vs
        //    other sources by name+date and slug ownership
        type ExistingRow = {
          slug: string | null;
          name: string | null;
          date_from: string | null;
          norm_id: string | null;
          source: string | null;
        };
        const existing: ExistingRow[] = [];
        for (let offset = 0; ; offset += 1000) {
          const { data: chunk, error: exErr } = await supabaseAdmin
            .from("events")
            .select("slug, name, date_from, norm_id, source")
            .range(offset, offset + 999);
          if (exErr) {
            return Response.json({ error: exErr.message }, { status: 500 });
          }
          existing.push(...(chunk ?? []));
          if (!chunk || chunk.length < 1000) break;
        }
        const slugByNormId = new Map(
          (existing ?? []).map((e) => [e.norm_id, e.slug]),
        );
        const slugOwners = new Map(
          (existing ?? []).map((e) => [e.slug, e.norm_id]),
        );
        const otherSourceNameDate = new Set(
          (existing ?? [])
            .filter((e) => e.source !== SOURCE)
            .map(
              (e) =>
                `${(e.name ?? "").toLowerCase().trim()}|${e.date_from ?? ""}`,
            ),
        );

        // 4. Map to event rows
        const todayISO = new Date().toISOString().slice(0, 10);
        const seenSlugs = new Set<string>();
        const seenNormIds = new Set<string>();
        type EventInsert =
          import("@/integrations/supabase/types").Database["public"]["Tables"]["events"]["Insert"];
        const rows: EventInsert[] = [];
        let skippedDupes = 0;
        let skippedNoDate = 0;
        let updatedExisting = 0;

        for (const e of active) {
          const normId = `ea-${e.id}`;
          if (seenNormIds.has(normId)) continue;
          seenNormIds.add(normId);

          const name = e.name.trim();
          const dateFrom = parseEaDate(e.start);
          const dateTo = parseEaDate(e.end);
          if (!dateFrom) {
            skippedNoDate++;
            continue;
          }

          const isExisting = slugByNormId.has(normId);

          // New event whose name+date already exists from another source
          if (
            !isExisting &&
            otherSourceNameDate.has(`${name.toLowerCase()}|${dateFrom}`)
          ) {
            skippedDupes++;
            continue;
          }

          // Preserve the existing slug; only generate for new events
          let slug = slugByNormId.get(normId) ?? null;
          if (!slug) {
            slug = slugify(name);
            const owner = slugOwners.get(slug);
            if ((owner && owner !== normId) || seenSlugs.has(slug)) {
              slug = `${slug}-${dateFrom}`;
            }
            const finalOwner = slugOwners.get(slug);
            if (seenSlugs.has(slug) || (finalOwner && finalOwner !== normId)) {
              skippedDupes++;
              continue;
            }
          } else {
            updatedExisting++;
          }
          seenSlugs.add(slug);

          const lat = e.address?.latitude ?? null;
          const lng = e.address?.longitude ?? null;
          const county = e.address?.region?.trim() || null;

          rows.push({
            norm_id: normId,
            name,
            slug,
            date_from: dateFrom,
            date_to: dateTo && dateTo !== dateFrom ? dateTo : null,
            date_raw: formatDateRaw(dateFrom),
            date_is_estimated: false,
            town: titleCaseTown(e.address?.city),
            county,
            country: "England",
            region: normaliseRegion(null, county, lat, lng) ?? "England",
            lat: typeof lat === "number" && Number.isFinite(lat) ? lat : null,
            lng: typeof lng === "number" && Number.isFinite(lng) ? lng : null,
            distances: distancesFromRaces(e.races),
            discipline: e.discipline?.name?.trim() || null,
            entry_url: e.registration_url || e.website_url || null,
            organiser_url: e.website_url || null,
            source: SOURCE,
            source_url: `https://www.englandathletics.org/runevents/search/?query=${encodeURIComponent(name)}`,
            status: "ACTIVE",
            sort_date: dateFrom,
            is_upcoming: dateFrom >= todayISO,
          });
        }

        // 5. Upsert in batches
        let written = 0;
        for (let i = 0; i < rows.length; i += 200) {
          const batch = rows.slice(i, i + 200);
          const { data, error } = await supabaseAdmin
            .from("events")
            .upsert(batch, { onConflict: "norm_id" })
            .select("id");
          if (error) {
            return Response.json(
              { error: error.message, writtenBeforeError: written },
              { status: 500 },
            );
          }
          written += data?.length ?? 0;
        }

        return Response.json({
          ok: true,
          fetched: all.length,
          active: active.length,
          written,
          updatedExisting,
          newEvents: written - updatedExisting,
          skippedDupes,
          skippedNoDate,
          failedPages,
        });
      },
    },
  },
});
