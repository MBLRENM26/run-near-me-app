## Import 221 NI + Welsh clubs

**Source**: `user-uploads://NIWales_clubs_import_-_221_rows` — 108 Northern Ireland (`athletics-ni`) + 113 Wales (`welsh-athletics`). Columns: name, slug, region, governing_body, website_url, email.

**Pre-checks (all clean)**:
- 0 existing rows in DB for `athletics-ni` or `welsh-athletics` → no update conflicts.
- 0 slug collisions against existing `clubs.slug`.
- 0 duplicate slugs within the CSV.
- All regions are canonical (`Northern Ireland` / `Wales`).
- All `governing_body` values pass the CHECK constraint.

**Insert plan** (single `supabase--insert` call):
- `INSERT INTO clubs (norm_id, slug, name, governing_body, region, country, website_url, contact_email, source, status)`
- `norm_id`: `ani-<slug>` for NI, `wa-<slug>` for Wales (matches existing `ea-…` / `sa-…` convention, satisfies NOT NULL + UNIQUE).
- `country`: `Northern Ireland` / `Wales`.
- `website_url` / `contact_email`: NULL where CSV is empty string.
- `source`: `manual-import-2026-07`.
- `status`: `ACTIVE` (default).
- `disciplines`: default `{}`.
- `is_claimed`: default false.

**Verification after insert**:
- Row counts per `governing_body`.
- Sample 3 rows each region.
- Confirm `/running-clubs-near-me` now renders Northern Ireland + Wales pills with populated lists.

**Not doing**: no geocoding (lat/lng stay NULL — regional pages don't need them); no town/county (not in CSV); no dedupe vs existing EA clubs (governing bodies are disjoint).