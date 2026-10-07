import subprocess,time,pathlib
root=pathlib.Path(__file__).resolve().parents[1];name='renm-import-integrity-test-'+str(__import__('os').getpid())
files=['scripts/source-research-test-bootstrap.sql','supabase/migrations/20260717185719_e9588572-2a89-48de-899c-16579891c5f7.sql','supabase/migrations/20260717190958_25b782ef-2a76-4afe-8042-579a5c3ab65d.sql','supabase/migrations/20260717194131_0afb2fc0-37f5-4d10-9547-e5ce88d25226.sql','supabase/migrations/20260918230000_orl_accept_and_apply_organiser.sql','supabase/migrations/20260928161159_6dfabb8e-ea21-497b-b407-31f40a9c17bc.sql','supabase/migrations/20260929170000_source_research_pilot.sql','supabase/migrations/20260929171000_research_workflow_compatibility.sql','supabase/migrations/20261006173000_reviewed_distances.sql','supabase/migrations/20261007070000_reviewed_names.sql','scripts/source-research-test.sql','scripts/reviewed-distances-test.sql','scripts/reviewed-names-test.sql','supabase/migrations/20261007083000_reviewed_lifecycle.sql','scripts/reviewed-lifecycle-test.sql','scripts/reviewed-geography-test-bootstrap.sql','supabase/migrations/20261007093000_reviewed_geography_and_sync_integrity.sql','scripts/reviewed-geography-test.sql','scripts/reviewed-distances-test.sql','scripts/reviewed-names-test.sql']
subprocess.run(['docker','run','--rm','-d','--name',name,'--network','none','--tmpfs','/var/lib/postgresql/data','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:16'],check=True,capture_output=True)
try:
 for i in range(20):
  r=subprocess.run(['docker','exec',name,'pg_isready','-U','postgres'],capture_output=True)
  if r.returncode==0 and 'PostgreSQL init process complete' in subprocess.run(['docker','logs',name],capture_output=True,text=True).stdout:break
  time.sleep(.5)
 for f in files:
  r=subprocess.run(['docker','exec','-i',name,'psql','-U','postgres','-v','ON_ERROR_STOP=1'],input=(root/f).read_text(),text=True,capture_output=True)
  if r.returncode:print(f,r.stderr[-3000:]);raise SystemExit(r.returncode)
  print('PASS',f)
finally:
 subprocess.run(['docker','stop',name],check=True,capture_output=True)
