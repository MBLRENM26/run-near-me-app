import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from research_payload import FIELDS, main, validate_envelope, validate_extraction


FIXTURE = Path(__file__).with_name("research-payload-example.json")


class ResearchPayloadTests(unittest.TestCase):
    def test_shared_handoff_example(self):
        body = json.loads(FIXTURE.read_text())
        self.assertEqual(validate_envelope(body), body)

    def test_existing_extractor_fixtures_satisfy_transport_contract(self):
        cases = json.loads(Path(__file__).with_name("event-facts-contract-fixtures.json").read_text())
        for case in cases:
            validate_extraction(case["expected"])

    def test_bad_payloads_cannot_enter_delivery(self):
        for change in [
            lambda o: o.update(proposal={"kind": "page_change"}),
            lambda o: o["evidence"].update(summary="whole page " * 100),
            lambda o: o["evidence"].update(summary="<p>Page body</p>"),
            lambda o: o["proposal"]["extraction"]["facts"][0].update(field="distance"),
            lambda o: o["proposal"]["extraction"]["facts"][0].update(quote="x" * 241),
            lambda o: o["proposal"]["extraction"].update(missing_fields=[]),
            lambda o: o["evidence"].update(captured_at="2999-01-01T00:00:00Z"),
            lambda o: o["proposal"]["extraction"].update(issues=["Edition conflict"]),
        ]:
            body = json.loads(FIXTURE.read_text())
            change(body["observations"][0])
            with self.assertRaises(ValueError):
                validate_envelope(body)

    def test_empty_extraction_is_explicit_not_a_blank_page_change(self):
        body = json.loads(FIXTURE.read_text())
        item = body["observations"][0]
        item["proposal"]["extraction"] = {"version": 1, "facts": [], "missing_fields": sorted(FIELDS), "issues": ["No supported facts; rendered review needed."]}
        item["conflicts"] = item["proposal"]["extraction"]["issues"]
        validate_envelope(body)
        item["proposal"]["extraction"]["issues"] = []
        with self.assertRaisesRegex(ValueError, "empty extraction"):
            validate_envelope(body)

    def test_build_preserves_capture_metadata_and_refuses_overwriting_a_retry(self):
        original = json.loads(FIXTURE.read_text())["observations"][0]
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "extraction.json").write_text(json.dumps(original["proposal"]["extraction"]))
            (root / "evidence.json").write_text(json.dumps(original["evidence"]))
            argv = ["research_payload.py", "build", "--extraction", str(root / "extraction.json"), "--evidence", str(root / "evidence.json"), "--source-id", original["source_id"], "--run-id", original["run_id"], "--output", str(root / "out.json")]
            with patch("sys.argv", argv): main()
            saved = (root / "out.json").read_bytes()
            result = json.loads(saved)["observations"][0]
            self.assertEqual(result["evidence"], original["evidence"])
            self.assertEqual(result["proposal"], original["proposal"])
            with patch("sys.argv", argv), self.assertRaises(SystemExit): main()
            self.assertEqual((root / "out.json").read_bytes(), saved)


if __name__ == "__main__":
    unittest.main()
