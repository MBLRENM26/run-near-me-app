import json
import unittest
from unittest.mock import patch
import monitor
from test_monitor import SOURCE

class ControlsV2Tests(unittest.TestCase):
    def setUp(self):
        self.config={'sources':[SOURCE]}
        self.manifest={'version':2,'sources_complete':True,'requested_source_ids':[SOURCE['id']],
          'sources':[SOURCE],'pending_review':45,'review_workload':{'version':1,'raw_outstanding':45,
          'verified_completed_support':18,'actionable_review':27}}
    def controls(self, manifest=None, policy=None):
        with patch('monitor.request',return_value=(200,{},json.dumps(manifest or self.manifest).encode())) as request:
            result=monitor.source_controls('https://example.org/api','fixture',self.config,
                policy if policy is not None else {'review_counter':'verified_actionable_v1'})
            return result,request.call_args
    def test_explicit_policy_selects_verified_counter_and_signed_scope(self):
        audit={}
        with patch('monitor.request',return_value=(200,{},json.dumps(self.manifest).encode())):
            monitor.source_controls('https://example.org/api','fixture',self.config,{'review_counter':'verified_actionable_v1'},audit)
        self.assertEqual(audit['raw_pending_review'],45)
        self.assertEqual(audit['review_workload']['actionable_review'],27)
        (sources,count),call=self.controls()
        self.assertEqual(count,27);self.assertEqual(sources,[SOURCE])
        self.assertIn('?version=2&sources='+SOURCE['id'],call.args[0])
    def test_old_policy_does_not_silently_opt_in(self):
        with self.assertRaisesRegex(ValueError,'invalid_source_manifest'):self.controls(policy={})
    def test_partial_or_inconsistent_counts_stop_collection(self):
        import copy
        variants=[]
        for key,value in [('sources_complete',False),('requested_source_ids',[]),('sources',[]),('pending_review',44)]:
            m=copy.deepcopy(self.manifest);m[key]=value;variants.append(m)
        for key,value in [('version',2),('version',True),('raw_outstanding',True),('actionable_review',-1),('verified_completed_support',46),('actionable_review',0)]:
            m=copy.deepcopy(self.manifest);m['review_workload'][key]=value;variants.append(m)
        for m in variants:
            with self.subTest(manifest=m),self.assertRaises(ValueError):self.controls(m)
    def test_unknown_policy_stops_before_network(self):
        with patch('monitor.request') as request,self.assertRaises(ValueError):
            monitor.source_controls('https://example.org/api','fixture',self.config,{'review_counter':'guess'})
        request.assert_not_called()
