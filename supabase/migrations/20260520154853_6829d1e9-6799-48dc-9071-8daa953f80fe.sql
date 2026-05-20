ALTER TABLE public.submissions
  ADD COLUMN kind text NOT NULL DEFAULT 'listing'
    CHECK (kind IN ('listing','claim')),
  ADD COLUMN claim_slug text,
  ADD COLUMN status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','in_review','actioned','rejected','spam')),
  ADD COLUMN admin_note text,
  ADD COLUMN reviewed_at timestamptz;

CREATE INDEX submissions_status_submitted_idx
  ON public.submissions (status, submitted_at DESC);

-- Backfill: detect existing claim rows by the legacy text prefix
UPDATE public.submissions
SET kind = 'claim',
    claim_slug = trim(both ' ' from split_part(split_part(event_details, E'\n', 1), 'Claiming listing:', 2))
WHERE event_details ILIKE 'Claiming listing:%';

-- Backfill: legacy reviewed flag maps to 'actioned'
UPDATE public.submissions
SET status = 'actioned',
    reviewed_at = submitted_at
WHERE is_reviewed = true;