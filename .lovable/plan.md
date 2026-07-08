## Verdict: no code changes needed. Google is re-crawling the fix we already shipped.

I sampled the 552 Soft-404 URLs against the DB and hit the live site. Every case matches the noindex rule we built:

| Slug (sample) | DB state | Live response | Verdict |
|---|---|---|---|
| `lightning-bolt-fast-10k-race-5` | HIDDEN | **HTTP 404** | Correct — page removed |
| `dramathon`, `pretty-muddy-liverpool` | HIDDEN | **HTTP 404** | Correct |
| `tcs-amsterdam-marathon` | DUPLICATE, no survivor | **HTTP 404** | Correct |
| `east-midlands-grand-prix-blisworth-5` | ACTIVE, past (May) | 200 + `noindex, follow` | Correct — past-event rule |
| `wigan-trail-10k` | ACTIVE, past | 200 + `noindex, follow` | Correct |
| `tatton-park-5k-10k-december` | ACTIVE, future | 200 + `noindex, follow` | Correct — series duplicate |
| `grim-reaper` | ACTIVE, past | 200 + `noindex, follow` | Correct |

All 552 are `Pending` in GSC = Google is validating right now. Nothing broken to fix. They will drop out of Soft 404 over the next few crawl cycles and land in "Excluded by noindex tag" (which is the desired destination — not an error).

## How to think about the full GSC report

**Working as designed — leave alone, expect these numbers to grow:**
- Excluded by `noindex` (43) — our rule firing
- Alternative page with proper canonical (51) — legacy `/{slug}` → `/events/{slug}` redirects being honoured
- Page with redirect (33) — same
- Duplicate, Google chose different canonical (2) — negligible

**In flight — will resolve without action:**
- Soft 404 (552, "Started") — confirmed above; wait 2–4 weeks
- Discovered – currently not indexed (390) — mostly the same population; will shrink as Soft 404s reclassify
- Crawled – currently not indexed (109) — same story

**Small, worth a quick look (build-mode work):**
- Not found 404 (11) — audit list, decide per-URL whether to 301 to a survivor slug or leave as genuine 404
- Server error 5xx (2) — check the two URLs; likely transient edge blip but worth confirming

## Recommendation

Don't build anything against the 552/390/109 buckets — the fix is already deployed and Google needs time. If you want a small hands-on pass, we can (in build mode) audit the 11 404s and 2 5xxs and ship any 301s / bug fixes those turn up.

Otherwise the higher-leverage next moves remain the ones already in memory backlog: SEO landing pages, analytics activation, or Scottish Athletics organiser-URL gap. Let me know which to take next.