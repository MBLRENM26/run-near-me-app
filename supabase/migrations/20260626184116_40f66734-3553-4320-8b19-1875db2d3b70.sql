update public.sync_runs
   set status = 'error',
       finished_at = now(),
       error_message = 'Worker terminated before sync completed (pre-fix)'
 where source = 'scottish-athletics-clubs'
   and status = 'running'
   and finished_at is null;