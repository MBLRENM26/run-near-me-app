import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { startSyncRun } from "@/lib/sync-run-log.server";

// Syncs running events from the Scottish Athletics public event browser
// (JustGo widget API) into the events table. Idempotent: upserts on norm_id
// and skips events that already exist from another source (same name+date
// or same slug).

const JUSTGO_URL =
  "https://scottishathletics.justgo.com/WidgetService.mvc/ExecuteWidgetCommandAlt";
const WEBLET_ID = "64728f3b-1e94-44fc-8217-e70f15957999";
const PAGE_SIZE = 50;
const MAX_PAGES = 10;

const INCLUDED_CATEGORIES = new Set([
  "Road Race / Multi Terrain",
  "Trail Race / Ultra Distance",
  "Hill Running",
  "Cross Country",
]);

type JustGoEvent = {
  DocId: number;
  EventName: string;
  EventCategory: string;
  Directlink: string;
  Address: {
    Town: string | null;
    County: string | null;
    Postcode: string | null;
    Country: string | null;
  };
  Latlng: { Lat: string; Lng: string };
  EntityInfo: { Name: string | null };
  Starts: { Date: string | null };
  Ends: { Date: string | null };
  PriceSettings: { DisplayPrice: string | null };
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Parse JustGo "Date(2026,5,10)" (month is 0-based) → "2026-06-10". */
function parseJustGoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.match(/Date\((\d{4}),(\d{1,2}),(\d{1,2})\)/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) + 1;
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDateRaw(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** Strip trailing licence reference like " : ES015141" from event names. */
function cleanName(name: string): string {
  return name.replace(/\s*:\s*ES\d+\s*$/i, "").trim();
}

function distancesFromName(name: string): string | null {
  const n = name.toLowerCase();
  if (/\bultra\b/.test(n)) return "Ultra";
  if (/half[\s-]?marathon|\bhalf\b/.test(n)) return "Half Marathon";
  if (/\bmarathon\b/.test(n)) return "Marathon";
  const km = n.match(/\b(\d{1,3}(?:\.\d)?)\s?k(m)?\b/);
  if (km) return `${km[1]}K`;
  const miles = n.match(/\b(\d{1,3}(?:\.\d)?)\s?miles?\b/);
  if (miles) return `${miles[1]} miles`;
  return null;
}

async function fetchPage(pageNumber: number): Promise<JustGoEvent[]> {
  const body = {
    payload: {
      commands: [
        {
          Id: 1,
          Service: "GDE",
          Method: "FetchObjectsPublic",
          Arguments: [
            "Event",
            {
              Method: "FindEvents",
              key: "",
              Categories: {},
              Provider: [],
              OrderBy: "asc",
              SortBy: "date",
              PageNumber: pageNumber,
              NumberOfRows: PAGE_SIZE,
              IsShop: false,
              InstallmentAvailable: false,
              Country: "",
              County: [],
              WebletId: WEBLET_ID,
            },
          ],
        },
      ],
    },
    paths: ["commands"],
  };

  const res = await fetch(JUSTGO_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`JustGo API returned ${res.status}`);
  const json = (await res.json()) as Array<{
    IsSuccess: boolean;
    Result: { Result: { Data: JustGoEvent[] } };
  }>;
  return json[0]?.Result?.Result?.Data ?? [];
}

export const Route = createFileRoute("/api/public/admin/sync-scottish-athletics")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.IMPORT_SECRET;
        if (!expected) {
          return Response.json({ error: "Server not configured" }, { status: 500 });
        }
        const provided = request.headers.get("x-admin-secret");
        let authorized = false;
        if (provided) {
          const a = Buffer.from(provided);
          const b = Buffer.from(expected);
          if (a.length === b.length) {
            try { authorized = timingSafeEqual(a, b); } catch { authorized = false; }
          }
        }
        if (!authorized) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Fetch all pages from JustGo
        const all: JustGoEvent[] = [];
        for (let p = 1; p <= MAX_PAGES; p++) {
          const page = await fetchPage(p);
          all.push(...page);
          if (page.length < PAGE_SIZE) break;
        }

        // 2. Keep running events only
        const running = all.filter((e) =>
          INCLUDED_CATEGORIES.has(e.EventCategory),
        );

        // 3. Existing-event dedupe sets (avoid duplicating other sources)
        const { data: existing, error: exErr } = await supabaseAdmin
          .from("events")
          .select("slug, name, date_from, norm_id")
          .eq("status", "ACTIVE")
          .or("region.eq.Scotland,country.eq.Scotland");
        if (exErr) {
          return Response.json({ error: exErr.message }, { status: 500 });
        }
        const existingSlugs = new Map(
          (existing ?? []).map((e) => [e.slug, e.norm_id]),
        );
        const existingNameDate = new Set(
          (existing ?? []).map(
            (e) => `${(e.name ?? "").toLowerCase().trim()}|${e.date_from ?? ""}`,
          ),
        );

        // 4. Map to event rows
        const todayISO = new Date().toISOString().slice(0, 10);
        const seenSlugs = new Set<string>();
        type EventInsert =
          import("@/integrations/supabase/types").Database["public"]["Tables"]["events"]["Insert"];
        const rows: EventInsert[] = [];
        let skippedDupes = 0;
        let skippedNoDate = 0;

        for (const e of running) {
          const name = cleanName(e.EventName);
          const dateFrom = parseJustGoDate(e.Starts?.Date);
          const dateTo = parseJustGoDate(e.Ends?.Date);
          if (!name || !dateFrom) {
            skippedNoDate++;
            continue;
          }

          // Skip if an event with the same name+date already exists from
          // another source
          const key = `${name.toLowerCase()}|${dateFrom}`;
          if (existingNameDate.has(key)) {
            skippedDupes++;
            continue;
          }

          let slug = slugify(name);
          const normId = `scottishathletics-${slug}`;
          // Slug owned by a different source / different event → disambiguate
          const owner = existingSlugs.get(slug);
          if ((owner && owner !== normId) || seenSlugs.has(slug)) {
            slug = `${slug}-${dateFrom}`;
          }
          if (seenSlugs.has(slug)) {
            skippedDupes++;
            continue;
          }
          seenSlugs.add(slug);

          const lat = e.Latlng?.Lat ? Number(e.Latlng.Lat) : null;
          const lng = e.Latlng?.Lng ? Number(e.Latlng.Lng) : null;

          rows.push({
            norm_id: `scottishathletics-${slug}`,
            name,
            slug,
            date_from: dateFrom,
            date_to: dateTo && dateTo !== dateFrom ? dateTo : null,
            date_raw: formatDateRaw(dateFrom),
            date_is_estimated: false,
            town: e.Address?.Town?.trim() || null,
            county: e.Address?.County?.trim() || null,
            country: "Scotland",
            region: "Scotland",
            lat: Number.isFinite(lat) ? lat : null,
            lng: Number.isFinite(lng) ? lng : null,
            distances: distancesFromName(name),
            discipline: e.EventCategory,
            entry_url: e.Directlink || null,
            organiser: e.EntityInfo?.Name?.trim() || null,
            entry_fee: e.PriceSettings?.DisplayPrice?.trim() || null,
            source: "scottishathletics",
            source_url: e.Directlink || null,
            status: "ACTIVE",
            sort_date: dateFrom,
            is_upcoming: dateFrom >= todayISO,
          });
        }

        // 5. Upsert
        const { data, error } = await supabaseAdmin
          .from("events")
          .upsert(rows, { onConflict: "norm_id" })
          .select("id");
        if (error) {
          return Response.json({ error: error.message }, { status: 500 });
        }

        return Response.json({
          ok: true,
          fetched: all.length,
          running: running.length,
          written: data?.length ?? 0,
          skippedDupes,
          skippedNoDate,
        });
      },
    },
  },
});
