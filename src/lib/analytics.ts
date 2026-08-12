/**
 * Plausible custom-event wrapper.
 *
 * The Plausible script is loaded in src/routes/__root.tsx and exposes a
 * global `window.plausible(name, { props })`. This helper is a safe no-op
 * when the script hasn't loaded (SSR, ad-blockers, tests) and centralises
 * the goal names so we can grep them in one place.
 *
 * Goal names mirror Plausible's UI conventions (Title Case). Props must be
 * shallow objects of primitives — Plausible drops nested structures.
 */

import type { DestinationRole } from "@/lib/destination-role";

type PlausibleProps = Record<string, string | number | boolean | undefined | null>;

type PlausibleFn = (
  event: string,
  options?: { props?: PlausibleProps; callback?: () => void },
) => void;

declare global {
  interface Window {
    plausible?: PlausibleFn;
  }
}

function clean(props?: PlausibleProps): PlausibleProps | undefined {
  if (!props) return undefined;
  const out: PlausibleProps = {};
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

export function track(name: string, props?: PlausibleProps) {
  if (typeof window === "undefined") return;
  const fn = window.plausible;
  if (typeof fn !== "function") return;
  try {
    fn(name, props ? { props: clean(props) } : undefined);
  } catch {
    // never let analytics break the page
  }
}

// Named helpers — keeps goal names consistent across the codebase.

/**
 * Outbound destination click.
 *
 * Replaces the historical `Entry Click` goal: a click on an outbound event
 * link is not evidence of an entry. Existing properties are preserved so
 * breakdowns stay comparable; `destination_role` is analytics-only (see
 * src/lib/destination-role.ts) and asserts nothing publicly.
 *
 * Historical `Entry Click` data is left untouched — no backfill.
 */
export const trackOutboundClick = (props: {
  slug: string;
  region?: string | null;
  link_type: "entry" | "organiser-site" | "organiser-other";
  /** `null` is normalised to `"future"` so dashboards have one consistent bucket for upcoming events. */
  proximity: "future" | "today" | "imminent" | "past" | null;
  event_name: string;
  distance?: string | null;
  discipline?: string | null;
  /** Hostname of the outbound URL, `www.` stripped. Omitted when the URL is unparseable. */
  entry_domain?: string;
  destination_role: DestinationRole;
}) =>
  track("Outbound Click", {
    ...props,
    proximity: props.proximity ?? "future",
  });

export const trackSearchResultClick = (props: {
  query: string;
  slug: string;
  position: number;
  results_count: number;
}) => track("Search Result Click", props);

export const trackLocationSet = (method: "device" | "postcode") =>
  track("Location Set", { method });

export const trackFilter = (props: {
  page: string;
  filter_type: "radius" | "distance" | "month" | "region" | "governance" | "race_profile";
  value: string | number;
}) => track("Filter", props);

export const trackRegionView = (props: {
  region: string;
  distance?: string | null;
  total_events: number;
}) => track("Region View", props);

export const trackClaimInterest = (props: { slug: string; region?: string | null }) =>
  track("Claim Interest", props);

export const trackClubPageView = (props: {
  slug: string;
  region?: string | null;
  is_claimed: boolean;
  governing_body: string;
}) => track("Club Page View", props);

export const trackExplorerOpened = (props: {
  date_mode: "dated" | "recurring";
  has_location: boolean;
  results_count: number;
}) => track("Explorer Opened", props);

export const trackExplorerCriteria = (props: { criteria: string; value: string | number }) =>
  track("Explorer Criteria Applied", props);

export const trackExplorerResults = (props: {
  results_count: number;
  capped: boolean;
  date_mode: "dated" | "recurring";
}) => track("Explorer Results Shown", props);

export const trackExplorerInspect = (props: { slug: string; position: number }) =>
  track("Explorer Event Inspected", props);

export const trackExplorerCompare = (props: {
  action: "started" | "added" | "removed" | "cleared";
  slug?: string;
  selected_count: number;
}) => track("Explorer Compare", props);

export const trackExplorerEventOpen = (props: {
  slug: string;
  source: "card" | "detail" | "compare";
}) => track("Explorer Event Page Opened", props);

export const trackCourseModuleViewed = (props: {
  slug: string;
  provider: "plotaroute";
}) => track("Course Module Viewed", props);

export const trackCourseSourceOpened = (props: {
  slug: string;
  provider: "plotaroute";
}) => track("Course Source Opened", props);
