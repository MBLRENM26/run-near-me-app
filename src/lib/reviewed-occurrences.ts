import { WAYFINDING_REVIEWS, type WayfindingRow } from "./wayfinding-reviews";

/** The radius RPC omits sort_date. Hydrate only review candidates from the
 * public projection so an old review cannot admit a new occurrence. */
export async function hydrateReviewedOccurrences<T extends WayfindingRow>(
  rows: T[],
  lookup: (ids: string[]) => Promise<Array<{ id: string; sort_date: string | null }>>,
): Promise<Array<T & { sort_date?: string | null }>> {
  const reviewedIds = new Set(WAYFINDING_REVIEWS.map((r) => r.expected.id));
  const ids = rows.flatMap((r) => (r.id && reviewedIds.has(r.id) ? [r.id] : []));
  if (!ids.length) return rows;
  const dates = new Map((await lookup([...new Set(ids)])).map((r) => [r.id, r.sort_date]));
  return rows.map((r) =>
    r.id && reviewedIds.has(r.id) ? { ...r, sort_date: dates.get(r.id) ?? null } : r,
  );
}
