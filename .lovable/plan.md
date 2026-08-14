# Deploy the soft-404 residual correction and verify in production

The two residual failures (YTRRC organiser rendering, Regents Park sitemap exclusion) are already fixed in code at commit `ef80a6ce84c912ff6ed808cef1720708b7590d53`, with 127/127 tests passing, TypeScript clean and local SSR evidence recorded. Nothing further needs building.

The only outstanding step is production acceptance.

## Steps

1. Publish the current build so the corrected organiser rendering and shared sibling-eligibility rule are live.
2. Wait for the public sitemap CDN window (up to one hour) or request the sitemap with a unique query string, as the harness already does.
3. Run the existing read-only verifier against production:
   `npm run verify:soft404 -- --base-url https://runningeventsnearme.com`
4. Confirm the two previously failing URLs:
   - `/events/ytrrc-5k-spring-summer-series-september` — `200`, organiser name present in server-rendered HTML, no aggregator link rendered.
   - `/events/regents-park-5k-10k-november` — `200`, no `noindex`, exactly one sitemap occurrence; the placeholder-only October sibling absent.
5. Update `docs/renm/RENM-soft-404-residual-acceptance-result-2026-08-14.md` with the dated production result: cohort counts, deployment hash, and the clean canonical set (43 if both pass).

## Boundaries

- No database mutation, no migration edit, no change to the reviewed patch payload.
- No GSC submission or validation request — eligibility record only.
- No changes to reminders, MCP, syncs, region SSR or unrelated functionality.
- The verifier is not weakened to turn a failing page green; a residual failure stays outside the clean set and is reported as-is.

## Technical notes

- `npm run verify:soft404` performs HTTP GET only, against the 43 canonical candidates, 13 duplicate redirects and 2 retired Athens paths in `scripts/soft404-residual-acceptance-manifest.json`.
- Local runs cannot validate canonicals (absolute production URLs), so production is the only meaningful target for the canonical cohort.
- If a canonical still fails, the next action is to inspect that single occurrence's data and rendering — not to broaden the eligibility rule.
