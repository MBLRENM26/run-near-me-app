# Step 3a follow-up: FAQ quality fixes

Your spot-checks surfaced three real issues with `buildEventFaqs`. All fixes stay inside `src/lib/event-description.ts` (single source of truth for visible + JSON-LD) plus one render guard in `src/routes/events.$slug.tsx`. No schema changes, no data changes.

## Issues and fixes

### 1. "How far" reads awkwardly and sometimes lies

Examples you hit:
- *Serpentine … 5K July* → "offers 5K." (name already says 5K — pure repetition)
- *Isle of Skye Half Marathon, 10K & Fun Run* → "offers Half Marathon, 10K, Fun Run." (name already lists them)
- *Rat Race Sea to Summit* → "offers Ultra/Trail." (those are categories, not distances — misleading)

Fix — tighten the gate and the wording:

- **Skip the Q entirely when the distances string is not a real distance list.** Require at least one numeric distance token (regex along the lines of `\d+(\.\d+)?\s*(k|km|mi|mile|m)\b` or the literal words `marathon`/`half marathon`/`parkrun`). Strings that are only category words (`Ultra`, `Trail`, `Ultra/Trail`, `Fun Run` alone) → no Q.
- **Skip when the distances string is already substantively present in the event name** (normalised: lowercase, strip punctuation, compare token overlap). If every distance token in `distances` is already in `name`, the Q adds nothing — drop it.
- **Rephrase the answer** from "{name} offers {distances}." to "Distances: {distances}." — shorter, doesn't restate the name, reads naturally regardless of how many distances there are.

Net effect: Serpentine 5K, Skye, and Rat Race all lose the "How far" Q. A page like *Vitality London 10K* also loses it (distance in name). Events where the name is generic (e.g. *Stoodley Pike Fell Race* with `10 miles`) keep it.

### 2. Entry Q is redundant when the Enter Now button is right there

On *Big Half*, *Wirral 10K* etc. the FAQ answer ("Entry information is available via the linked entry page where provided.") restates what the visible CTA already shows. It adds noise, not information.

Fix — replace the boilerplate with one substantive sentence, only when we actually have something to add:

- **Drop the Q whenever the answer would just point at the same button the user can already see.** Concretely: if `classifyEventLink(entry_url).kind === "entry"` AND we have no extra context to add, skip it.
- **Keep the Q only when we can answer with a real fact**, currently just the date proximity note (the "Race day is near…" copy already on the page). When close to race day, render: *"Entries may have closed — check the linked event page for current availability."* Otherwise omit.
- The softer "Where can I find more about…" Q (organiser-only case) stays as-is — that one isn't redundant because there's no Enter Now button on those pages.

### 3. "Where does … take place" with no town

*Rat Race Sea to Summit Ben Nevis* has no `town` in your DB, so the Where Q is correctly skipped — but that leaves the page with very few Qs. This is the FAQ gate working as designed (block hides under 2 Qs), so no code change; the right fix is data (claim/edit), which the existing "Claim this listing" CTA already invites.

No action here beyond confirming the gate behaves correctly after fix #1 reduces Q counts on some pages.

## Files touched

- `src/lib/event-description.ts` — update `buildEventFaqs`:
  - new helper `hasRealDistance(distances)` (numeric token check)
  - new helper `distancesAlreadyInName(name, distances)` (token-overlap check)
  - reword distance answer to `Distances: {distances}.`
  - entry Q: drop the boilerplate-only case, keep a proximity-aware variant
- `src/routes/events.$slug.tsx` — no logic change; the existing `faqs.length >= 2` gate already drops the block (and the FAQPage JSON-LD) when fixes above push some pages below threshold. Confirm visually after build.

## Deliberately out of scope

- **URL date inconsistency** (some slugs include the year, some don't). Real issue, but it touches slug generation / canonicalisation / redirects — separate ticket.
- **"Peter Ilkey" / Ilkley Incline traffic spike** — that's a measurement observation, not a code change.
- **Adding more Q types** (cost, parking, route). Still blocked by the trusted-fields rule from mem://constraints/scraped-data-trust.

## Verification after build

Re-walk the same spot-check list:
- Serpentine 5K, Skye, Vitality London 10K → no "How far" Q
- Stoodley Pike Fell Race → keeps "How far" (name doesn't contain "10 miles")
- Big Half, Wirral 10K → no boilerplate entry Q
- Skye / Gnosall (≤14 days) → entry Q present with proximity wording
- Rat Race Sea to Summit → no "How far", no Where, likely falls under 2-Q gate and whole block hides — confirm
- Powys 3-Q page → may drop to 2 Qs, still renders