import { getRequestHeader, getRequestUrl } from "@tanstack/react-start/server";

/**
 * Lightweight same-origin check for state-changing admin server functions.
 *
 * - If the browser sends an Origin header, it must match the request's own
 *   origin (scheme + host). This blocks cross-site POSTs while still allowing
 *   same-origin form submissions.
 * - If Origin is absent, we fall back to the Referer header. A missing Origin
 *   on a same-origin POST is normal for some browsers / form submissions, so
 *   we only reject when an origin/referer is present and does not match.
 */
export function requireSameOriginOrThrow(): void {
  const url = getRequestUrl();
  const expectedOrigin = `${url.protocol}//${url.host}`;

  const origin = getRequestHeader("origin");
  if (origin) {
    if (origin !== expectedOrigin) {
      throw new Error("Invalid origin");
    }
    return;
  }

  const referer = getRequestHeader("referer");
  if (referer) {
    let refererOrigin: string;
    try {
      refererOrigin = new URL(referer).origin;
    } catch {
      throw new Error("Invalid referer");
    }
    if (refererOrigin !== expectedOrigin) {
      throw new Error("Invalid referer");
    }
  }
}
