/**
 * Event detail page CTA derivation.
 *
 * Builds up to two distinct outbound links — a primary button + a secondary
 * text link — from the existing `entry_url` / `organiser_url` fields, using
 * `classifyEventLink` for trust and `isEntryPlatformHost` for labelling.
 *
 * Trust policy is unchanged: aggregator/invalid URLs are dropped here so
 * they never reach the UI.
 */

import {
  classifyEventLink,
  isEntryPlatformHost,
  isTrustedLink,
  type ClassifiedLink,
} from "@/lib/link-trust";

export type EventCtaLinkType = "entry" | "organiser-site" | "organiser-other";

export interface EventCta {
  href: string;
  host: string;
  label: string;
  linkType: EventCtaLinkType;
}

export interface EventCtas {
  primary: EventCta;
  secondary: EventCta | null;
}

interface EventLikeUrls {
  entry_url?: string | null;
  organiser_url?: string | null;
}

/**
 * Label a trusted link based on host (booking platform vs organiser).
 *
 * `proximity` only affects the non-platform `entry` case (today/imminent
 * shifts "Enter now" → "View event details"), matching prior behaviour.
 */
function labelFor(
  link: ClassifiedLink,
  source: "entry" | "organiser",
  proximity: "today" | "imminent" | null,
): string {
  if (isEntryPlatformHost(link.host)) return "Book your place";
  if (link.kind === "entry") {
    return proximity ? "View event details" : "Enter now";
  }
  // organiser-site
  return "Race website";
}

/**
 * `linkType` matches the prior `primaryCta.linkType` mapping so Plausible
 * `Entry Click` breakdowns stay consistent:
 *   - entry_url, kind=entry       → "entry"
 *   - entry_url, kind=organiser   → "organiser-site"
 *   - organiser_url (any trusted) → "organiser-other"
 */
function linkTypeFor(
  link: ClassifiedLink,
  source: "entry" | "organiser",
): EventCtaLinkType {
  if (source === "entry") {
    return link.kind === "entry" ? "entry" : "organiser-site";
  }
  return "organiser-other";
}

function toCta(
  link: ClassifiedLink,
  source: "entry" | "organiser",
  proximity: "today" | "imminent" | null,
): EventCta | null {
  if (!isTrustedLink(link) || !link.href || !link.host) return null;
  return {
    href: link.href,
    host: link.host,
    label: labelFor(link, source, proximity),
    linkType: linkTypeFor(link, source),
  };
}

export interface EventCtasWithUseful extends EventCtas {
  usefulLinks: EventCta[];
}

/**
 * Build primary + optional secondary CTAs for an event, plus any remaining
 * useful trusted links.
 */
export function buildEventCtas(
  e: EventLikeUrls,
  opts: { isPast: boolean; proximity: "today" | "imminent" | null },
): EventCtasWithUseful | null {
  if (opts.isPast) return null;

  const entry = toCta(classifyEventLink(e.entry_url), "entry", opts.proximity);
  const org = toCta(classifyEventLink(e.organiser_url), "organiser", opts.proximity);

  const ordered: EventCta[] = [];
  if (entry) ordered.push(entry);
  if (org) ordered.push(org);
  if (ordered.length === 0) return null;

  const [primary, second] = ordered;
  const secondary = second && second.host !== primary.host ? second : null;

  const usefulLinks: EventCta[] = [];
  const usedHosts = new Set<string>();
  if (primary) usedHosts.add(primary.host);
  if (secondary) usedHosts.add(secondary.host);

  if (second && !secondary && second.host !== primary.host && !usedHosts.has(second.host)) {
    usefulLinks.push(second);
  }

  return { primary, secondary, usefulLinks };
}
