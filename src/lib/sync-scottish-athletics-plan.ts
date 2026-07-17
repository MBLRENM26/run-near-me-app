// Pure planning logic for the Scottish Athletics sync. Given the incoming
// JustGo records plus a snapshot of existing DB state, produces the exact
// rows to upsert — or throws with a diagnostic message when the batch
// cannot be safely upserted.
//
// Split into a standalone module so unit tests can drive it without
// touching Supabase.

import type { Database } from "@/integrations/supabase/types";

export type JustGoEvent = {
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

export type ExistingSaRow = {
  slug: string | null;
  name: string | null;
  date_from: string | null;
  norm_id: string | null;
  source: string | null;
  source_url: string | null;
};

export type EventInsert =
  Database["public"]["Tables"]["events"]["Insert"];

export type PlanStats = {
  skippedDupes: number;
  skippedNoDate: number;
  newEvents: number;
  updatedExisting: number;
  duplicateRefsDropped: number;
  sharedRefSkipped: number;
};

export type PlanResult = {
  rows: EventInsert[];
  stats: PlanStats;
  warnings: string[];
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function parseJustGoRef(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/ref=([0-9A-Fa-f]{40})/);
  return m ? m[1].toUpperCase() : null;
}

export function parseJustGoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.match(/Date\((\d{4}),(\d{1,2}),(\d{1,2})\)/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) + 1;
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function cleanName(name: string): string {
  return name.replace(/\s*:\s*ES\d+\s*$/i, "").trim();
}

export function formatDateRaw(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function distancesFromName(name: string): string | null {
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

function buildRow(
  e: JustGoEvent,
  slug: string,
  normId: string,
  clubWebsiteMap: Map<string, string>,
  todayISO: string,
): EventInsert {
  const name = cleanName(e.EventName);
  const dateFrom = parseJustGoDate(e.Starts?.Date)!;
  const dateTo = parseJustGoDate(e.Ends?.Date);
  const lat = e.Latlng?.Lat ? Number(e.Latlng.Lat) : null;
  const lng = e.Latlng?.Lng ? Number(e.Latlng.Lng) : null;
  const organiser = e.EntityInfo?.Name?.trim() || null;
  const organiserUrl = organiser
    ? clubWebsiteMap.get(slugify(organiser)) ?? null
    : null;
  return {
    norm_id: normId,
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
    lat: lat !== null && Number.isFinite(lat) ? lat : null,
    lng: lng !== null && Number.isFinite(lng) ? lng : null,
    distances: distancesFromName(name),
    discipline: e.EventCategory,
    entry_url: e.Directlink || null,
    organiser,
    organiser_url: organiserUrl,
    entry_fee: e.PriceSettings?.DisplayPrice?.trim() || null,
    source: "scottishathletics",
    source_url: e.Directlink || null,
    governance: "scottish_athletics",
    status: "ACTIVE",
    sort_date: dateFrom,
    is_upcoming: dateFrom >= todayISO,
  };
}

export function planScottishAthleticsBatch(input: {
  records: JustGoEvent[];
  existingRows: ExistingSaRow[];
  globalSlugOwners: Map<string, string | null>;
  clubWebsiteMap?: Map<string, string>;
  todayISO: string;
}): PlanResult {
  const {
    records,
    existingRows,
    globalSlugOwners,
    clubWebsiteMap = new Map<string, string>(),
    todayISO,
  } = input;

  const warnings: string[] = [];

  // --- Index existing Scotland rows ---------------------------------------
  const existingNormIds = new Set(
    existingRows.map((e) => e.norm_id).filter(Boolean) as string[],
  );
  // Name+date → source of the existing row. Cross-source dedupe only
  // kicks in when the collision is against a different source.
  const existingNameDateSource = new Map<string, string | null>(
    existingRows.map((e) => [
      `${(e.name ?? "").toLowerCase().trim()}|${e.date_from ?? ""}`,
      e.source ?? null,
    ]),
  );
  // norm_id → existing slug (used only in the non-collision size-1 path
  // to preserve canonical URLs on refresh).
  const existingSlugByNormId = new Map<string, string>(
    existingRows
      .filter((e) => e.norm_id && e.slug)
      .map((e) => [e.norm_id as string, e.slug as string]),
  );
  // ref → list of existing rows carrying that ref. Multi-valued because
  // known legacy duplicates have the same JustGo ref on two DB rows.
  const existingByRef = new Map<
    string,
    Array<{ slug: string; norm_id: string }>
  >();
  for (const e of existingRows) {
    const ref = parseJustGoRef(e.source_url);
    if (!ref || !e.slug || !e.norm_id) continue;
    const arr = existingByRef.get(ref) ?? [];
    arr.push({ slug: e.slug, norm_id: e.norm_id });
    existingByRef.set(ref, arr);
  }

  const stats: PlanStats = {
    skippedDupes: 0,
    skippedNoDate: 0,
    newEvents: 0,
    updatedExisting: 0,
    duplicateRefsDropped: 0,
    sharedRefSkipped: 0,
  };

  // --- 1) Drop exact-ref duplicates in the incoming feed ------------------
  // Keep first occurrence per ref. Records with no parseable ref pass
  // through untouched (they'll be handled per-group below).
  const seenRefs = new Set<string>();
  const dedupedFeed: JustGoEvent[] = [];
  for (const e of records) {
    const ref = parseJustGoRef(e.Directlink);
    if (!ref) {
      dedupedFeed.push(e);
      continue;
    }
    if (seenRefs.has(ref)) {
      stats.duplicateRefsDropped++;
      warnings.push(`duplicate ref ${ref} dropped from feed`);
      continue;
    }
    seenRefs.add(ref);
    dedupedFeed.push(e);
  }

  // --- 2) Group by (lowercased-cleaned-name, dateFrom) --------------------
  type Groupable = { event: JustGoEvent; name: string; dateFrom: string };
  const groups = new Map<string, Groupable[]>();
  for (const e of dedupedFeed) {
    const name = cleanName(e.EventName);
    const dateFrom = parseJustGoDate(e.Starts?.Date);
    if (!name || !dateFrom) {
      stats.skippedNoDate++;
      continue;
    }
    const key = `${name.toLowerCase()}|${dateFrom}`;
    const arr = groups.get(key) ?? [];
    arr.push({ event: e, name, dateFrom });
    groups.set(key, arr);
  }

  const rows: EventInsert[] = [];
  const seenSlugsInBatch = new Set<string>();

  const pushRow = (r: EventInsert) => {
    if (existingNormIds.has(r.norm_id as string)) stats.updatedExisting++;
    else stats.newEvents++;
    rows.push(r);
    seenSlugsInBatch.add(r.slug as string);
  };

  // --- 3) Resolve each group ---------------------------------------------
  for (const [key, group] of groups) {
    // Cross-source dedupe: never overwrite a row owned by another source.
    const collidingSource = existingNameDateSource.get(key);
    if (
      collidingSource !== undefined &&
      collidingSource !== "scottishathletics"
    ) {
      stats.skippedDupes += group.length;
      continue;
    }

    if (group.length >= 2) {
      // Collision group. Amendment 1: every member MUST carry a parseable
      // ref, otherwise we cannot deterministically identify which incoming
      // record maps to which DB row — fail loud, do not upsert anything.
      const missingRef = group.filter((g) => !parseJustGoRef(g.event.Directlink));
      if (missingRef.length > 0) {
        throw new Error(
          `Scottish Athletics sync: collision group "${key}" contains ${missingRef.length} record(s) with no parseable JustGo ref; refusing to upsert. Names: ${missingRef.map((m) => m.event.EventName).join(" | ")}`,
        );
      }

      // Ref-sorted for deterministic output regardless of feed order.
      const sorted = [...group].sort((a, b) =>
        parseJustGoRef(a.event.Directlink)!.localeCompare(
          parseJustGoRef(b.event.Directlink)!,
        ),
      );

      for (const g of sorted) {
        const ref = parseJustGoRef(g.event.Directlink)!;
        const existingForRef = existingByRef.get(ref) ?? [];

        if (existingForRef.length >= 2) {
          // Amendment 2: shared legacy ref → do not pick one arbitrarily,
          // do not alter either row in this patch. Skip this record.
          stats.sharedRefSkipped++;
          warnings.push(
            `ref ${ref} has ${existingForRef.length} existing rows; skipping (legacy shared-ref cleanup pending)`,
          );
          continue;
        }

        let slug: string;
        let normId: string;
        if (existingForRef.length === 1) {
          // Preserve the existing row's public identity.
          slug = existingForRef[0].slug;
          normId = existingForRef[0].norm_id;
        } else {
          // Genuinely new collision-group member — deterministic
          // ref-derived slug that is independent of feed order.
          const baseSlug = slugify(g.name);
          slug = `${baseSlug}-r${ref.slice(0, 8).toLowerCase()}`;
          normId = `scottishathletics-${slug}`;
        }
        rows.push(
          buildRow(g.event, slug, normId, clubWebsiteMap, todayISO),
        );
        if (existingNormIds.has(normId)) stats.updatedExisting++;
        else stats.newEvents++;
        seenSlugsInBatch.add(slug);
      }
      continue;
    }

    // Size-1 group — retain existing behaviour, plus the shared-ref guard.
    const g = group[0];
    const e = g.event;
    const ref = parseJustGoRef(e.Directlink);
    if (ref && (existingByRef.get(ref)?.length ?? 0) >= 2) {
      // Amendment 2 also applies outside collision groups: never touch a
      // record whose ref maps to two DB rows.
      stats.sharedRefSkipped++;
      warnings.push(
        `ref ${ref} has ${existingByRef.get(ref)!.length} existing rows; skipping (legacy shared-ref cleanup pending)`,
      );
      continue;
    }

    const baseSlug = slugify(g.name);
    const baseNormId = `scottishathletics-${baseSlug}`;

    // If a Scottish row with this norm_id already exists, pin the slug to
    // the existing value so upsert doesn't rewrite the canonical URL.
    const pinnedSlug = existingSlugByNormId.get(baseNormId);
    let slug: string;
    if (pinnedSlug) {
      slug = pinnedSlug;
    } else {
      slug = baseSlug;
      const baseOwner = globalSlugOwners.get(baseSlug);
      if (
        (baseOwner && baseOwner !== baseNormId) ||
        seenSlugsInBatch.has(baseSlug)
      ) {
        slug = `${baseSlug}-${g.dateFrom}`;
      }
      let suffix = 2;
      while (true) {
        const owner = globalSlugOwners.get(slug);
        const candidateNormId = `scottishathletics-${slug}`;
        if (
          !seenSlugsInBatch.has(slug) &&
          (!owner || owner === candidateNormId)
        ) {
          break;
        }
        slug = `${baseSlug}-${g.dateFrom}-${suffix++}`;
        if (suffix > 20) break;
      }
    }
    const finalNormId = `scottishathletics-${slug}`;
    pushRow(buildRow(e, slug, finalNormId, clubWebsiteMap, todayISO));
  }

  // --- 4) Loud pre-upsert assertions --------------------------------------
  // Silent collapse removed: any residual collision must fail visibly.
  const slugCounts = new Map<string, number>();
  const normIdCounts = new Map<string, number>();
  for (const r of rows) {
    slugCounts.set(
      r.slug as string,
      (slugCounts.get(r.slug as string) ?? 0) + 1,
    );
    normIdCounts.set(
      r.norm_id as string,
      (normIdCounts.get(r.norm_id as string) ?? 0) + 1,
    );
  }
  for (const [slug, n] of slugCounts) {
    if (n > 1) {
      throw new Error(
        `Scottish Athletics sync: slug collision pre-upsert: "${slug}" appears ${n} times`,
      );
    }
  }
  for (const [normId, n] of normIdCounts) {
    if (n > 1) {
      throw new Error(
        `Scottish Athletics sync: norm_id collision pre-upsert: "${normId}" appears ${n} times`,
      );
    }
  }

  return { rows, stats, warnings };
}
