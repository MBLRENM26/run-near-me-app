## Null out dead aggregator URLs (raceforlife + welshathletics)

Run the two SELECT counts to confirm match counts, then run the three UPDATE statements:

1. **Block 1a** — `UPDATE events SET entry_url = NULL` for the 29 dead `raceforlife.cancerresearchuk.org/find-an-event/...` entry URLs.
2. **Block 1b** — `UPDATE events SET organiser_url = NULL` for the 4 dead raceforlife organiser URLs.
3. **Block 2** — `UPDATE events SET entry_url = NULL` for the 19 dead `welshathletics.org/.../competition/current/view/...` entry URLs.

Verify post-update with a quick re-count (should return 0).

No schema, code, or other field changes.