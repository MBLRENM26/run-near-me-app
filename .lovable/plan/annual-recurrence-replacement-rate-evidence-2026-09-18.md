# Annual recurrence + replacement-rate evidence

## What the data shows right now

Verified against production data today:

- Your latest manual sync landed **186 new events in the last 2 days, all future-dated** — the ingest side is working.
- Live future inventory: **1,181 active future events** vs **4,755 past events**. Nothing has been deleted, so history is intact.
- In the last ~400 days there were **2,888 distinct past occurrences**. Of those, **2,826 have no future occurrence recorded** under the same name. Most of those will be annual races due to come round again.
- Recurrence identity is mostly missing: only **642 of 7,647** events carry a series key, even though 2,009 are flagged as recurring. So today there is no reliable way to say "this year's Tettenhall 5K is the same race as last year's".
- Of the 1,181 active future events, **905 have an organiser-owned website**, 292 have no distance tags, 14 have no coordinates.

So you're right on both counts: replacement is cyclical, and the records are kept — but nothing currently connects an old occurrence to its next edition, which is why the pipeline looks like it's losing ground rather than turning over.

## What to build

### 1. Series identity (the rediscovery backbone)

Use the existing `series_key` column — no new tables. Add a deterministic key derived from stable fields only (normalised name + town + distance), so the same race gets the same key every year. Applied as a read-only *proposal* first: an admin review screen listing proposed series groupings with the occurrences they'd join, so you approve before anything is written.

### 2. Rediscovery worklist

An admin page answering: which series had an occurrence in the last 12 months but none coming up? Sorted by last-seen date and by past search interest, so you know which races to chase next — and which source to check when you run the next manual sync.

### 3. Replacement-rate report

A monthly view showing, per month: future-dated events gained, occurrences that passed out of the window, and net change — split by whether they reach discovery (organiser-owned link present). This is the number that tells you whether ingest is keeping up with ageing, which the current Google decline can't answer on its own.

### 4. Sync run visibility

Surface the existing sync run log in the admin area: last run per source, events added/updated, and failures — so manual runs are recorded and you can see at a glance when a source last produced anything.

## Boundaries

No data or schema mutation in this step: series keys and rediscovery are proposals for your review, matching the existing audited-edit route. No bulk enrichment, no organiser graph, no changes to discovery gates, event pages, links, analytics or provenance. Automating the sync schedule is out of scope here and stays a separate decision.

## Technical notes

- `series_key` proposal logic as a pure module with unit tests; deterministic, no network, no writes.
- Rediscovery and replacement-rate queries as read-only server functions behind the existing admin gate, reading `events` (`sort_date`, `status`, `created_at`, `series_key`) — internal columns stay out of any public projection.
- Reuse `sync-run-log.server.ts` for run visibility rather than adding new logging.
- Any eventual series-key write goes through a separately approved migration plus `event_edits`, never an ad-hoc update.
