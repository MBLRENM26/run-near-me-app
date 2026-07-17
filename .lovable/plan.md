Export a CSV of events with `sort_date` between 2027-01-01 and 2027-03-31 inclusive, all statuses, no data mutations.

## Columns
- `id`
- `slug`
- `name`
- `sort_date` (event date)
- `date_to` (only populated when it differs from `sort_date`)
- `date_raw` (as a fallback human string, for completeness)
- `date_is_estimated`
- `status`
- `town`
- `county`
- `region`
- `venue` (from `events.venue` if present, else blank)
- `organiser` (from `events.organiser` text field)
- `organiser_url` (official website)
- `entry_url`

## Method
Single `psql \COPY` read-only query filtering `sort_date BETWEEN '2027-01-01' AND '2027-03-31'`, ordered by `sort_date, name`. Output written to `/mnt/documents/renm-events-2027-q1.csv` and surfaced as an artifact.

I'll verify column existence against the `events` table first (e.g. `venue`, `organiser`) and fall back to empty strings if a column doesn't exist, so the CSV shape is stable.

No writes, no sync triggers, no status changes.

# Backlog

## Internal MCP server for development/ops
**Status:** Deferred — not a priority right now.

Build a read-only MCP server so the builder/Lovable agent can query RENM data and diagnostics via structured tools instead of one-off SQL.

### Use cases
- Query events by region, distance, date, status.
- Inspect submission queue and sync run status.
- Check SEO/indexing health for specific slugs/URLs.
- Look up clubs by name, region, or governance body.

### Proposed v1 tools (read-only)
- `search_events`
- `get_event`
- `list_submissions`
- `sync_status`
- `seo_health`
- `club_lookup`

### Auth
Supabase OAuth 2.1 (package default), single-user/internal approval.

### Out of scope for v1
- Write/admin tools.
- Public/unauthenticated access.
- Complex multi-step agents.