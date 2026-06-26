## Confirmed scope

553 upcoming events link to a third-party entry/booking/timing platform as their `entry_url`. ~118 have no organiser-owned fallback and will drop out of discovery entirely; ~435 stay (their `organiser_url` is on the organiser's own site). The Holme Moss case disappears from homepage / region / distance / "other races near you"; its own event page is unchanged.

| Platform | Events | …with no `organiser_url` fallback |
|---|---:|---:|
| eventrac.co.uk (+ subdomains) | 160 | 19 |
| scottishathletics.justgo.com | 98 | **96** |
| englandathletics.sport80.com | 57 | 1 |
| entrycentral.com | 46 | 0 |
| nice-work.org.uk | 40 | 2 |
| raceforlife.cancerresearchuk.org | 37 | 0 |
| evensplits.events | 20 | 0 |
| ukrunningevents.co.uk | 19 | 0 |
| bookitzone.com | 14 | 0 |
| evententry.co.uk | 12 | 0 |
| sientries.co.uk | 12 | 0 |
| runnation.co.uk | 11 | 0 |
| race-nation.co.uk | 10 | 0 |
| racebest.com | 10 | 0 |
| totalracetiming.co.uk | 7 | 0 |

## Approach

### 1. Extend `src/lib/link-trust.ts`

Add an entry-platform host list and a discovery-grade helper. Do **not** change `classifyEventLink`'s existing kinds.

```ts
const ENTRY_PLATFORM_HOSTS = [
  "sientries.co.uk", "eventrac.co.uk", "entrycentral.com", "racebest.com",
  "bookitzone.com", "evententry.co.uk", "evensplits.events", "race-nation.co.uk",
  "runnation.co.uk", "totalracetiming.co.uk", "ukrunningevents.co.uk",
  "nice-work.org.uk", "raceforlife.cancerresearchuk.org",
  "justgo.com",   // scottishathletics.justgo.com and other justgo tenants
  "sport80.com",  // englandathletics.sport80.com and other sport80 tenants
];

export function isEntryPlatformHost(host: string | null): boolean;

/** True iff entry_url OR organiser_url is on the organiser's own site
 *  (not aggregator, not entry platform). Discovery surfaces only. */
export function hasOrganiserOwnedLink(
  entryUrl: string | null | undefined,
  organiserUrl: string | null | undefined,
): boolean;
```

### 2. Apply `hasOrganiserOwnedLink` to every discovery surface

- `src/routes/index.tsx` — `upcomingEvents` and `featuredNearby`.
- `src/components/distance/DistancePage.tsx` and `RegionDistancePage.tsx`.
- `src/routes/running-events.$slug.tsx`, `running-events.$slug_.$distance.tsx`.
- `5k-races.tsx`, `10k-races.tsx`, `half-marathons.tsx`, `marathons.tsx`, `ultra-marathons.tsx`, `trail-running-events.tsx` (most delegate to `DistancePage`; verify per file).
- `src/routes/events.$slug.tsx` — "other races near you" block only. Leave the event's own "Enter now" / "Visit organiser website" untouched.

Filter runs in-memory after the Supabase query.

### Out of scope (this PR)

- Geographic nearby search results, `/search` results, sitemap / indexability, DB cleanup.
- Promoting any host to full aggregator status.

### Verification

- `bun run tsgo` clean.
- Manual spot-check: homepage, `/trail-running-events`, a region page, Holme Moss event page. Confirm Holme Moss is gone from curated lists but its own page still shows "Enter now → sientries".

### Memory updates

1. Update `mem://constraints/scraped-data-trust` with the new "entry-platform" tier and the host list. Add `hasOrganiserOwnedLink` as the canonical discovery filter.
2. Add `mem://backlog/scottish-athletics-organiser-urls`: 96 of 98 scottishathletics.justgo.com upcoming events have no `organiser_url`, so they silently vanish from discovery after this PR. Root cause is in the Scottish Athletics sync, not link-trust — it captures the justgo booking link as `entry_url` but never the host club's website. Future fix: enrich during sync from the SA competition page or by matching club → `scottishathletics.org.uk/clubs` entry. Reference from the index.
