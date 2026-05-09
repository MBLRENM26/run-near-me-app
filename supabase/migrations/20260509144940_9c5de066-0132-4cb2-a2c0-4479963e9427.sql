ALTER TABLE public.events ADD COLUMN IF NOT EXISTS sort_date date;

DO $$
DECLARE
  r RECORD;
  parsed date;
BEGIN
  FOR r IN SELECT id, date_raw FROM public.events WHERE date_raw IS NOT NULL LOOP
    parsed := NULL;
    BEGIN
      IF r.date_raw ~ '^\d{1,2}\s+[A-Za-z]+[-–]\d{1,2}\s+[A-Za-z]+\s+\d{4}$' THEN
        -- Cross-month range "30 Oct-01 Nov 2026" → "30 Oct 2026"
        parsed := to_date(
          regexp_replace(r.date_raw, '^(\d{1,2}\s+[A-Za-z]+)[-–].*\s+(\d{4})$', '\1 \2'),
          'FMDD Mon YYYY');
      ELSIF r.date_raw ~ '^\d{1,2}[-–]\d{1,2}\s+[A-Za-z]+\s+\d{4}$' THEN
        -- Same-month range "9-10 May 2026"
        parsed := to_date(
          regexp_replace(r.date_raw, '^(\d{1,2})[-–]\d{1,2}\s+([A-Za-z]+)\s+(\d{4})$', '\1 \2 \3'),
          'FMDD Mon YYYY');
      ELSIF r.date_raw ~ '^\d{1,2}\s+[A-Za-z]+\s+\d{4}$' THEN
        -- Single day "9 May 2026"
        parsed := to_date(r.date_raw, 'FMDD Mon YYYY');
      ELSIF r.date_raw ~ '^[A-Za-z]+\s+\d{4}$' THEN
        -- Month only "May 2026"
        parsed := to_date('1 ' || r.date_raw, 'FMDD Mon YYYY');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      parsed := NULL;
    END;
    IF parsed IS NOT NULL THEN
      UPDATE public.events SET sort_date = parsed WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS events_sort_date_idx ON public.events (sort_date);