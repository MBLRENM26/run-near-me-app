-- One read-only snapshot: preserve raw backlog and verify completed supporting evidence.
-- STABLE uses the calling statement's snapshot for every query in this function.
CREATE OR REPLACE FUNCTION public.research_monitor_controls(_source_ids uuid[] DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  raw_count integer;
  support_count integer := 0;
  source_rows jsonb;
  parent record;
  note jsonb;
BEGIN
  IF _source_ids IS NOT NULL AND (
    cardinality(_source_ids) NOT BETWEEN 1 AND 30 OR
    array_position(_source_ids, NULL) IS NOT NULL OR
    cardinality(_source_ids) <> (SELECT count(DISTINCT id) FROM unnest(_source_ids) AS id)
  ) THEN RAISE EXCEPTION 'Invalid source selection'; END IF;

  -- JSON aggregation is one RPC result, not a PostgREST row-limited table response.
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', id, 'url', url, 'enabled', enabled,
      'interval_hours', interval_hours) ORDER BY id), '[]'::jsonb)
    INTO source_rows FROM public.research_sources
    WHERE _source_ids IS NULL OR id = ANY(_source_ids);
  IF (_source_ids IS NULL AND jsonb_array_length(source_rows) > 1000) OR
     (_source_ids IS NOT NULL AND jsonb_array_length(source_rows) <> cardinality(_source_ids))
  THEN RAISE EXCEPTION 'Source controls incomplete or oversized'; END IF;

  SELECT count(*) INTO raw_count FROM public.research_review_queue
    WHERE status IN ('pending', 'held');
  FOR parent IN SELECT id, source_id, review_note FROM public.research_review_queue
      WHERE status = 'pending' AND proposal = '{"kind":"page_change"}'::jsonb
  LOOP
    BEGIN note := parent.review_note::jsonb;
    EXCEPTION WHEN invalid_text_representation THEN CONTINUE; END;
    IF jsonb_typeof(note) IS DISTINCT FROM 'object' OR
       note->>'decision' IS DISTINCT FROM 'relationship_accepted' OR
       EXISTS (SELECT 1 FROM unnest(ARRAY['derived_observation_id','event_id','club_id','organisation_id']) AS k
         WHERE jsonb_typeof(note->k) IS DISTINCT FROM 'string' OR length(note->>k) = 0)
    THEN CONTINUE; END IF;
    IF EXISTS (
      SELECT 1 FROM public.research_review_queue AS derived
      WHERE derived.id::text = note->>'derived_observation_id'
        AND derived.status = 'applied' AND derived.source_id = parent.source_id
        AND derived.proposal->>'kind' = 'club_relationship'
        AND derived.proposal->>'event_id' = note->>'event_id'
        AND derived.proposal->>'club_id' = note->>'club_id'
        AND derived.proposal->>'organisation_id' = note->>'organisation_id'
        AND position(parent.id::text IN coalesce(derived.review_note, '')) > 0
    ) THEN support_count := support_count + 1; END IF;
  END LOOP;
  RETURN jsonb_build_object('sources', source_rows, 'pending_review', raw_count,
    'review_workload', jsonb_build_object('version', 1, 'raw_outstanding', raw_count,
      'verified_completed_support', support_count, 'actionable_review', raw_count - support_count));
END;
$$;
REVOKE ALL ON FUNCTION public.research_monitor_controls(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.research_monitor_controls(uuid[]) TO service_role;
