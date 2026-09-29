# Homelab change-feed contract (28 Sep 2026)

Status: review-only intake. Reports retain their existing private storage and appear alongside research evidence at `/admin/source-research`; `/admin/change-reports` redirects there. Accept is disabled in both the UI and server until transactional updates, stale-state checks and date-field consistency are implemented. This document describes the server contract; it does not establish that a homelab worker is running.

## Signing
Every request carries:
- `x-renm-timestamp`: unix seconds (must be within 5 minutes)
- `x-renm-signature`: hex HMAC-SHA256 with `CHANGE_FEED_SECRET`
  - watchlist: over `${timestamp}.watchlist`
  - change report: over `${timestamp}.${raw_body}`

## 1. Get the watchlist
`GET /api/public/ingest/watchlist` returns future active races with `id, slug, name, date_from, sort_date, organiser_url, entry_url, watch_targets`.

`watch_targets` is additive: each target has `url`, `role`, `provider`, and nullable `reviewed_on`. Roles include `entry`, `official_details`, `listing`, and `unreviewed`. Prefer these targets to the legacy URL fields: they include reviewed destinations such as the club page that was missing from the imported record. An unreviewed target is a candidate for checking, not verified evidence. Direct payment-account URLs are excluded.

Workers should fetch public information pages only, deduplicate URLs, obey site access rules and rate limits, and never submit forms or follow payment/checkout actions. Redirects and DNS must be checked by the worker before fetching; URL syntax validation here is not an SSRF protection boundary. Report observed changes with their source, without applying them. Results are ordered by date and ID for stable pagination.

## 2. Send changes only
`POST /api/public/ingest/change-report`, up to 200 per call:
```json
{ "reports": [ {
  "event_id": "uuid",
  "field": "date_from | entry_url | entries_status | event_status",
  "old_value": "2026-10-04",
  "new_value": "2026-10-11",
  "source_url": "https://official-race-page",
  "observed_at": "2026-09-28T16:00:00Z"
} ] }
```
If a report is sent again, it is ignored when the race, field, new value and source page are the same.

## Python example
```python
import hmac, hashlib, json, time, requests, os
S = os.environ["CHANGE_FEED_SECRET"].encode(); BASE = "https://runningeventsnearme.com"
def sig(msg): return hmac.new(S, msg.encode(), hashlib.sha256).hexdigest()
ts = str(int(time.time()))
wl = requests.get(f"{BASE}/api/public/ingest/watchlist",
     headers={"x-renm-timestamp": ts, "x-renm-signature": sig(f"{ts}.watchlist")}).json()
body = json.dumps({"reports": [...]})
ts = str(int(time.time()))
requests.post(f"{BASE}/api/public/ingest/change-report", data=body,
     headers={"content-type": "application/json", "x-renm-timestamp": ts,
              "x-renm-signature": sig(f"{ts}.{body}")})
```

## Acceptance remains disabled
The proposed write path is not enabled. Before enabling it, acceptance must atomically validate the expected old value, update every dependent date field, and persist the audit entry. A successful intake response means queued for review, never that the public race changed.

## Rollback
Remove `CHANGE_FEED_SECRET` (the entry point then answers 503). Retain the queue table and its review history; the unified research review view depends on it. Disabling intake requires no table deletion.

## Research integration

The existing endpoints remain supported. The shared review screen identifies these reports as reported changes without a captured page or verified occurrence snapshot. Hold/reject are available; preparing a fresh evidenced correction uses the research contract and the existing ORL acceptance path for organiser relationships. See `RENM-source-research-contract-v1.md`.
