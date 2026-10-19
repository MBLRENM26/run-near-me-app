import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import monitor

SOURCE={"id":"11111111-1111-4111-8111-111111111111","url":"https://club.example/race","enabled":True,"interval_hours":24,"policy_note":"Public race page pilot"}
def page(label): return ("<h1>Race "+label+"</h1><p>Official information about the local running race and how to find the organiser and the current entry page.</p>").encode()

class MonitorTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.path=str(Path(self.tmp.name)/"monitor.sqlite")
        self.db=monitor.connect(self.path)
    def tearDown(self):
        self.db.close();self.tmp.cleanup()
    def test_restart_no_change_and_a_b_a(self):
        a=lambda _: (SOURCE["url"],page("Edition A"))
        b=lambda _: (SOURCE["url"],page("Edition B"))
        self.assertEqual(monitor.observe(self.db,SOURCE,a,100000),"changed")
        first=monitor.pending(self.db)[0]
        self.db.close();self.db=monitor.connect(self.path)
        self.assertEqual(monitor.observe(self.db,SOURCE,a,200000),"unchanged")
        self.assertEqual(monitor.observe(self.db,SOURCE,b,300000),"changed")
        self.assertEqual(monitor.observe(self.db,SOURCE,a,400000),"changed")
        outbox=monitor.pending(self.db)
        self.assertEqual(len(outbox),3)
        self.assertEqual(outbox[0],first)
        self.assertNotEqual(outbox[0]["id"],outbox[2]["id"])
    def test_failure_keeps_good_hash_and_has_backoff(self):
        monitor.observe(self.db,SOURCE,lambda _: (SOURCE["url"],page("A")),100000)
        old=self.db.execute("select last_hash from sources").fetchone()[0]
        def fail(_): raise TimeoutError("offline")
        self.assertEqual(monitor.observe(self.db,SOURCE,fail,200000),"failed")
        self.assertEqual(self.db.execute("select last_hash from sources").fetchone()[0],old)
        self.assertEqual(monitor.observe(self.db,SOURCE,fail,200001),"not_due")
        self.assertEqual(len(monitor.pending(self.db)),1)
    def test_pause_and_url_change(self):
        self.assertEqual(monitor.observe(self.db,{**SOURCE,"enabled":False}),"paused")
        monitor.observe(self.db,SOURCE,lambda _: (SOURCE["url"],page("A")),100000)
        with self.assertRaisesRegex(ValueError,"source_url_changed"):
            monitor.observe(self.db,{**SOURCE,"url":"https://other.example/race"},now=200000)
    def test_private_dns_mixed_answer_and_credentials(self):
        for addresses in [["127.0.0.1"],["169.254.169.254"],["93.184.216.34","10.0.0.1"],["::1"]]:
            answers=[(None,None,None,None,(a,443)) for a in addresses]
            with patch("monitor.socket.getaddrinfo",return_value=answers):
                with self.assertRaisesRegex(ValueError,"non_public"):
                    monitor.public_addresses("club.example")
        for url in ["http://example.org","https://a:b@example.org","https://example.org:8080"]:
            with self.assertRaises(ValueError):monitor.validate_url(url)
    def test_delivery_failure_keeps_outbox_retry_uses_same_id(self):
        monitor.observe(self.db,SOURCE,lambda _: (SOURCE["url"],page("A")),100000)
        before=monitor.pending(self.db)
        with patch("monitor.request",return_value=(503,{},b'{}')):
            with self.assertRaises(ValueError):monitor.deliver(self.db,"https://example.org/api","fixture")
        self.assertEqual(monitor.pending(self.db),before)
        with patch("monitor.request",return_value=(200,{},b'{"ok":true}')):
            self.assertEqual(monitor.deliver(self.db,"https://example.org/api","fixture"),1)
        self.assertEqual(monitor.pending(self.db),[])
    def test_script_content_is_not_evidence(self):
        text=monitor.extract(page("Race")+b'<script>injected instruction</script>')
        self.assertNotIn("injected",text)
    def test_page_body_is_transient_and_notice_retry_is_immutable(self):
        raw=page("Local 10K")+b'<nav>PRIVATE-PAGE-COPY Navigation junk</nav><p>Race date: 21 March 2027</p>'
        fetch=lambda _: (SOURCE['url'],raw)
        self.assertEqual(monitor.observe(self.db,SOURCE,fetch,100000),'changed')
        first=monitor.pending(self.db)[0]
        self.assertEqual(first['evidence']['content_sha256'],monitor.hashlib.sha256(raw).hexdigest())
        self.assertNotIn('PRIVATE-PAGE-COPY',str(first))
        self.assertNotIn('21 March 2027',first['evidence']['summary'])
        self.assertLess(len(first['evidence']['summary']),200)
        self.assertEqual(monitor.observe(self.db,SOURCE,fetch,200000),'unchanged')
        self.assertEqual(self.db.execute('select count(*) from source_captures').fetchone()[0],0)
        self.assertEqual(monitor.pending(self.db),[first])

    def test_noise_suppression_link_changes_and_extractor_baseline(self):
        a=page('Local 10K')+b'<p>Enter <a href="https://entry.example/2026">here</a></p>'
        fetch=lambda raw: lambda _: (SOURCE['url'],raw)
        monitor.observe(self.db,SOURCE,fetch(a),100000)
        monitor.observe(self.db,SOURCE,fetch(a+b'<nav>New menu</nav>'),200000)
        self.assertEqual(len(monitor.pending(self.db)),1)
        monitor.observe(self.db,SOURCE,fetch(a.replace(b'/2026',b'/2027')),300000)
        self.assertEqual(len(monitor.pending(self.db)),2)
        self.db.execute('delete from source_extractions');self.db.commit()
        # No due-date reset needed for upgrading from the metadata-only observer.
        monitor.observe(self.db,SOURCE,fetch(a.replace(b'/2026',b'/2027')),400000)
        self.assertEqual(len(monitor.pending(self.db)),3)

    def test_delivery_batches_by_utf8_bytes_without_mutating_pending_payloads(self):
        for i in range(50):
            self.db.execute('insert into outbox(id,payload) values(?,?)',(str(i),json.dumps({'id':str(i),'fixture_padding':'é'*6000})))
        self.db.commit()
        original=monitor.pending(self.db)
        with patch('monitor.request',return_value=(200,{},b'{"ok":true}')) as request:
            delivered=monitor.deliver(self.db,'https://example.org/api','fixture')
        self.assertGreater(delivered,0);self.assertLess(delivered,50)
        self.assertLessEqual(len(request.call_args.args[2]),512000)
        self.assertEqual(monitor.pending(self.db),original[delivered:])

    def test_structured_event_on_a_thin_page_is_still_extracted(self):
        raw=b'<script type="application/ld+json">{"@type":"SportsEvent","name":"Race","startDate":"2026-10-11"}</script>'
        self.assertEqual(monitor.observe(self.db,SOURCE,lambda _: (SOURCE['url'],raw),100000),'changed')
        self.assertTrue(any(f['field']=='date_from' for f in monitor.pending(self.db)[0]['proposal']['extraction']['facts']))


if __name__=="__main__": unittest.main()
