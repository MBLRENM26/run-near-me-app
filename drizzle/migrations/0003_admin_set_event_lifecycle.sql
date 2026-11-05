CREATE OR REPLACE FUNCTION public.admin_set_event_lifecycle(_id uuid, _status text, _clear_duplicate boolean DEFAULT false)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prev text := coalesce(current_setting('renm.review_write_mode', true), ''); result text;
BEGIN
  PERFORM set_config('renm.review_write_mode', 'strict', true);
  UPDATE public.events SET status = _status,
    duplicate_of = CASE WHEN _clear_duplicate THEN NULL ELSE duplicate_of END
  WHERE id = _id RETURNING status INTO result;
  PERFORM set_config('renm.review_write_mode', prev, true);
  IF result IS NULL THEN RAISE EXCEPTION 'Event not found'; END IF;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_set_event_lifecycle(uuid, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_event_lifecycle(uuid, text, boolean) TO service_role;