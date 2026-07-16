# Submissions policy tidy + rate limit (amended)

## 1. Drop the unreachable RLS policy

Migration:
```sql
DROP POLICY "Anyone can submit" ON public.submissions;
```
`"Service role full access"` (ALL, service_role) stays. No grants change. `submitListing` uses `supabaseAdmin` and is unaffected.

## 2. Rate-limit `submitListing`

Add a best-effort limiter at the top of the handler in `src/lib/admin.functions.ts`.

**Threshold:** 5 attempts / 10 minutes / IP-derived key. No global ceiling.

**Client IP resolution (server-side only):**
- Prefer `cf-connecting-ip` (trusted on the Cloudflare edge path this app runs on).
- Fallback: first value of `x-forwarded-for`, split on `,` and trimmed. Documented in a comment as a soft fallback for non-CF paths (dev/preview); not a security boundary.
- If neither header is present, use the literal key `"unknown"` so limiter still applies coarsely rather than opening a bypass.

**Key derivation:** `sha256(ip + "|" + utc_date_yyyy_mm_dd)`. Salt rotates every UTC day. Neither the raw IP nor the hash is persisted or logged with the submission row.

**Storage:** in-memory `Map<hash, { count, resetAt }>` per worker instance, sliding window. Explicit comment states this is per-worker, non-distributed, best-effort friction — not bot protection. Escalation path (Cloudflare WAF / Turnstile / shared store) noted in the same comment.

**Response on limit:** the handler returns `{ ok: false as const, reason: "rate_limited" as const }` (extends the existing return union). No throw, no 500.

**Client surfacing:** `src/routes/list-your-event.tsx` inspects the response and shows an inline friendly message ("You've submitted a few times just now — please wait a few minutes before trying again."). No toast spam, no console error.

## 3. Verification (no queue pollution)

- **One** real end-to-end preview submission → confirm row lands in `submissions`, admin notification fires, everything unchanged.
- SQL re-check: `pg_policy` shows only `"Service role full access"`; grants on `public.submissions` still empty for anon/authenticated.
- Limiter behaviour verified without creating six real submissions:
  - Add a `__test` handler-local hook that lets the limiter be exercised from a scoped preview curl with a synthetic key, gated by `process.env.NODE_ENV !== "production"` so it cannot fire in prod. Preferred if the harness is easy.
  - Alternative if that feels invasive: temporarily set the threshold to 2 in preview, submit twice from the actual form to confirm the friendly message renders, then restore to 5 before publishing. Only two real submissions, both flagged as tests in a follow-up cleanup.
  - Confirm at review time which of these the user prefers before writing tests/hooks.

## 4. Memory correction

Update `mem://audits/state-of-the-build-2026-07-16.md`:
- Anon INSERT policy present but unreachable (no GRANT); effective posture is service-role only, matching Bible §7.
- Spam auto-purge cron `purge-spam-submissions-daily` is live at 03:00 UTC, 30-day window — Bible correct, earlier audit line wrong.
- Note the new rate limiter is per-worker best-effort, not distributed.

## Out of scope

- No global hourly ceiling.
- No changes to `submissions` grants, service-role policy, spam-purge cron, or admin flows.
- No Cloudflare WAF / Turnstile work this pass — captured as the documented next escalation if abuse materialises.

## Technical notes

- IP header parsing lives in a small helper in `src/lib/admin.functions.ts` (kept local; the `/api/public/track-search` version is similar but not shared to avoid coupling public-route and serverFn code paths).
- Limiter map is module-scope inside the serverFn file so it's warm across calls on the same worker; entries expire lazily on read.
- Rate-limit branch returns before touching Supabase, so no wasted admin-client writes.
