# Showcase Occurrence Metadata Audit (read-only)

Evidence gathered from the production-connected database and current head. No code, data, schema, docs or deployment was changed.

Sources inspected: `public.events`, `public.event_course_sources`, `public.clubs` (1,638 rows), `src/lib/events.functions.ts` (`getEventPageData`, lines 673-1260), `src/routes/events.$slug.tsx`, `src/lib/pilot-destinations.ts`, `src/components/events/{TrustProfileStrip,DestinationPanel,CourseIntelligence}.tsx`, `src/lib/{event-description,course-profile,event-ctas,link-trust}.ts`.

## 1. FNUL — `2eda5231…` (`/events/friday-night-under-the-lights-race-series-26`)

| Layer | Value |
| --- | --- |
| Stored public | name `Friday Night Under the Lights Race Series 26`; `date_raw` 11 September 2026, `date_from` 2026-09-11, not estimated; town `London`, county `London`, region `London`, country England; lat/lng 51.4793238 / -0.1581354; `distances` `5 km`, `discipline` `Road Race`, `distance_tags [5k]`, `terrain_tags [road]`, `race_profile road_race`; organiser `Friday Night Under the Lights 5K`, `organiser_type unknown`, `organiser_club_id NULL`; `governance england_athletics`, `licensed NULL`; `entry_url` OpenTrack occurrence, `organiser_url` FNUL homepage; `entry_fee NULL`; `is_recurring true`, `series_key friday-night-under-the-lights-race-series-26-london`; `location_raw NULL`; no description column exists |
| Stored private | `source england-athletics`, `source_url` EA search URL — read in the handler for pilot verification, stripped before the payload; never propose for public rendering |
| Related rows | no `event_course_sources` rows; no club link; `series_key` present but unused by any surface |
| Sent to renderer | full `EventDetail` minus lat/lng/tags-internal/status/source fields, `related`, `sameTown`, `sameWeekendNearby`, `matchingClub` (null), `otherRacesByOrganiser`, `courseProfile` (null), 2 reviewed `destinations`, `indexability` |
| Rendered | date, `London, London`, `5 km`, Road terrain chip, badges England Athletics + Road race (organiser_type `unknown` suppressed), `Organised by: Friday Night Under the Lights 5K` (unlinked), 2-button signpost, generic About paragraph, no course area |

Battersea Park: **not stored anywhere.** No venue/location column holds it (`location_raw NULL`); the only internal signal is the coordinate pair, which falls inside Battersea Park. There is no venue field in `public.events` at all — venue and town are currently the same slot, and town is `London`. Battersea Park is therefore external evidence only.

## 2. Rubber Ducky — `7a2160ea…` (`/events/the-rubber-ducky-waddle-tra`)

| Layer | Value |
| --- | --- |
| Stored public | name `The Rubber Ducky Waddle`; 13 September 2026 (`date_from`=`date_to`), not estimated; town `NULL`, county `NULL`, region `London`, country `United Kingdom`, `location_raw` `Clarence Street, Surrey, England`; lat/lng 51.4337732 / -0.5142988; `distances` empty string, `distance_tags []`, `discipline Trail Race`, `terrain_tags [trail]`, `race_profile trail_race`; organiser `NULL`, `organiser_type unknown`, `organiser_club_id NULL`; `governance tra`, `licensed 'true'`; `entry_url` empty, `organiser_url` = TRA record; `entry_fee £33` (never rendered by policy) |
| Stored private | `source tra`, `source_url` TRA record — the TRA record is also the one reviewed public licence destination |
| Related rows | none (no course rows, no club, no series) |
| Only in reviewed manifest / external | Saturn Running as organiser/entry provider, Saturn occurrence URL, "Entry powered by Eventrac", TRA permit number 8571, Saturn route-maps course page. No course distance/ascent/terrain metrics exist in the database for this event |
| Rendered | date, no location line (town+county null → `loc` empty; region/`location_raw` not used), no distance line (`distances` empty), Trail chip, badges TRA + Trail race, no `Organised by` line (organiser NULL), 3-button signpost, About paragraph without a distance bucket, no course area |

