/**
 * Stable "featured first" ordering helper.
 *
 * Presentation only: it re-orders an already-filtered list so featured events
 * appear first, preserving the incoming (usually date) order within each group.
 * It never changes which events are eligible for a surface.
 */
export function featuredFirst<T extends { is_featured?: boolean | null }>(
  events: readonly T[],
): T[] {
  const featured: T[] = [];
  const rest: T[] = [];
  for (const e of events) {
    if (e.is_featured) featured.push(e);
    else rest.push(e);
  }
  return [...featured, ...rest];
}
