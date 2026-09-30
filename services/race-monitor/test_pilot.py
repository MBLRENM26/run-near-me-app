import copy
from datetime import datetime,timezone
import json
from pathlib import Path
import tempfile
import time
import unittest
from unittest.mock import patch
import monitor
import pilot
from test_monitor import SOURCE,page

class PilotTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
        self.secret=self.root/'secret';self.secret.write_text('fixture-signing-secret-32-characters')
        self.now=time.time();self.config={'version':1,'sources':[copy.deepcopy(SOURCE)]}
        dt=lambda t:datetime.fromtimestamp(t,timezone.utc).isoformat()
        self.policy={'start_at':dt(self.now-60),'end_at':dt(self.now+86400),'endpoint':pilot.ENDPOINT,'source_config_sha256':pilot.config_hash(self.config)}
    def tearDown(self):self.tmp.cleanup()
    def manifest(self,enabled=True):
        return (200,{},json.dumps({'version':1,'sources':[{**SOURCE,'enabled':enabled}],'pending_review':0}).encode())
    def test_controls_pause_and_cannot_accelerate_local_schedule(self):
        local=copy.deepcopy(self.config);local['sources'][0]['interval_hours']=168
        with patch('monitor.request',return_value=self.manifest(False)) as req:
            sources,count=monitor.source_controls(pilot.ENDPOINT,'fixture',local)
        self.assertFalse(sources[0]['enabled']);self.assertEqual(sources[0]['interval_hours'],168)
        self.assertEqual(count,0);self.assertIn('x-renm-signature',req.call_args.kwargs['headers'])
    def test_missing_source_and_failed_auth_stop_controls(self):
        for response in [(401,{},b'{}'),(200,{},b'{"version":1,"sources":[],"pending_review":0}')]:
            with patch('monitor.request',return_value=response):
                with self.assertRaises(ValueError):monitor.source_controls(pilot.ENDPOINT,'fixture',self.config)
    def test_delivery_retry_preserves_evidence_and_acknowledges(self):
        db=monitor.connect(str(self.root/'monitor.sqlite'))
        monitor.observe(db,SOURCE,lambda _: (SOURCE['url'],page('A')),self.now);db.close()
        with patch('monitor.source_controls',return_value=([SOURCE],0)),patch('monitor.request',return_value=(503,{},b'{}')):
            report=pilot.run(self.config,self.policy,self.root,self.secret,self.now)
        self.assertEqual(report['status'],'attention');self.assertEqual(report['pending_observations'],1)
        self.assertTrue((self.root/'backups'/report['backup']).exists())
        with patch('monitor.source_controls',return_value=([SOURCE],0)),patch('monitor.request',return_value=(200,{},b'{"ok":true}')),patch('pilot.time.sleep'):
            report=pilot.run(self.config,self.policy,self.root,self.secret,self.now+2)
        self.assertEqual(report['status'],'ok');self.assertEqual(report['delivered'],1);self.assertEqual(report['pending_observations'],0)
        self.assertEqual(report['fetch'],{'not_due':1})
        self.assertEqual(report['mapped_sources'],1)
        self.assertEqual(report['mapped_observations'],1)
        self.assertGreater(report['mapped_payload_bytes'],0)
        self.assertEqual(report['retained_page_captures'],0)
    def test_review_backlog_stops_new_fetches(self):
        with patch('monitor.source_controls',return_value=([SOURCE],30)),patch('monitor.observe') as observe:
            report=pilot.run(self.config,self.policy,self.root,self.secret,self.now)
        self.assertEqual(report['status'],'review_backlog_paused');observe.assert_not_called()
    def test_local_pause_and_expiry_make_no_network_calls(self):
        (self.root/'PAUSED').touch()
        with patch('monitor.source_controls') as controls:
            report=pilot.run(self.config,self.policy,self.root,self.secret,self.now)
            self.assertEqual(report['status'],'paused');controls.assert_not_called()
            report=pilot.run(self.config,self.policy,self.root,self.secret,self.now+90000)
            self.assertEqual(report['status'],'complete');controls.assert_not_called()
    def test_changed_configuration_requires_review(self):
        changed=copy.deepcopy(self.config);changed['sources'][0]['url']='https://elsewhere.example'
        with patch('monitor.source_controls') as controls:
            with self.assertRaisesRegex(ValueError,'configuration_changed'):pilot.run(changed,self.policy,self.root,self.secret,self.now)
            controls.assert_not_called()
    def test_backup_restores_queue(self):
        db=monitor.connect(str(self.root/'monitor.sqlite'))
        monitor.observe(db,SOURCE,lambda _: (SOURCE['url'],page('A')),self.now)
        original=monitor.pending(db);name=pilot.backup(db,self.root,self.now);db.close()
        restored=monitor.connect(str(self.root/'backups'/name))
        self.assertEqual(monitor.pending(restored),original);restored.close()

if __name__=='__main__':unittest.main()
