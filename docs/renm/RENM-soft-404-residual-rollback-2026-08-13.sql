-- Exact rollback for 20260813201539_renm_soft404_residual.sql.
--
-- The forward migration stored the exact field-level before/after values in
-- event_edits. This rollback refuses to overwrite any subsequent change: each
-- current value must still equal the package's recorded "to" value. Rows are
-- reversed newest-first so duplicate pointers are restored before survivors.

DO $renm_rollback$
DECLARE
  audit record;
  diff jsonb;
  current_row jsonb;
  item record;
  affected integer;
BEGIN
  FOR audit IN
    SELECT ee.id, ee.event_id, ee.changes
      FROM public.event_edits ee
     WHERE ee.changes ->> 'package' = 'renm-soft404-residual-2026-08-13'
       AND ee.changes ->> 'action' = 'renm_soft404_residual_patch'
     ORDER BY ee.edited_at DESC, ee.id DESC
  LOOP
    diff := audit.changes -> 'diff';

    SELECT to_jsonb(e)
      INTO current_row
      FROM public.events e
     WHERE e.id = audit.event_id;

    IF current_row IS NULL THEN
      RAISE EXCEPTION 'RENM soft-404 rollback target missing: %', audit.event_id;
    END IF;

    FOR item IN
      SELECT key, value
        FROM jsonb_each(diff)
    LOOP
      IF current_row -> item.key IS DISTINCT FROM item.value -> 'to' THEN
        RAISE EXCEPTION USING
          MESSAGE = format('RENM soft-404 rollback drift at %s field %s', audit.event_id, item.key),
          DETAIL = format('Expected current value: %s; actual: %s', item.value -> 'to', current_row -> item.key);
      END IF;
    END LOOP;

    UPDATE public.events e
       SET name = CASE WHEN diff ? 'name' THEN diff -> 'name' ->> 'from' ELSE e.name END,
           date_raw = CASE WHEN diff ? 'date_raw' THEN diff -> 'date_raw' ->> 'from' ELSE e.date_raw END,
           town = CASE WHEN diff ? 'town' THEN diff -> 'town' ->> 'from' ELSE e.town END,
           county = CASE WHEN diff ? 'county' THEN diff -> 'county' ->> 'from' ELSE e.county END,
           region = CASE WHEN diff ? 'region' THEN diff -> 'region' ->> 'from' ELSE e.region END,
           country = CASE WHEN diff ? 'country' THEN diff -> 'country' ->> 'from' ELSE e.country END,
           distances = CASE WHEN diff ? 'distances' THEN diff -> 'distances' ->> 'from' ELSE e.distances END,
           entry_fee = CASE WHEN diff ? 'entry_fee' THEN diff -> 'entry_fee' ->> 'from' ELSE e.entry_fee END,
           organiser = CASE WHEN diff ? 'organiser' THEN diff -> 'organiser' ->> 'from' ELSE e.organiser END,
           entry_url = CASE WHEN diff ? 'entry_url' THEN diff -> 'entry_url' ->> 'from' ELSE e.entry_url END,
           organiser_url = CASE WHEN diff ? 'organiser_url' THEN diff -> 'organiser_url' ->> 'from' ELSE e.organiser_url END,
           licensed = CASE WHEN diff ? 'licensed' THEN diff -> 'licensed' ->> 'from' ELSE e.licensed END,
           status = CASE WHEN diff ? 'status' THEN diff -> 'status' ->> 'from' ELSE e.status END,
           date_from = CASE WHEN diff ? 'date_from' THEN (diff -> 'date_from' ->> 'from')::date ELSE e.date_from END,
           date_to = CASE WHEN diff ? 'date_to' THEN (diff -> 'date_to' ->> 'from')::date ELSE e.date_to END,
           sort_date = CASE WHEN diff ? 'sort_date' THEN (diff -> 'sort_date' ->> 'from')::date ELSE e.sort_date END,
           duplicate_of = CASE WHEN diff ? 'duplicate_of' THEN (diff -> 'duplicate_of' ->> 'from')::uuid ELSE e.duplicate_of END,
           distance_tags = CASE WHEN diff ? 'distance_tags' THEN ARRAY(SELECT jsonb_array_elements_text(diff -> 'distance_tags' -> 'from')) ELSE e.distance_tags END,
           terrain_tags = CASE WHEN diff ? 'terrain_tags' THEN ARRAY(SELECT jsonb_array_elements_text(diff -> 'terrain_tags' -> 'from')) ELSE e.terrain_tags END,
           series_key = CASE WHEN diff ? 'series_key' THEN diff -> 'series_key' ->> 'from' ELSE e.series_key END,
           governance = CASE WHEN diff ? 'governance' THEN (diff -> 'governance' ->> 'from')::public.event_governance ELSE e.governance END,
           organiser_type = CASE WHEN diff ? 'organiser_type' THEN (diff -> 'organiser_type' ->> 'from')::public.event_organiser_type ELSE e.organiser_type END,
           race_profile = CASE WHEN diff ? 'race_profile' THEN (diff -> 'race_profile' ->> 'from')::public.event_race_profile ELSE e.race_profile END,
           is_upcoming = CASE WHEN diff ? 'is_upcoming' THEN (diff -> 'is_upcoming' ->> 'from')::boolean ELSE e.is_upcoming END,
           is_curated_tags = CASE WHEN diff ? 'is_curated_tags' THEN (diff -> 'is_curated_tags' ->> 'from')::boolean ELSE e.is_curated_tags END
     WHERE e.id = audit.event_id;

    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 1 THEN
      RAISE EXCEPTION 'RENM soft-404 rollback affected % rows for %; expected 1', affected, audit.event_id;
    END IF;

    DELETE FROM public.event_edits WHERE id = audit.id;
  END LOOP;
END
$renm_rollback$;
