# Homelab change-feed contract (28 Sep 2026)

Status: built, unpublished. Reports enter a private review queue only; nothing changes on the site until an admin accepts at `/admin/change-reports`.

## Signing
Every request carries:
- `x-renm-timestamp`: unix seconds (must be within 5 minutes)
- `x-renm-signature`: hex HMAC-SHA256 with `CHANGE_FEED_SECRET`
  - watchlist: over `${timestamp}.watchlist`
  - change report: over `${timestamp}.${raw_body}`

## 1. Get the watchlist
`GET /api/public/ingest/watchlist` returns future active races with `id, slug, name, date_from, organiser_url, entry_url`.

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

## What an accept does
- `date_from`, `entry_url`: the race record is updated and an audited edit is saved with the page the change came from.
- `entries_status`, `event_status` (cancelled/postponed): only an audited note is saved. Any status change stays a separate manual decision.

## Rollback
Remove `CHANGE_FEED_SECRET` (the entry point then answers 503). The queue table can be dropped with no effect on the public pages.
