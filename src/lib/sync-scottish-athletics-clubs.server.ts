import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { startSyncRun } from "@/lib/sync-run-log.server";

// Pulls Scottish Athletics affiliated clubs from the JustGo
// CoachAndClubFinder widget (same backend the events sync already uses)
// and upserts them into the clubs table. Powers organiser_url enrichment
// for Scottish events whose only entry link is on scottishathletics.justgo.com.

const JUSTGO_URL =
  "https://scottishathletics.justgo.com/WidgetService.mvc/ExecuteWidgetCommandAlt";
const WEBLET_ID = "64728f3b-1e94-44fc-8217-e70f15955657";
const PAGE_SIZE = 100;
const MAX_PAGES = 5; // 139 clubs today; ample headroom
const SOURCE = "scottish-athletics";

type ClubListRow = {
  DocId: number;
  SyncGuid: string;
  Name: string;
  ClubId?: string | null;
  EmailAddress?: string | null;
  PhoneNumber?: string | null;
  Address?: {
    Town?: string | null;
    Postcode?: string | null;
    County?: string | null;
    Country?: string | null;
  };
  Latlng?: { Lat?: string | null; Lng?: string | null };
};

type ClubDetail = ClubListRow & {
  Website?: string | null;
  SocialMediaInfo?: Record<string, string | null> | null;
  // Field 779 = region (East/West/North), 733 = disciplines
  [field: string]: unknown;
};

