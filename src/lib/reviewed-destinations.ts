import { findWayfindingReview, type WayfindingRow } from "./wayfinding-reviews";
import { normalizeUrl, isPaymentHost } from "./link-trust";
import type { PublicDestination } from "./pilot-destinations";

export function buildReviewedDestinations(row: WayfindingRow): PublicDestination[] {
  const review = findWayfindingReview(row);
  if (!review) return [];
  return review.destinations.flatMap((d) => {
    const url = normalizeUrl(d.href);
    const evidence = normalizeUrl(d.evidenceUrl);
    if (!url || !evidence || isPaymentHost(url.hostname.replace(/^www\./, ""))) return [];
    // Payment instructions must be on the corroborating organiser page,
    // never an unverified payment-account URL or a direct payment action.
    if (d.role === "payment_instructions" && url.href !== evidence.href) return [];
    return [
      {
        role: d.role,
        roleLabel: d.role.replaceAll("_", " "),
        provider: d.provider,
        action: d.label,
        shortLabel: d.label,
        href: url.href,
        host: url.hostname.replace(/^www\./, ""),
        linkType: d.role === "entry" ? ("entry" as const) : ("organiser-other" as const),
        destinationRole:
          d.role === "entry"
            ? ("booking_destination" as const)
            : d.role === "listing"
              ? ("third_party_listing" as const)
              : d.role === "payment_instructions"
                ? ("payment_instructions" as const)
                : ("official_information" as const),
        reviewedOn: review.reviewedOn,
        reviewNote: d.note,
      },
    ];
  });
}
