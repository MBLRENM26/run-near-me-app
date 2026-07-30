# RENM — GitHub maintenance audit

Date: 30 July 2026  
Repository: `MBLRENM26/run-near-me-app`  
Observed default branch: `main`  
Observed head: `94e3aa777ae541a6c49e10c8a0dad08c636a0100` (`Fixed handler auth error`)

Status: read-only repository review. This is evidence for Lovable Phase 0, not authority to modify production.

## Confirmed recent admin repair sequence

The admin failure was repaired through several direct commits rather than one isolated change:

1. `e7dd5e1e` — `Fixed static admin session imports`: admin server functions moved session access behind server-only lazy imports to prevent server-only session code entering the client import graph.
2. `f0ff5168` — `Fixed admin login redirect`: made the cookie `secure` flag depend on the request protocol and changed successful login navigation to `/admin/`.
3. `0f588039` — `Fixed iframe admin cookie`: changed the HTTPS admin cookie to `SameSite=None` so it can work in an embedded Lovable iframe.
4. `41eb43b1` — `Added admin email subscribers`: added the subscriber route, navigation item, statistics and an admin query joining reminder rows to events.
5. `94e3aa77` — `Fixed handler auth error`: changed unauthenticated subscriber handlers to return empty results/statistics rather than throw and lazily imported the service-role client.

The fixes are present at the observed `main` head. Whether the currently published production deployment is built from that exact SHA remains unverified and must be evidenced by Lovable.

## Subscriber visibility finding

The subscriber interface selects full email address, event, kind, creation time and reminder-sent time, orders newest first and limits the result to 500 rows. Its data functions check the signed admin session before using the service-role client.

The latest unauthenticated behaviour is operationally ambiguous: an expired, missing or unusable session can look like a legitimate empty subscriber list. The interface therefore fixes the original absence of visibility for a working admin session, but it can still conceal an authentication fault as “zero subscribers.” Phase 0 must distinguish an empty dataset from an unauthenticated response.

The interface is also incomplete as an operational reminder ledger: it does not evidence confirmation, acknowledgement delivery, unsubscribe/suppression state, consent wording/version, due date, manual fulfilment or failure state. The displayed 23 rows therefore demonstrate demand capture, not a functioning reminder service.

## High-priority security hypothesis requiring runtime verification

Commit `7634dd32` (`Fixed client-bundle leak`) removed the same-origin helper and its calls from admin operations. Commit `0f588039` later set the HTTPS admin cookie to `SameSite=None` for iframe compatibility. Current admin-session code still creates an HTTP-only HMAC-signed cookie, but the inspected admin mutations do not show an equivalent origin/CSRF check.

This combination may permit a cross-site request to carry an authenticated admin cookie to a state-changing server function. Code inspection alone does not prove the framework will accept such a request, so this is a **high-priority testable risk**, not a confirmed vulnerability.

Required Phase 0 evidence:

- identify every admin mutation and its effective middleware;
- replay a harmless protected request with a hostile `Origin` and with origin metadata absent;
- report status and response without making a durable data change;
- explain the secure iframe-compatible design if `SameSite=None` is retained;
- do not weaken authentication or silently restore code until Mike approves a narrow fix.

## Other confirmed maintenance changes

- `cda2f4cd` corrected over-broad `noindex` handling for genuine month-suffixed singleton events; its commit note records 82 affected future events.
- `65496888` records investigation of nested distance/month routes and parkrun region/content issues. Phase 0 must verify the actual current files and live output rather than treating the commit title as sufficient proof of all fixes.
- `c649dc14` added durable per-IP and global admin-login rate gates and deliberately avoids trusting ambient `x-forwarded-for`.
- `b37b926c` includes the database-side login-rate function and a runtime smoke-test brief. Its commit title does not cleanly describe the full patch, which reinforces the need to inspect diffs rather than infer behaviour from history labels.

## Verification gap

GitHub reports no combined status checks and no associated pull-request workflow runs for the observed head. No pull requests or issues were found during the initial repository orientation. The recent Lovable changes appear to have landed directly on `main`, so GitHub currently provides history but not independent build, test, review or deployment evidence.

Phase 0 should therefore return exact build, typecheck, test and safe runtime-smoke results, plus the deployed SHA or equivalent deployment identifier.

