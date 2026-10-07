-- Add app columns to the minimal disposable source-research test fixture.
ALTER TABLE events ADD COLUMN location_raw text, ADD COLUMN town text,
 ADD COLUMN county text, ADD COLUMN region text, ADD COLUMN country text,
 ADD COLUMN lat double precision, ADD COLUMN lng double precision;
ALTER TABLE event_edits ADD COLUMN edited_at timestamptz DEFAULT clock_timestamp();
CREATE TABLE sync_runs(id uuid PRIMARY KEY DEFAULT gen_random_uuid());