## 3. Sedgefield Serpentine 2026 — `c8eea9cc…`

| Layer | Value |
| --- | --- |
| Stored public | 20 September 2026, not estimated; town `Stockton-On-Tees`, county `County Durham`, region `North East`, `location_raw` `STOCKTON-ON-TEES, County Durham, TS21 2DN`; lat/lng 54.6528896 / -1.466546; `distances` `10 km`, `distance_tags [10k]`, `discipline Multi-Terrain Race`, `terrain_tags [multi-terrain]`, `race_profile multi_terrain`; organiser `NULL`, `organiser_type governing_body`, `organiser_club_id NULL`; `governance england_athletics`, `licensed 'true'`; `entry_url` Sport:80 wizard, `organiser_url` sedgefieldharriers.co.uk race page |
| Stored private | `source england-athletics`, `source_url` EA search URL; the reviewed EA listing URL in the manifest is the same string, exempted as a reviewed public governing-body destination |
| Related rows | none; no club linkage |
| Only in manifest / external | Sedgefield Harriers as organiser identity, athlete-information PDF, course-map PDF, EA listing |
| Rendered | date, `Stockton-On-Tees, County Durham`, `10 km`, Multi-terrain chip, badges England Athletics + Governing body + Multi-terrain, **no `Organised by` line** (organiser NULL), 5-button signpost (2x2 secondaries), no course area |

Sedgefield Harriers in clubs data: **absent under any spelling.** `name/slug ILIKE '%sedgefield%'` → 0 rows; `name ILIKE '%serpentine%'` → 0; `website_url ILIKE '%sedgefieldharriers%'` → 0; `county ILIKE '%durham%'` → 0 of 1,638 clubs (County Durham has no club rows at all). So the event is unlinked for two independent reasons: (a) no club entity exists to link to, and (b) `events.organiser` is NULL, so both the FK path and the fallback name/slug match in `getEventPageData` (lines 1023-1057) have nothing to match. `organiser_type` is also mis-set to `governing_body` for what is a club-organised race, which is why the badge says "Governing body".

## 4. Hertfordshire Half Marathon & 10K — `ab287a93…`

| Layer | Value |
| --- | --- |
| Stored public | 1 November 2026 but `date_raw` is `November 2026` (month-grain text, `date_is_estimated false`); town `Knebworth`, county `Hertfordshire`, region `East of England`, `location_raw Hertfordshire`; lat/lng 51.8097823 / -0.2376744; `distances` `Half Marathon, 10K`, `distance_tags [half-marathon,10k]`, `discipline NULL`, `terrain_tags []`, `race_profile other`; organiser `RunThrough`, `organiser_type commercial`, `organiser_club_id NULL`; `governance unknown`, `licensed NULL`; `entry_url` RunThrough occurrence, `organiser_url` hertshalf.com |
| Stored private | `source runabc`, `source_url` runabc page — never emitted |
| Related rows | 2 published `event_course_sources` (provider `strava`): Half Marathon 21.100 km / 218 m ascent, route `Hertfordshire Half Marathon`; 10K 10.000 km / 92 m ascent, route `Hertfordshire 10k`; both with `route_url`, `embed_url`, `organiser_source_url`, `source_checked_at` 2026-08-13 |
| Rendered | date "November 2026", `Knebworth, Hertfordshire`, `Half Marathon, 10K`, **no terrain chip** (`terrain_tags []`, `discipline NULL`), badges Commercial organiser only (`governance unknown` and `race_profile other` suppressed), `Organised by: RunThrough` (unlinked), 2-button signpost, plus the on-page `Course and elevation` module with 10K/Half selector, distance label, ascent label, terrain label and Strava iframe |

Both stored course metrics are presented on-page (distance + ascent per selected route). The module's terrain label falls back to a derived value because `terrain_tags` is empty.

## Gap classification

