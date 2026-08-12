export type RunThroughEventCandidate = {
  id: string;
  slug: string;
  name: string;
  distances: string | null;
  sourceUrl: string;
};

export type ParsedStravaRoute = {
  providerRouteId: string;
  routeName: string;
  distanceKm: number;
  ascentM: number;
  distanceKey: string | null;
};

const GENERIC_NAME_TOKENS = new Set([
  "runthrough",
  "run",
  "running",
  "race",
  "races",
  "festival",
  "series",
  "chase",
  "sun",
  "moon",
  "park",
  "trail",
  "half",
  "marathon",
  "ultra",
  "junior",
  "juniors",
  "fun",
  "mile",
  "miles",
  "and",
  "the",
  "at",
  "in",
  "5k",
  "10k",
]);

function decodeHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function significantNameTokens(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/\b20\d{2}\b/g, " ")
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 3 && !GENERIC_NAME_TOKENS.has(token)),
  );
}

export function canonicalRunThroughEventUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!/(^|\.)runthrough\.co\.uk$/i.test(url.hostname)) return null;
    const path = url.pathname.replace(/\/+$/, "");
    if (!path.startsWith("/event/") || path === "/event") return null;
    return `https://www.runthrough.co.uk${path}`;
  } catch {
    return null;
  }
}

export function parseRunThroughPage(html: string): {
  eventName: string | null;
  routeIds: string[];
} {
  const heading = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? null;
  const routeIds = [...html.matchAll(/strava-embeds\.com\/route\/(\d+)/gi)].map(
    (match) => match[1],
  );
  return {
    eventName: heading ? decodeHtml(heading) : null,
    routeIds: [...new Set(routeIds)],
  };
}

export function eventMatchesRunThroughPage(eventName: string, pageName: string): boolean {
  const eventTokens = significantNameTokens(eventName);
  const pageTokens = significantNameTokens(pageName);
  if (!eventTokens.size || !pageTokens.size) return false;
  const shared = [...eventTokens].filter((token) => pageTokens.has(token));
  return shared.length >= 1;
}

export function distanceKeyFromText(value: string): string | null {
  const text = value.toLowerCase().replace(/[\u2013\u2014]/g, "-");
  if (/\bhalf[ -]?marathon\b|\b21(?:\.1)?\s*km\b/.test(text)) return "half-marathon";
  if (/\bmarathon\b|\b42(?:\.2)?\s*km\b/.test(text)) return "marathon";
  if (/\b10\s*(?:mile|miles|mi)\b/.test(text)) return "10-mile";
  if (/\b5\s*(?:mile|miles|mi)\b/.test(text)) return "5-mile";
  if (/\b10\s*k(?:m)?\b/.test(text)) return "10k";
  if (/\b5\s*k(?:m)?\b/.test(text)) return "5k";
  if (/\b1\s*(?:mile|miles|mi)\b/.test(text)) return "1-mile";
  return null;
}

export function advertisedDistanceKeys(value: string | null): Set<string> {
  if (!value || /\b(?:various|multiple)\b|\bto\b/i.test(value)) return new Set();
  const keys = new Set<string>();
  for (const part of value.split(/[,|/&]+/)) {
    const key = distanceKeyFromText(part);
    if (key) keys.add(key);
  }
  return keys;
}

export function routeLabel(distanceKey: string): string {
  const labels: Record<string, string> = {
    "5k": "5K",
    "10k": "10K",
    "half-marathon": "Half Marathon",
    marathon: "Marathon",
    "5-mile": "5 Mile",
    "10-mile": "10 Mile",
    "1-mile": "1 Mile",
  };
  return labels[distanceKey] ?? distanceKey;
}

export function parseStravaEmbed(html: string, providerRouteId: string): ParsedStravaRoute | null {
  const title = html.match(/<h1\b[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const stats = [
    ...html.matchAll(
      /<div class="stat-label">(Distance|Elev Gain)<\/div>\s*<div class="stat-value">([^<]+)<\/div>/gi,
    ),
  ];
  if (!title || stats.length < 2) return null;
  const values = new Map(stats.map((match) => [match[1].toLowerCase(), decodeHtml(match[2])]));
  const distanceMatch = values.get("distance")?.match(/([\d.]+)\s*km/i);
  const ascentMatch = values.get("elev gain")?.match(/([\d,.]+)\s*m/i);
  if (!distanceMatch || !ascentMatch) return null;
  const routeName = decodeHtml(title);
  const distanceKm = Number(distanceMatch[1]);
  const ascentM = Number(ascentMatch[1].replace(/,/g, ""));
  if (!Number.isFinite(distanceKm) || !Number.isFinite(ascentM)) return null;
  return {
    providerRouteId,
    routeName,
    distanceKm,
    ascentM,
    distanceKey: distanceKeyFromText(routeName),
  };
}

export function exactRoutesForEvent(
  event: Pick<RunThroughEventCandidate, "distances">,
  routes: ParsedStravaRoute[],
): { publishable: ParsedStravaRoute[]; unresolved: ParsedStravaRoute[] } {
  const advertised = advertisedDistanceKeys(event.distances);
  const eligible = routes.filter(
    (route) => !!route.distanceKey && advertised.has(route.distanceKey),
  );
  const routeCounts = new Map<string, number>();
  for (const route of eligible) {
    routeCounts.set(route.distanceKey!, (routeCounts.get(route.distanceKey!) ?? 0) + 1);
  }
  // Multiple organiser routes carrying the same distance label are ambiguous
  // without more evidence (for example wave, junior or seasonal variants).
  const publishable = eligible.filter((route) => routeCounts.get(route.distanceKey!) === 1);
  const publishedIds = new Set(publishable.map((route) => route.providerRouteId));
  return {
    publishable,
    unresolved: routes.filter((route) => !publishedIds.has(route.providerRouteId)),
  };
}
