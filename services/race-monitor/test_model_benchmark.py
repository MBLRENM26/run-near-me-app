import unittest
import tempfile
import hashlib
import json
from pathlib import Path
from unittest.mock import patch
from model_benchmark import validate,run
class ValidationTests(unittest.TestCase):
 def item(self):
  return {'date':None,'candidate_date':None,'schedule':None,'organiser':None,'entry_url':None,'entry_status':'unknown','review_reason':'insufficient_evidence','evidence':[]}
 def test_unknown_is_valid_and_invented_quote_is_rejected(self):
  v=self.item();self.assertEqual(validate(v,'Date not announced'),[])
  v['organiser']='Imagined Club';v['evidence']=[{'field':'organiser','quote':'Imagined Club organises this race'}]
  self.assertIn('quote_not_in_source',validate(v,'Date not announced'))
 def test_mixed_edition_cannot_confirm_a_date(self):
  v=self.item();v.update(date='2027-01-01',review_reason='mixed_editions',evidence=[{'field':'date','quote':'1 January 2027'}])
  self.assertIn('unsafe_confirmed_date',validate(v,'1 January 2027'))
 def test_new_url_must_be_present_in_input(self):
  v=self.item();v.update(entry_url='https://invented.example',evidence=[{'field':'entry_url','quote':'Enter now'}])
  self.assertIn('unseen_entry_url',validate(v,'Enter now'))
class RunnerTests(unittest.TestCase):
 def fixture(self):
  return {'id':'test','text':'Date not announced','sha256':hashlib.sha256(b'Date not announced').hexdigest(),'input_kind':'synthetic','race':'Test','source_url':'https://example.invalid','expected':{}}
 def test_fixture_tampering_rejected_before_request(self):
  f=self.fixture();f['text']='Different text'
  with tempfile.TemporaryDirectory() as out,patch('model_benchmark.request') as req:
   with self.assertRaisesRegex(ValueError,'fixture_hash_mismatch'):run([f],out,8080,'test')
   req.assert_not_called()
 def test_resume_rejects_changed_prompt_settings(self):
  f=self.fixture()
  with tempfile.TemporaryDirectory() as out,patch('model_benchmark.request') as req:
   Path(out,'test.json').write_text(json.dumps({'input_sha256':f['sha256'],'model':'test','config_sha256':'old-config'}))
   with self.assertRaisesRegex(ValueError,'resume_config_changed'):run([f],out,8080,'test')
   req.assert_not_called()
if __name__=='__main__':unittest.main()