| Gap | Class |
| --- | --- |
| No venue concept at all (FNUL Battersea Park, Sedgefield start/HQ, Herts Knebworth Park) | missing canonical data — `location_raw` exists but is raw source text, not a venue |
| Rubber Ducky has no town/county and empty `distances`/`distance_tags` | missing canonical data (TRA source gives `location_raw` only) |
| Rubber Ducky `location_raw` and `region` exist but the location line renders nothing | available but not projected (`location_raw` is not in the `getEventPageData` select) |
| Rubber Ducky `licensed='true'` + governance `tra`, Sedgefield `licensed='true'` | available but not projected (`licensed` not selected, not shown in `TrustProfileStrip`) |
| Sedgefield / Rubber Ducky organiser identity known only in the reviewed manifest | private evidence requiring governed derivation |
| Sedgefield `organiser_type='governing_body'` badge for a club race | missing canonical data / incorrect canonical value |
| Sedgefield Harriers has no club row; no County Durham clubs at all | identity/entity-linkage failure |
| FNUL organiser matches no club (it is an event brand, not a club) | identity/entity-linkage failure — expected null, but the line is unlinked with no alternative context |
| Herts `date_raw` "November 2026" shown while `date_from` is an exact day | projected but not rendered correctly (both fields projected; the display prefers the coarser one) |
| Herts empty `terrain_tags`, `race_profile other`, `governance unknown` → thin badge strip | missing canonical data |
| FNUL `series_key` present, recurring series never surfaced | available but not projected |
| About copy identical in shape across all four; no venue, licence, course or series facts | generic copy-generation limitation |
| TRA permit numbers, Eventrac provider, Saturn course maps, EA/athlete PDFs | private evidence requiring governed derivation (currently code-manifest only) |

## Recommended bounded remediation order (no schema migration required for steps 1-5)

1. **Projection-only fixes** in `src/lib/events.functions.ts` (`getEventPageData` select) and `src/routes/events.$slug.tsx`: add `location_raw` and `licensed` to the select; use `location_raw` as a last-resort location line only when town and county are both null (Rubber Ducky); render an accurate date from `date_from`/`date_to` in preference to coarser `date_raw` when the day is known (Hertfordshire). Fits D58/D68 — no new fields, no inference.
2. **Licence/verification badge** in `src/components/events/TrustProfileStrip.tsx` + `src/lib/event-taxonomy.ts`: represent `licensed='true'` alongside `governance`, using existing enum labels only. No permit numbers (those stay manifest-side until governed).
3. **Canonical value corrections via the existing governed edit path** (`src/lib/admin-events.functions.ts` / `event_edits`, audited, reversible): Sedgefield `organiser_type governing_body → club` and `organiser 'Sedgefield Harriers'`; Rubber Ducky `distances`/`distance_tags` from the TRA record; Rubber Ducky town/county from `location_raw` + coordinates; Hertfordshire `terrain_tags [road]` and `race_profile road_race`. Each as a separately approved record-level change with evidence, not a bulk backfill.
4. **Club-entity gap (Sedgefield)**: treat as an ORL identity item, not an event fix. Investigate why the EA club import yielded zero County Durham clubs (`src/lib/sync-england-athletics.server.ts`, region normalisation in `src/lib/region-normalize.ts`) before any club row is created. Once a club exists, the existing FK/backfill path (`src/lib/backfill-organiser-match.server.ts`, `events.organiser_club_id`) links it with no new schema.
5. **Series context (FNUL)**: surface `series_key` siblings as an internal "other dates in this series" block using existing columns only.
6. **Venue** — only after 1-5 demonstrate the residual gap. `location_raw` cannot safely double as a venue (it is raw source text: `STOCKTON-ON-TEES, County Durham, TS21 2DN`). If venue proves necessary, it needs one additive nullable `venue` column plus a provenance record under D68 — a separate, separately approved package, not part of this pass.
7. **Copy generation** stays last and stays restatement-only (`src/lib/event-description.ts`): once venue/licence/course facts are canonical, extend the About paragraph to restate them. No prose invention.

Not recommended: emitting `source`/`source_url` (permanently private), promoting manifest permit numbers or entry-provider names into `organiser`/`governance` fields, or inflating signposts with additional outbound course links.
