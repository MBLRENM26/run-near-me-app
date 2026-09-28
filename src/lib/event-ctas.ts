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
  entryProviderLabel,
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

/** Labels describe destinations, never inferred entry availability. */
function labelFor(link: ClassifiedLink): string {
  if (isEntryPlatformHost(link.host)) {
    const provider = entryProviderLabel(link.host!);
    return link.kind === "entry" ? `Check entries at ${provider}` : `Visit ${provider}`;
  }
  return link.kind === "entry" ? "View race details" : "Visit race website";
}

/**
 * `linkType` matches the prior `primaryCta.linkType` mapping so Plausible
 * `Outbound Click` breakdowns stay consistent:
 *   - entry_url, kind=entry       → "entry"
 *   - entry_url, kind=organiser   → "organiser-site"
 *   - organiser_url (any trusted) → "organiser-other"
 */
function linkTypeFor(link: ClassifiedLink, source: "entry" | "organiser"): EventCtaLinkType {
  if (source === "entry") {
    return link.kind === "entry" ? "entry" : "organiser-site";
  }
  return "organiser-other";
}

function toCta(link: ClassifiedLink, source: "entry" | "organiser"): EventCta | null {
  if (!isTrustedLink(link) || !link.href || !link.host) return null;
  return {
    href: link.href,
    host: link.host,
    label: labelFor(link),
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

  const entry = toCta(classifyEventLink(e.entry_url), "entry");
  const org = toCta(classifyEventLink(e.organiser_url), "organiser");

  const ordered: EventCta[] = [];
  if (entry) ordered.push(entry);
  if (org) ordered.push(org);
  if (ordered.length === 0) return null;

  const [primary, second] = ordered;
  const secondary = second && second.href !== primary.href ? second : null;
  return { primary, secondary, usefulLinks: [] };
}
