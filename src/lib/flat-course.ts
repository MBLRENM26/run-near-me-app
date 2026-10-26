// Pure: does an accepted course_profile fact say the course is flat?
// Only explicit organiser wording counts; anything mentioning hills/climbs is out.

const NEGATIVE = /\b(not flat|hill|hilly|climb|climbs|undulat|rolling|steep|ascent|technical)\b/;

export function isFlatCourseValue(value: string | null | undefined): boolean {
  const v = (value ?? "").toLowerCase().trim();
  if (!v || !/\bflat\b/.test(v)) return false;
  return !NEGATIVE.test(v);
}

/** Feature pages stay out of search below this many qualifying upcoming races. */
export const MIN_INDEXABLE_FEATURE_EVENTS = 8;
