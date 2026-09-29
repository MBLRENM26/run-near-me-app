import importlib.util
import json
from pathlib import Path
import signal
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import tarfile
from backup_pilot import backup

spec = importlib.util.spec_from_file_location('launcher', Path(__file__).with_name('run-pilot.py'))
launcher = importlib.util.module_from_spec(spec);spec.loader.exec_module(launcher)

class ServiceTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory();self.root = Path(self.tmp.name)
        (self.root/'state').mkdir()
    def tearDown(self):self.tmp.cleanup()
    def test_orphan_ownership_requires_label_image_and_state_path(self):
        info = {'Config':{'Labels':{'renm.purpose':launcher.LABEL},'Image':'sha256:fixture'},
                'Mounts':[{'Source':str(self.root/'state'),'Destination':'/state'}]}
        self.assertTrue(launcher.owned_container(info,self.root,'sha256:fixture'))
        self.assertFalse(launcher.owned_container(info,self.root,'sha256:other'))
        self.assertFalse(launcher.owned_container(info,self.root/'other','sha256:fixture'))
        info['Config']['Labels'] = {}
        self.assertFalse(launcher.owned_container(info,self.root,'sha256:fixture'))
    def test_refuses_foreign_named_container_without_stopping_it(self):
        with patch.object(launcher,'docker',side_effect=[subprocess.CompletedProcess([],0,'id\n'),
              subprocess.CompletedProcess([],0,json.dumps([{'Config':{},'Mounts':[]}]))]) as cmd:
            with self.assertRaisesRegex(ValueError,'another_runtime'):
                launcher.reconcile_container(self.root,'sha256:fixture')
        self.assertEqual(cmd.call_count,2)
    def test_completed_policy_skips_docker_until_policy_changes(self):
        policy = {'end_at':'2026-10-13T18:38:49+00:00'}
        for name in ['pilot.json','state/completed-policy.json']:
            (self.root/name).write_text(json.dumps(policy))
        with patch.object(launcher,'docker') as cmd:
            self.assertEqual(launcher.run(self.root),0);cmd.assert_not_called()
        (self.root/'pilot.json').write_text(json.dumps({'end_at':'2026-10-14T18:38:49+00:00'}))
        self.assertFalse(launcher.completed(self.root))
    def test_invalid_runtime_writes_durable_failure_status(self):
        (self.root/'deployment.json').write_text('{"image_id":"mutable:latest"}')
        with patch.object(launcher,'docker') as cmd:
            self.assertEqual(launcher.run(self.root),1);cmd.assert_not_called()
        report = json.loads((self.root/'state/launcher-status.json').read_text())
        self.assertEqual(report['error'],'immutable_local_image_required')
    def test_backup_archive_excludes_secret_and_rejects_wrong_remote_hash(self):
        (self.root/'state/backups').mkdir();(self.root/'state/runs').mkdir();(self.root/'private').mkdir()
        (self.root/'private/research-feed-secret').write_text('never-export-this')
        for name in ['sources.json','pilot.json','deployment.json']:(self.root/name).write_text('{}')
        (self.root/'backup.json').write_text(json.dumps({'ssh_host':'m5','remote_directory':'.local/share/renm-pilot-backups/fixture'}))
        with sqlite3.connect(self.root/'state/backups/2026-09-29.sqlite') as db:db.execute('create table example(id integer)')
        calls=[]
        def command(args,**kwargs):
            calls.append(args)
            return subprocess.CompletedProcess(args,0,'wronghash  archive' if 'sha256sum' in args[-1] else '')
        with patch('backup_pilot.subprocess.run',side_effect=command):
            with self.assertRaisesRegex(ValueError,'hash_mismatch'):backup(self.root,{'backup':'2026-09-29.sqlite'})
        self.assertFalse(any('chmod' in c[-1] for c in calls))
        with tarfile.open(self.root/'state/recovery-transfer.tar.gz') as bundle:
            self.assertEqual(set(bundle.getnames()),{'state/backups/2026-09-29.sqlite','sources.json','pilot.json','deployment.json'})
        self.assertEqual(json.loads((self.root/'state/offhost-backup-status.json').read_text())['status'],'attention')
    def test_sigkill_preserves_committed_outbox_and_rolls_back_partial_transaction(self):
        script = '''import sqlite3,sys,time
c=sqlite3.connect(sys.argv[1]);c.execute('pragma journal_mode=WAL')
c.execute('create table outbox(id text primary key,payload text,delivered integer)')
c.execute("insert into outbox values('committed','evidence',0)");c.commit()
c.execute("insert into outbox values('inflight','unfinished',0)")
print('ready',flush=True);time.sleep(60)
'''
        db = self.root/'state/fixture.sqlite'
        child = subprocess.Popen([sys.executable,'-c',script,str(db)],stdout=subprocess.PIPE,text=True)
        try:
            self.assertEqual(child.stdout.readline().strip(),'ready')
            child.send_signal(signal.SIGKILL);child.wait(timeout=5)
            with sqlite3.connect(db) as c:
                self.assertEqual(c.execute('pragma integrity_check').fetchone()[0],'ok')
                self.assertEqual(c.execute('select * from outbox').fetchall(),[('committed','evidence',0)])
        finally:
            if child.poll() is None:child.kill();child.wait()
            child.stdout.close()

if __name__ == '__main__':unittest.main()