export type ScottishAthleticsClubsSyncResult = {
  ok: true;
  fetched: number;
  written: number;
  newClubs: number;
  updatedExisting: number;
  withWebsite: number;
  skippedNoName: number;
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// JustGo's Website field comes through as bare hosts ("AberdeenAAC.co.uk"),
// sometimes with scheme, sometimes with trailing slash, sometimes garbage.
// Return null if it doesn't plausibly look like a URL.
function normaliseWebsite(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let v = raw.trim();
  if (!v) return null;
  if (/\s/.test(v)) return null;
  if (!v.includes(".")) return null;
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  try {
    const u = new URL(v);
    if (!u.hostname.includes(".")) return null;
    u.hostname = u.hostname.toLowerCase();
    let out = u.toString();
    if (out.endsWith("/") && u.pathname === "/") out = out.slice(0, -1);
    return out;
  } catch {
    return null;
  }
}

async function widgetCall<T>(args: unknown[]): Promise<T> {
  const body = {
    payload: {
      commands: [
        {
          Id: 1,
          Service: "GDE",
          Method: "FetchObjectsPublic",
          Arguments: args,
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
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`JustGo API returned ${res.status}`);
  const json = (await res.json()) as Array<{
    IsSuccess: boolean;
    Result: { Success: boolean; Result: T };
  }>;
  return json[0]?.Result?.Result as T;
}

async function fetchClubsPage(page: number): Promise<ClubListRow[]> {
  const out = await widgetCall<{ Data?: ClubListRow[] }>([
    "Weblet",
    {
      Area: "Club",
      Method: "GetFilterData",
      WebletId: WEBLET_ID,
      Distance: "",
      DistanceUnit: "Mile",
      SortBy: "relevant",
      Latlng: "",
      OrderBy: "asc",
      PageNumber: page,
      NumberOfRows: PAGE_SIZE,
      KeySearch: "",
    },
  ]);
  return out?.Data ?? [];
}

async function fetchClubDetail(syncGuid: string): Promise<ClubDetail | null> {
  const out = await widgetCall<ClubDetail>([
    "Weblet",
    {
      Area: "Club",
      Method: "GetDetails",
      WebletId: WEBLET_ID,
      SyncGuid: syncGuid,
    },
  ]);
  return out ?? null;
}

function pickRegion(detail: ClubDetail): string {
  // JustGo stores the region as the Value array on field 779 (East/West/North).
  const field = detail["779"] as { Value?: unknown } | undefined;
  if (field && Array.isArray(field.Value) && field.Value.length > 0) {
    return `Scotland (${String(field.Value[0])})`;
  }
  return "Scotland";
}

export async function runScottishAthleticsClubsSync(): Promise<ScottishAthleticsClubsSyncResult> {
  const run = await startSyncRun("scottish-athletics-clubs");

  try {
    // 1. List
    const all: ClubListRow[] = [];
    for (let p = 1; p <= MAX_PAGES; p++) {
      const page = await fetchClubsPage(p);
      all.push(...page);
      if (page.length < PAGE_SIZE) break;
    }

    // 2. Existing slug ownership (collision-safe upsert by norm_id)
    const { data: existing, error: exErr } = await supabaseAdmin
      .from("clubs")
      .select("slug, norm_id");
    if (exErr) {
      await run.finish({
        status: "error",
        error_message: exErr.message,
        fetched: all.length,
      });
      throw new Error(exErr.message);
    }
    const slugOwner = new Map(
      (existing ?? []).map((c) => [c.slug, c.norm_id]),
    );
    const existingNormIds = new Set(
      (existing ?? []).map((c) => c.norm_id).filter(Boolean) as string[],
    );

    // 3. Detail (parallel, bounded concurrency) + upsert.
    // Cloudflare Workers kill the invocation when the response is sent, so
    // we MUST finish inside the triggerSyncRun ACK window (8s). 140 sequential
    // GetDetails calls would blow past that; batch them instead.
    type ClubInsert =
      import("@/integrations/supabase/types").Database["public"]["Tables"]["clubs"]["Insert"];
    const rows: ClubInsert[] = [];
    const seenSlugs = new Set<string>();
    let skippedNoName = 0;
    let newClubs = 0;
    let updatedExisting = 0;
    let withWebsite = 0;

    const CONCURRENCY = 12;
    const details = new Array<ClubDetail | null>(all.length);
    for (let i = 0; i < all.length; i += CONCURRENCY) {
      const batch = all.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        batch.map((c) => fetchClubDetail(c.SyncGuid).catch(() => null)),
      );
      for (let j = 0; j < results.length; j++) details[i + j] = results[j];
    }

    for (let i = 0; i < all.length; i++) {
      const club = all[i];
      const detail = details[i];
      const name = club.Name?.trim();
      if (!name) {
        skippedNoName++;
        continue;
      }

      const baseSlug = slugify(name);

      let slug = baseSlug;
      const normId = `scottishathletics-${baseSlug}`;
      const owner = slugOwner.get(slug);
      if ((owner && owner !== normId) || seenSlugs.has(slug)) {
        slug = `${baseSlug}-scotland`;
      }
      if (seenSlugs.has(slug)) continue;
      seenSlugs.add(slug);
      const finalNormId = `scottishathletics-${baseSlug}`;

      const lat = club.Latlng?.Lat ? Number(club.Latlng.Lat) : null;
      const lng = club.Latlng?.Lng ? Number(club.Latlng.Lng) : null;
      const website = normaliseWebsite(detail?.Website);
      if (website) withWebsite++;

      if (existingNormIds.has(finalNormId)) updatedExisting++;
      else newClubs++;

      rows.push({
        norm_id: finalNormId,
        slug,
        name,
        governing_body: "scottish-athletics",
        affiliation_number: club.ClubId ?? null,
        town: club.Address?.Town?.trim() || null,
        county: club.Address?.County?.trim() || null,
        region: detail ? pickRegion(detail) : "Scotland",
        country: "Scotland",
        postcode: club.Address?.Postcode?.trim() || null,
        lat: lat !== null && Number.isFinite(lat) ? lat : null,
        lng: lng !== null && Number.isFinite(lng) ? lng : null,
        website_url: website,
        contact_email: club.EmailAddress?.trim() || null,
        contact_phone: club.PhoneNumber?.trim() || null,
        status: "ACTIVE",
        source: SOURCE,
        source_url: `https://www.scottishathletics.org.uk/clubs/club-finder/`,
      });
    }

    const { data, error } = await supabaseAdmin
      .from("clubs")
      .upsert(rows, { onConflict: "norm_id" })
      .select("id");
    if (error) {
      await run.finish({
        status: "error",
        error_message: error.message,
        fetched: all.length,
        active: rows.length,
      });
      throw new Error(error.message);
    }

    const written = data?.length ?? 0;
    await run.finish({
      status: "success",
      fetched: all.length,
      active: rows.length,
      written,
      new_events: newClubs,
      updated_existing: updatedExisting,
      skipped_no_date: skippedNoName,
    });

    return {
      ok: true,
      fetched: all.length,
      written,
      newClubs,
      updatedExisting,
      withWebsite,
      skippedNoName,
    };
  } catch (err) {
    await run
      .finish({
        status: "error",
        error_message: err instanceof Error ? err.message : String(err),
      })
      .catch(() => undefined);
    throw err;
  }
}

// Build a slugified-name → website_url map for the events sync to consult
// at import time. Exported so sync-scottish-athletics.server.ts can reuse it.
export async function loadScottishClubWebsiteMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const { data, error } = await supabaseAdmin
    .from("clubs")
    .select("name, website_url")
    .eq("source", SOURCE)
    .not("website_url", "is", null);
  if (error) throw new Error(error.message);
  for (const c of data ?? []) {
    if (c.name && c.website_url) {
      map.set(slugify(c.name), c.website_url);
    }
  }
  return map;
}

export { slugify as slugifyForScottishClubMatch };
