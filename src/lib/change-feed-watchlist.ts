import { buildReviewedDestinations } from "./reviewed-destinations";
import { isPaymentHost, normalizeUrl } from "./link-trust";
import type { WayfindingRow } from "./wayfinding-reviews";

/** Additive to legacy URL fields; these are read-only monitoring targets,
 * not instructions to follow booking/payment actions or apply changes. */
export function buildWatchTargets(row: WayfindingRow) {
  const reviewed = buildReviewedDestinations(row);
  const targets = reviewed.map((d) => ({
    url: d.href,
    role: d.role as string,
    provider: d.provider,
    reviewed_on: d.reviewedOn ?? null,
  }));
  for (const raw of [row.entry_url, row.organiser_url]) {
    const url = normalizeUrl(raw);
    if (!url || isPaymentHost(url.hostname.replace(/^www\./, ""))) continue;
    if (targets.some((t) => t.url === url.href)) continue;
    targets.push({ url: url.href, role: "unreviewed", provider: url.hostname, reviewed_on: null });
  }
  return targets.filter((t) => !isPaymentHost(new URL(t.url).hostname.replace(/^www\./, "")));
}
