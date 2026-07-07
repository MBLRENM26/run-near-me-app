import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Deterministic fuzzy match of events.organiser (and event names carrying
// the club in a suffix, e.g. "Foo 10K - Bar AC") to a canonical row in
// public.clubs. Populates events.organiser_club_id + events.organiser.
//
// Conservative on purpose: exact-normalised-name is the primary path;
// token-set Jaccard is only used when the club has a location match
// (county OR region) with the event. Rejects on ambiguity.

const CLUB_TAIL_TOKENS = new Set([
  "ac",
  "rc",
  "rrc",
  "tc",
  "tri",
  "club",
  "clubs",
  "running",
  "athletic",
  "athletics",
  "harriers",
  "striders",
  "runners",
  "joggers",
  "and",
  "&",
]);

// Sources whose organiser field is either missing (EA) or a free-text
// string that might name a club (runabc). Parkrun/TRA excluded.
const ELIGIBLE_SOURCES = [
  "england-athletics",
  "scottish-athletics",
  "welsh-athletics",
  "ni-athletics",
  "runabc",
];

type ClubRow = {
  id: string;
  name: string;
  county: string | null;
  region: string | null;
};

type ClubIndex = {
  club: ClubRow;
  key: string; // full normalised key
  tokens: Set<string>; // content tokens (tails stripped)
};

function normalise(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function contentTokens(norm: string): Set<string> {
  const toks = norm.split(" ").filter((t) => t && !CLUB_TAIL_TOKENS.has(t));
  return new Set(toks);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function buildClubIndex(clubs: ClubRow[]): ClubIndex[] {
  return clubs.map((c) => {
    const key = normalise(c.name);
    return { club: c, key, tokens: contentTokens(key) };
  });
}

/**
 * Extract candidate organiser strings from an event.
 * Priority order: organiser field, then suffixes/prefixes in name,
 * then the whole name as a last resort.
 */
function candidateStrings(
  organiser: string | null,
  name: string,
): string[] {
  const out: string[] = [];
  const push = (s: string | null | undefined) => {
    const t = s?.trim();
    if (t && t.length >= 3) out.push(t);
  };

  push(organiser);

  // "Foo 10K - Bar AC", "Foo 10K – Bar AC", "Foo 10K: Bar AC"
  const parts = name.split(/\s+[-–—:|]\s+/);
  if (parts.length > 1) {
    // Last chunk is most often the host
    push(parts[parts.length - 1]);
    // First chunk sometimes carries "Club X presents ..."
    push(parts[0].replace(/\bpresents\b/i, "").trim());
  }

  // "Foo 10K (Hosted by Bar AC)" / "(Bar AC)"
  const parenMatches = name.match(/\(([^)]+)\)/g);
  if (parenMatches) {
    for (const m of parenMatches) {
      const inner = m
        .slice(1, -1)
        .replace(/^hosted by\s+/i, "")
        .replace(/^presented by\s+/i, "")
        .replace(/^organised by\s+/i, "")
        .trim();
      push(inner);
    }
  }

  return Array.from(new Set(out));
}

type MatchResult =
  | { kind: "match"; club: ClubRow; via: "exact" | "token" }
  | { kind: "ambiguous" }
  | { kind: "none" };

function matchCandidate(
  candidate: string,
  index: ClubIndex[],
  event: { county: string | null; region: string | null },
): MatchResult {
  const key = normalise(candidate);
  if (!key) return { kind: "none" };
  const tokens = contentTokens(key);

  // 1) Exact normalised name match — high precision, no location gate.
  const exact = index.filter((c) => c.key === key);
  if (exact.length === 1) return { kind: "match", club: exact[0].club, via: "exact" };
  if (exact.length > 1) {
    // Multiple clubs share the exact normalised name — try to disambiguate by location.
    const scoped = exact.filter(
      (c) =>
        (event.county && c.club.county === event.county) ||
        (event.region && c.club.region === event.region),
    );
    if (scoped.length === 1) return { kind: "match", club: scoped[0].club, via: "exact" };
    return { kind: "ambiguous" };
  }

  // 2) Token-set Jaccard, gated on location match.
  if (tokens.size === 0) return { kind: "none" };
  let best: { club: ClubRow; score: number } | null = null;
  let bestCount = 0;
  for (const c of index) {
    if (c.tokens.size === 0) continue;
    const locOk =
      (event.county && c.club.county === event.county) ||
      (event.region && c.club.region === event.region);
    if (!locOk) continue;
    const score = jaccard(tokens, c.tokens);
    if (score >= 0.85) {
      if (!best || score > best.score) {
        best = { club: c.club, score };
        bestCount = 1;
      } else if (score === best.score) {
        bestCount++;
      }
    }
  }
  if (!best) return { kind: "none" };
  if (bestCount > 1) return { kind: "ambiguous" };
  return { kind: "match", club: best.club, via: "token" };
}

export type BackfillOrganiserResult = {
  ok: true;
  scanned: number;
  matched: number;
  exact: number;
  token: number;
  ambiguous: number;
  noMatch: number;
  updateErrors: number;
};

export async function runBackfillOrganiserMatch(opts?: {
  /** Set true to compute matches but not write updates. */
  dryRun?: boolean;
  /** Limit rows scanned (for testing). */
  limit?: number;
}): Promise<BackfillOrganiserResult> {
  const dryRun = opts?.dryRun ?? false;
  const scanLimit = opts?.limit ?? null;

  // Load clubs once.
  const clubs: ClubRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabaseAdmin
      .from("clubs")
      .select("id, name, county, region")
      .eq("status", "ACTIVE")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    clubs.push(...((data ?? []) as ClubRow[]));
    if (!data || data.length < 1000) break;
  }
  const index = buildClubIndex(clubs);

  // Load candidate events: ACTIVE, no club yet, eligible source.
  type EventRow = {
    id: string;
    name: string;
    organiser: string | null;
    county: string | null;
    region: string | null;
  };
  const events: EventRow[] = [];
  for (let from = 0; ; from += 1000) {
    let q = supabaseAdmin
      .from("events")
      .select("id, name, organiser, county, region")
      .eq("status", "ACTIVE")
      .is("organiser_club_id", null)
      .in("source", ELIGIBLE_SOURCES)
      .range(from, from + 999);
    if (scanLimit && from >= scanLimit) break;
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    events.push(...((data ?? []) as EventRow[]));
    if (!data || data.length < 1000) break;
    if (scanLimit && events.length >= scanLimit) break;
  }
  const scanEvents = scanLimit ? events.slice(0, scanLimit) : events;

  let matched = 0;
  let exact = 0;
  let tokenHits = 0;
  let ambiguous = 0;
  let noMatch = 0;
  let updateErrors = 0;

  // Batch updates in small chunks; each update touches one row.
  for (const ev of scanEvents) {
    const candidates = candidateStrings(ev.organiser, ev.name);
    let hit: MatchResult = { kind: "none" };
    for (const cand of candidates) {
      const r = matchCandidate(cand, index, ev);
      if (r.kind === "match") {
        hit = r;
        break;
      }
      if (r.kind === "ambiguous" && hit.kind === "none") {
        hit = r;
      }
    }

    if (hit.kind === "match") {
      matched++;
      if (hit.via === "exact") exact++;
      else tokenHits++;
      if (!dryRun) {
        const { error } = await supabaseAdmin
          .from("events")
          .update({
            organiser_club_id: hit.club.id,
            organiser: hit.club.name,
          })
          .eq("id", ev.id);
        if (error) {
          updateErrors++;
          console.warn("[backfillOrganiserMatch] update failed", ev.id, error.message);
        }
      }
    } else if (hit.kind === "ambiguous") {
      ambiguous++;
    } else {
      noMatch++;
    }
  }

  return {
    ok: true,
    scanned: scanEvents.length,
    matched,
    exact,
    token: tokenHits,
    ambiguous,
    noMatch,
    updateErrors,
  };
}
