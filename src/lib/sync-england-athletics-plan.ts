import type { Database } from "@/integrations/supabase/types";
import { normaliseRegion } from "@/lib/region-normalize";
import { buildSourceEnrichment, type ExistingSourceEnrichment } from "@/lib/source-enrichment";

export type EaRace = {
  name: string | null;
  distance: string | null;
  event_race_distance: { name: string | null } | null;
};

export type EaEvent = {
  id: string;
  type: string;
  status: string;
  licensed: boolean;
  name: string;
  start: string | null;
  end: string | null;
  registration_url: string | null;
  website_url: string | null;
  races: EaRace[] | null;
  address: {
    city: string | null;
    region: string | null;
    postcode: string | null;
    country: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  discipline: { name: string | null } | null;
};

export type ExistingEaRow = ExistingSourceEnrichment & {
  slug: string | null;
  name: string | null;
  date_from: string | null;
  norm_id: string | null;
  source: string | null;
};

export type EnglandAthleticsPlan = {
  rows: Database["public"]["Tables"]["events"]["Insert"][];
  updatedExisting: number;
  newEvents: number;
  skippedDupes: number;
  skippedNoDate: number;
  duplicateFeedIdsDropped: number;
};

const SOURCE = "england-athletics";
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function slugifyEnglandAthletics(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parseEnglandAthleticsDate(raw: string | null | undefined): string | null {
  const match = raw?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

function formatDateRaw(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

function titleCaseTown(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  if (value !== value.toUpperCase()) return value;
  return value
    .toLowerCase()
    .replace(
      /(^|[\s\-'])([a-z])/g,
      (_, separator, character) => separator + character.toUpperCase(),
    );
}

function distancesFromRaces(races: EaRace[] | null | undefined): string | null {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const race of races ?? []) {
    const distance = race.distance?.trim() || race.event_race_distance?.name?.trim();
    if (distance && !seen.has(distance.toLowerCase())) {
      seen.add(distance.toLowerCase());
      output.push(distance);
    }
  }
  return output.length ? output.join(", ") : null;
}

export function planEnglandAthleticsBatch(input: {
  events: EaEvent[];
  existingRows: ExistingEaRow[];
  todayISO: string;
}): EnglandAthleticsPlan {
  const { events, existingRows, todayISO } = input;
  const slugByNormId = new Map(existingRows.map((row) => [row.norm_id, row.slug]));
  const existingByNormId = new Map(
    existingRows
      .filter((row): row is ExistingEaRow & { norm_id: string } => !!row.norm_id)
      .map((row) => [row.norm_id, row]),
  );
  const slugOwners = new Map(existingRows.map((row) => [row.slug, row.norm_id]));
  const otherSourceNameDate = new Set(
    existingRows
      .filter((row) => row.source !== SOURCE)
      .map((row) => `${(row.name ?? "").toLowerCase().trim()}|${row.date_from ?? ""}`),
  );
  const seenSlugs = new Set<string>();
  const seenNormIds = new Set<string>();
  const rows: EnglandAthleticsPlan["rows"] = [];
  let updatedExisting = 0;
  let skippedDupes = 0;
  let skippedNoDate = 0;
  let duplicateFeedIdsDropped = 0;

  for (const event of events) {
    const normId = `ea-${event.id}`;
    if (seenNormIds.has(normId)) {
      duplicateFeedIdsDropped++;
      continue;
    }
    seenNormIds.add(normId);
    const name = event.name.trim();
    const dateFrom = parseEnglandAthleticsDate(event.start);
    const dateTo = parseEnglandAthleticsDate(event.end);
    if (!dateFrom) {
      skippedNoDate++;
      continue;
    }

    const isExisting = slugByNormId.has(normId);
    if (!isExisting && otherSourceNameDate.has(`${name.toLowerCase()}|${dateFrom}`)) {
      skippedDupes++;
      continue;
    }

    let slug = slugByNormId.get(normId) ?? null;
    if (!slug) {
      slug = slugifyEnglandAthletics(name);
      const owner = slugOwners.get(slug);
      if ((owner && owner !== normId) || seenSlugs.has(slug)) slug = `${slug}-${dateFrom}`;
      const finalOwner = slugOwners.get(slug);
      if (seenSlugs.has(slug) || (finalOwner && finalOwner !== normId)) {
        skippedDupes++;
        continue;
      }
    } else {
      updatedExisting++;
    }
    seenSlugs.add(slug);

    const latitude = event.address?.latitude ?? null;
    const longitude = event.address?.longitude ?? null;
    const county = event.address?.region?.trim() || null;
    const distances = distancesFromRaces(event.races);
    const incomingCoordinates =
      typeof latitude === "number" &&
      Number.isFinite(latitude) &&
      typeof longitude === "number" &&
      Number.isFinite(longitude)
        ? { lat: latitude, lng: longitude }
        : null;
    const enrichment = buildSourceEnrichment({
      name,
      distances,
      discipline: event.discipline?.name,
      governance: "england_athletics",
      coordinates: incomingCoordinates,
      existing: existingByNormId.get(normId),
    });
    rows.push({
      norm_id: normId,
      name,
      slug,
      date_from: dateFrom,
      date_to: dateTo && dateTo !== dateFrom ? dateTo : null,
      date_raw: formatDateRaw(dateFrom),
      date_is_estimated: false,
      town: titleCaseTown(event.address?.city),
      county,
      country: "England",
      region: normaliseRegion(null, county, latitude, longitude) ?? "England",
      lat: enrichment.lat,
      lng: enrichment.lng,
      distances,
      distance_tags: enrichment.distance_tags,
      terrain_tags: enrichment.terrain_tags,
      discipline: event.discipline?.name?.trim() || null,
      entry_url: event.registration_url || event.website_url || null,
      organiser_url: event.website_url || null,
      source: SOURCE,
      source_url: `https://www.englandathletics.org/runevents/search/?query=${encodeURIComponent(name)}`,
      governance: enrichment.governance,
      race_profile: enrichment.race_profile,
      status: "ACTIVE",
      sort_date: dateFrom,
      is_upcoming: dateFrom >= todayISO,
    });
  }

  return {
    rows,
    updatedExisting,
    newEvents: rows.length - updatedExisting,
    skippedDupes,
    skippedNoDate,
    duplicateFeedIdsDropped,
  };
}
