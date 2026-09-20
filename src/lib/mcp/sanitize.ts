/**
 * PostgREST `.or()` filter strings are parsed with commas as condition
 * separators, parentheses as grouping and `*`/`%` as wildcards. Interpolating
 * raw user text therefore lets a caller inject extra filter conditions.
 *
 * Strip every reserved character so the value can only ever act as a literal
 * substring match inside an `ilike` pattern.
 */
export function sanitizeOrFilterTerm(input: string, maxLength = 100): string {
  return input
    .replace(/[,()%*\\"'.:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}
