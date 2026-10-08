import type { Json } from "@/integrations/supabase/types";

type Occurrence = { date_from: string | null; date_to: string | null; sort_date: string | null };

/** A reviewed name is applicable only to the exact stored value and occurrence. */
export function hasCurrentOrganiserReview(
  event: Occurrence & { organiser: string | null },
  review: { value: Json; occurrence: Json } | null | undefined,
): boolean {
  if (!event.organiser?.trim() || !review || review.value !== event.organiser) return false;
  const occurrence = review.occurrence;
  if (!occurrence || typeof occurrence !== "object" || Array.isArray(occurrence)) return false;
  return occurrence.date_from === event.date_from &&
    occurrence.date_to === event.date_to && occurrence.sort_date === event.sort_date;
}
