-- Remove one verified cross-event association. The Cardiff record's official
-- Welsh Athletics entry URL remains intact; only the unrelated Altrincham
-- organiser URL is cleared.
UPDATE public.events
SET organiser_url = NULL
WHERE slug = 'cardiff-10k-2026'
  AND source = 'welsh-athletics'
  AND organiser_url = 'https://www.runthrough.co.uk/event/altrincham-10k-2026';

UPDATE public.course_source_reviews
SET resolved_at = now(),
    last_seen_at = now()
WHERE event_id = (
    SELECT id FROM public.events WHERE slug = 'cardiff-10k-2026' LIMIT 1
  )
  AND source_url = 'https://www.runthrough.co.uk/event/altrincham-10k-2026'
  AND reason = 'event_name_mismatch'
  AND resolved_at IS NULL;
