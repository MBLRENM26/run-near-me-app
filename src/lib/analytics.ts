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

export const trackEntryClick = (props: {
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
}) =>
  track("Entry Click", {
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
  filter_type: "radius" | "distance" | "month" | "region";
  value: string | number;
}) => track("Filter", props);

export const trackRegionView = (props: {
  region: string;
  distance?: string | null;
  total_events: number;
}) => track("Region View", props);

export const trackClaimInterest = (props: {
  slug: string;
  region?: string | null;
}) => track("Claim Interest", props);

export const trackClubPageView = (props: {
  slug: string;
  region?: string | null;
  is_claimed: boolean;
  governing_body: string;
}) => track("Club Page View", props);
