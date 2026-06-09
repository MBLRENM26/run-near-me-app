UPDATE public.events
SET town = regexp_replace(town, '[,\s]+$', '')
WHERE source = 'scottishathletics' AND town ~ '[,\s]+$';