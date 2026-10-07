-- Disposable test database only; actual reviewed-field and admin RPC migrations loaded.
\set ON_ERROR_STOP on
ALTER TABLE events ADD COLUMN IF NOT EXISTS date_to date;
ALTER TABLE events ADD COLUMN IF NOT EXISTS duplicate_of uuid REFERENCES events(id);
BEGIN;
INSERT INTO events(id,name,date_from,sort_date) VALUES
 ('22222222-2222-4222-8222-222222222224','Canonical','2026-10-17','2026-10-17'),
 ('22222222-2222-4222-8222-222222222225','Alias','2026-10-17','2026-10-17'),
 ('22222222-2222-4222-8222-222222222226','Cancelled 100K','2026-10-17','2026-10-17'),
 ('22222222-2222-4222-8222-222222222227','Unreviewed source status','2026-10-17','2026-10-17');
SELECT update_admin_event_checked('22222222-2222-4222-8222-222222222225','{"status":"DUPLICATE","duplicate_of":"22222222-2222-4222-8222-222222222224"}','Verified same race');
SELECT update_admin_event_checked('22222222-2222-4222-8222-222222222226','{"status":"CANCELLED"}','Exact 2026 100K cancellation');
UPDATE events SET status='ACTIVE',duplicate_of=NULL WHERE id IN ('22222222-2222-4222-8222-222222222225','22222222-2222-4222-8222-222222222226');
UPDATE events SET date_from='2027-10-17',sort_date='2027-10-17' WHERE id='22222222-2222-4222-8222-222222222226';
UPDATE events SET organiser='New metadata' WHERE id='22222222-2222-4222-8222-222222222226';
UPDATE events SET status='CANCELLED' WHERE id='22222222-2222-4222-8222-222222222227';
UPDATE events SET status='ACTIVE' WHERE id='22222222-2222-4222-8222-222222222227';
DO $$ BEGIN
 ASSERT (SELECT status='DUPLICATE' AND duplicate_of='22222222-2222-4222-8222-222222222224' FROM events WHERE id='22222222-2222-4222-8222-222222222225'),'import cannot reactivate duplicate';
 ASSERT (SELECT status='CANCELLED' AND date_from='2026-10-17' AND organiser='New metadata' FROM events WHERE id='22222222-2222-4222-8222-222222222226'),'reviewed cancellation remains same edition; metadata updates';
 ASSERT (SELECT status='ACTIVE' FROM events WHERE id='22222222-2222-4222-8222-222222222227'),'unreviewed source lifecycle stays source-owned';
END $$;
SELECT update_admin_event_checked('22222222-2222-4222-8222-222222222225','{"status":"ACTIVE","duplicate_of":null}','Reverse duplicate after review');
SELECT update_admin_event_checked('22222222-2222-4222-8222-222222222226','{"status":"ACTIVE"}','Explicit reviewed reinstatement');
DO $$ BEGIN
 ASSERT (SELECT count(*)=4 FROM events WHERE status='ACTIVE'),'audited manual reversal remains available';
 ASSERT NOT has_function_privilege('authenticated','protect_reviewed_event_lifecycle()','EXECUTE'),'no new public write permission';
END $$;
ROLLBACK;
SELECT 'Reviewed lifecycle checks passed' result;
