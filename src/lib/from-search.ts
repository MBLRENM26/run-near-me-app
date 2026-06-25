// Sitewide "Back to search" affordance — search-param shape and helpers.
//
// When a user clicks through from /search?q=…, we forward ?from=search&fromQ=…
// on every onward link so any content page can render a chip linking back to
// the original result set.

export type FromSearch = {
  from?: "search";
  fromQ?: string;
};

/** Coerce arbitrary URL search input to the FromSearch fragment. */
export function pickFromSearch(raw: Record<string, unknown>): FromSearch {
  const out: FromSearch = {};
  if (raw.from === "search") out.from = "search";
  if (typeof raw.fromQ === "string") {
    const trimmed = raw.fromQ.slice(0, 80);
    if (trimmed) out.fromQ = trimmed;
  }
  return out;
}

/**
 * Wrap a route's `validateSearch` so the returned object always carries any
 * `from`/`fromQ` pair through, in addition to the route's own params.
 */
export function withFromSearch<T extends Record<string, unknown>>(
  inner: (raw: Record<string, unknown>) => T,
): (raw: Record<string, unknown>) => T & FromSearch {
  return (raw) => ({ ...inner(raw), ...pickFromSearch(raw) });
}

/** Standalone validator for routes that don't otherwise validate search. */
export function fromSearchValidator(
  raw: Record<string, unknown>,
): FromSearch {
  return pickFromSearch(raw);
}

/**
 * Strip `from`/`fromQ` off an arbitrary search object, then re-add them so
 * forwarded `<Link search>` calls always carry the pair forward unchanged.
 */
export function forwardFromSearch<T extends Record<string, unknown>>(
  search: T | undefined,
  extra: Partial<T> = {},
): T & FromSearch {
  const prev = (search ?? {}) as T & FromSearch;
  const out = { ...prev, ...extra } as T & FromSearch;
  return out;
}
