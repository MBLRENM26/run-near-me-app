## Goal
Replace 31 hollow RunThrough links (all pointing at `runthrough.co.uk/` or `/events-timeline`) with the specific event page on the RunThrough site. Every event page's "Enter now" CTA will resolve to the actual entry page.

## Verification
- Confirmed the right column is `entry_url` (organiser_url is for the organiser's own site — RunThrough is the entry platform).
- All 31 slugs exist and every one currently points at the RunThrough homepage or `/events-timeline` — no non-hollow URLs would be overwritten.
- `classifyEventLink` already treats `runthrough.co.uk/event/...` as an "entry-platform event page" (trusted for CTA), so these events stay in discovery surfaces after the fix.

## Change
One `supabase--insert` call running the 31 `UPDATE public.events SET entry_url = ... WHERE slug = ...` statements exactly as supplied.

## Not doing
- Not touching `organiser_url` — RunThrough is a commercial series operator, not a member-owned club, so leaving `organiser_url` unset is correct.
- Not applying the 5 low-confidence matches you excluded.
- Not re-running the deduper or discovery indexer — nothing about eligibility changes.
