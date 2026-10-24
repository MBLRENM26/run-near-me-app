-- Read-only acceptance: division by zero fails any breached requirement.
SELECT 'Brecons organiser-confirmed start; unknown end' AS rule, 1 / (EXISTS (
 SELECT 1 FROM public.events WHERE id='9e5b8df7-7933-48b6-8c9e-c46fb08e5dfd'
 AND status='ACTIVE' AND date_from='2027-01-08' AND sort_date='2027-01-08'
 AND date_to IS NULL AND date_is_estimated=false
))::int AS passed
UNION ALL
SELECT 'York December held, not cancelled or deleted', 1 / (EXISTS (
 SELECT 1 FROM public.events WHERE id='0adad5cd-6426-4ed0-9d69-da76004d5cfa'
 AND status='HIDDEN' AND is_upcoming=false AND sort_date='2026-12-04'
))::int
UNION ALL
SELECT 'Exeter Sunday duplicate points to established Sunday', 1 / (EXISTS (
 SELECT 1 FROM public.events d JOIN public.events c ON c.id=d.duplicate_of
 WHERE d.id='b2e6ad21-c83b-4a3b-9c0e-2f894ada1c7e' AND d.status='DUPLICATE'
 AND c.id='377974ce-8e55-4be3-ab3b-2f2356b132b2' AND c.status='ACTIVE'
 AND c.sort_date='2027-02-07' AND d.sort_date=c.sort_date
))::int
UNION ALL
SELECT 'Exeter Saturday remains separate', 1 / (EXISTS (
 SELECT 1 FROM public.events WHERE id='96904057-42bd-48ac-b30a-18b6d31351ee'
 AND status='ACTIVE' AND duplicate_of IS NULL AND sort_date='2027-02-06'
))::int;