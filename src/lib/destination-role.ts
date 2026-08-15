/**
 * Analytics-only destination-role classification for outbound event links.
 *
 * This module exists purely so the `Outbound Click` custom event can carry a
 * `destination_role` property. It is deliberately NOT part of link trust,
 * CTA derivation, discovery eligibility or anything user-visible:
 *
 * - It never changes which links are rendered, their labels or their order.
 * - It never asserts anything publicly about entries being open.
 * - Unknown beats false precision: when evidence is absent we emit
 *   `"unknown"` rather than guessing.
 *
 * Roles:
 * - `booking_destination`  — event-specific page on a recognised registration
 *                            provider (entry/booking platform).
 * - `ballot_waitlist`      — explicit ballot / waitlist / lottery evidence in
 *                            the URL or the CTA label.
 * - `official_information` — trusted non-booking destination (organiser site
 *                            or event-specific page on a non-provider host).
 * - `unknown`              — untrusted, unparseable or unrecognised.
 */

import { classifyEventLink, isEntryPlatformHost } from "@/lib/link-trust";

export type DestinationRole =
  | "booking_destination"
  | "ballot_waitlist"
  | "official_information"
  /**
   * Reviewed governing-body licence / permit record. Only ever supplied
   * explicitly by a reviewed destination manifest — `classifyDestinationRole`
   * never infers it.
   */
  | "licence_record"
  | "unknown";


/** Explicit ballot / waitlist / lottery evidence tokens. */
const BALLOT_PATTERNS = [
  "ballot",
  "waitlist",
  "wait-list",
  "wait_list",
  "waiting-list",
  "waiting list",
  "lottery",
];

function hasBallotEvidence(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  return BALLOT_PATTERNS.some((p) => t.includes(p));
}

/**
 * Classify one outbound destination for analytics.
 *
 * @param url      the outbound URL as rendered
 * @param ctaLabel the visible CTA label, when available (evidence source for
 *                 ballot / waitlist only)
 */
export function classifyDestinationRole(
  url: string | null | undefined,
  ctaLabel?: string | null,
): DestinationRole {
  const link = classifyEventLink(url);
  if (!link.href || !link.host) return "unknown";
  if (link.kind === "untrusted" || link.kind === "invalid") return "unknown";

  // Explicit evidence wins over host-based inference.
  const path = (() => {
    try {
      const u = new URL(link.href);
      return `${u.pathname}${u.search}`;
    } catch {
      return "";
    }
  })();
  if (hasBallotEvidence(path) || hasBallotEvidence(ctaLabel)) {
    return "ballot_waitlist";
  }

  // Recognised registration provider, and event-specific (has a path).
  if (isEntryPlatformHost(link.host) && link.kind === "entry") {
    return "booking_destination";
  }

  // Trusted, non-booking destination.
  return "official_information";
}
