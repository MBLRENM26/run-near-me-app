-- Fix broken duplicate pointers surfaced in GSC 404 audit (2026-07-08)
-- 1. Mid Kent 5 Miler: two DUPLICATE rows point at another DUPLICATE (chain
--    dead-ends). Repoint both directly at the ACTIVE survivor so /events
--    loader can 301 them.
UPDATE public.events
   SET duplicate_of = 'd55c6146-87c8-4012-8e4f-6781e1b6d985'
 WHERE slug IN ('mid-kent-5-miler-mid-kent-2026','mid-kent-5-miler-2')
   AND status = 'DUPLICATE';

-- 2. Pinhaw Trail Race: EXPIRED town-suffixed slug has a live ACTIVE
--    survivor at /events/pinhaw-trail-race. Promote to DUPLICATE so the
--    loader 301s instead of 404s.
UPDATE public.events
   SET status = 'DUPLICATE',
       duplicate_of = 'f90235ea-b687-4482-9042-db95060a4ae6'
 WHERE slug = 'pinhaw-trail-race-tbc-2026';