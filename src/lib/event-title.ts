/** Append the occurrence year only when the name does not already contain it. */
export function eventNameWithYear(name: string | null | undefined, year: string): string {
  const title = name?.trim() ?? "";
  if (!year || new RegExp(`(^|\\D)${year}(\\D|$)`).test(title)) return title;
  return [title, year].filter(Boolean).join(" ");
}
