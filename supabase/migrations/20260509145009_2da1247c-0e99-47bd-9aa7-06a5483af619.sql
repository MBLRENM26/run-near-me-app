DO $$
DECLARE
  r RECORD;
  parsed date;
  candidate text;
BEGIN
  FOR r IN SELECT id, date_raw FROM public.events WHERE sort_date IS NULL AND date_raw IS NOT NULL LOOP
    parsed := NULL;
    candidate := NULL;
    IF r.date_raw ~ '^\d{1,2}\s+[A-Za-z]+[-–]\d{1,2}\s+[A-Za-z]+\s+\d{4}$' THEN
      candidate := regexp_replace(r.date_raw, '^(\d{1,2}\s+[A-Za-z]+)[-–].*\s+(\d{4})$', '\1 \2');
    ELSIF r.date_raw ~ '^\d{1,2}[-–]\d{1,2}\s+[A-Za-z]+\s+\d{4}$' THEN
      candidate := regexp_replace(r.date_raw, '^(\d{1,2})[-–]\d{1,2}\s+([A-Za-z]+)\s+(\d{4})$', '\1 \2 \3');
    ELSIF r.date_raw ~ '^\d{1,2}\s+[A-Za-z]+\s+\d{4}$' THEN
      candidate := r.date_raw;
    ELSIF r.date_raw ~ '^[A-Za-z]+\s+\d{4}$' THEN
      candidate := '1 ' || r.date_raw;
    END IF;

    IF candidate IS NOT NULL THEN
      BEGIN
        parsed := to_date(candidate, 'FMDD FMMonth YYYY');
      EXCEPTION WHEN OTHERS THEN
        BEGIN
          parsed := to_date(candidate, 'FMDD Mon YYYY');
        EXCEPTION WHEN OTHERS THEN
          parsed := NULL;
        END;
      END;
    END IF;

    IF parsed IS NOT NULL THEN
      UPDATE public.events SET sort_date = parsed WHERE id = r.id;
    END IF;
  END LOOP;
END $$;