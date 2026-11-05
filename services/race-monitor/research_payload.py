"""Offline research handoff contract. No fetching, credentials or live writes.

Build from compact extraction + original capture metadata, or validate a complete
envelope before signing/importing it. Never repair evidence by guessing values.
"""
import argparse
from datetime import date, datetime, timezone
import json
import math
from pathlib import Path
import re
from urllib.parse import urlsplit
from uuid import UUID, uuid4

FIELDS = json.loads(Path(__file__).with_name("event-fields.json").read_text())
MAX_SUMMARY = 400


def require(condition, message):
    if not condition:
        raise ValueError(message)


def text(value, maximum):
    return isinstance(value, str) and bool(value.strip()) and len(value) <= maximum


def valid_url(value, maximum=2000):
    try:
        u = urlsplit(value)
        return text(value, maximum) and u.scheme in ("http", "https") and bool(u.hostname) and not u.username and not u.password and not any(ord(c) <= 32 for c in value)
    except (ValueError, TypeError, AttributeError):
        return False


def valid_date(value):
    try:
        return isinstance(value, str) and date.fromisoformat(value).isoformat() == value
    except ValueError:
        return False


def validate_extraction(extraction):
    require(isinstance(extraction, dict) and set(extraction) == {"version", "facts", "missing_fields", "issues"}, "extraction: expected version, facts, missing_fields and issues only")
    require(type(extraction["version"]) is int and extraction["version"] == 1, "extraction.version: expected 1")
    facts, missing, issues = (extraction[k] for k in ["facts", "missing_fields", "issues"])
    require(isinstance(facts, list) and len(facts) <= 32, "facts: maximum 32")
    require(isinstance(issues, list) and len(issues) <= 10 and all(text(i, 240) for i in issues), "issues: maximum 10 short explanations")
    present, unique = set(), set()
    quotes = 0
    for i, fact in enumerate(facts):
        require(isinstance(fact, dict) and set(fact) == {"field", "value", "quote", "locator"}, f"facts[{i}]: expected field, value, quote and locator only")
        field, value = fact["field"], fact["value"]
        require(isinstance(field, str) and field in FIELDS, f"facts[{i}]: unknown database field")
        rule = FIELDS[field]
        kind = rule["type"]
        valid = False
        if kind in ("string", "date", "url"):
            valid = text(value, rule.get("max", 1000))
            if kind == "date": valid = valid and valid_date(value)
            if kind == "url": valid = valid and valid_url(value, rule["max"])
        elif kind == "number":
            valid = type(value) in (int, float) and math.isfinite(value) and rule["min"] <= value <= rule["max"]
        elif kind == "boolean":
            valid = type(value) is bool
        require(valid, f"facts[{i}].value: violates {field} field contract")
        require(text(fact["quote"], 240) and text(fact["locator"], 160), f"facts[{i}]: short quote and locator required")
        quotes += len(fact["quote"])
        fingerprint = json.dumps([field, value], ensure_ascii=False)
        require(fingerprint not in unique, f"facts[{i}]: duplicate fact")
        unique.add(fingerprint)
        present.add(field)
    require(quotes <= 4000, "facts: combined evidence exceeds 4000 characters")
    require(isinstance(missing, list) and all(isinstance(f, str) for f in missing) and sorted(missing) == sorted(set(FIELDS) - present), "missing_fields: must list each absent approved field exactly once")
    require(("lat" in present) == ("lng" in present), "coordinates: require an evidenced pair")
    require(not (any(f["field"] == "is_recurring" and f["value"] is True for f in facts) and present & {"date_from", "date_to"}), "weekly recurrence must remain undated")
    require(bool(facts) or bool(issues), "empty extraction requires an explanation in issues")
    return extraction


def validate_observation(item):
    require(isinstance(item, dict) and set(item) == {"id", "source_id", "run_id", "evidence", "proposal", "conflicts"}, "observation: unexpected or missing keys")
    for key in ["id", "source_id", "run_id"]:
        try:
            require(isinstance(item[key], str) and str(UUID(item[key])).lower() == item[key].lower(), f"{key}: expected UUID")
        except (ValueError, AttributeError):
            raise ValueError(f"{key}: expected UUID") from None
    evidence = item["evidence"]
    require(isinstance(evidence, dict) and set(evidence) == {"source_url", "final_url", "captured_at", "content_sha256", "extractor", "summary"}, "evidence: unexpected or missing keys")
    require(all(valid_url(evidence[k]) for k in ["source_url", "final_url"]), "evidence: valid credential-free HTTP(S) URLs required")
    try:
        captured = datetime.fromisoformat(evidence["captured_at"].replace("Z", "+00:00"))
        require(captured.tzinfo is not None and captured.timestamp() <= datetime.now(timezone.utc).timestamp() + 300, "captured_at: actual offset timestamp required; cannot be in future")
    except (ValueError, TypeError, AttributeError):
        raise ValueError("captured_at: actual offset timestamp required; cannot be in future") from None
    require(isinstance(evidence["content_sha256"], str) and bool(re.fullmatch(r"[a-f0-9]{64}", evidence["content_sha256"])), "content_sha256: original content SHA-256 required")
    require(text(evidence["extractor"], 100), "extractor: required, maximum 100 characters")
    require(text(evidence["summary"], MAX_SUMMARY) and not re.search(r"</?[a-z][^>]*>", evidence["summary"], re.I), "summary: plain text, maximum 400 characters; no page dumps")
    proposal = item["proposal"]
    require(isinstance(proposal, dict) and set(proposal) == {"kind", "extraction"} and proposal["kind"] == "page_change", "proposal: page_change requires structured extraction")
    validate_extraction(proposal["extraction"])
    conflicts = item["conflicts"]
    require(isinstance(conflicts, list) and len(conflicts) <= 20 and all(text(c, 1000) for c in conflicts), "conflicts: expected at most 20 short explanations")
    require(all(i in conflicts for i in proposal["extraction"]["issues"]), "conflicts: retain every extraction issue for review")
    return item


def validate_envelope(body):
    require(isinstance(body, dict) and set(body) == {"version", "observations"} and type(body["version"]) is int and body["version"] == 1, "envelope: expected version 1 and observations only")
    observations = body["observations"]
    require(isinstance(observations, list) and 1 <= len(observations) <= 50, "observations: expected 1–50")
    seen = set()
    for item in observations:
        validate_observation(item)
        require(item["id"] not in seen, "duplicate observation ID")
        seen.add(item["id"])
    require(len(json.dumps(body, ensure_ascii=False).encode()) <= 512000, "envelope: exceeds 512000 UTF-8 bytes")
    return body


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    check = commands.add_parser("validate", help="Check an existing envelope without modifying it")
    check.add_argument("input", type=Path)
    build = commands.add_parser("build", help="Wrap existing extraction and original capture metadata; no network")
    build.add_argument("--extraction", required=True, type=Path)
    build.add_argument("--evidence", required=True, type=Path)
    build.add_argument("--source-id", required=True)
    build.add_argument("--run-id", required=True)
    build.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    try:
        if args.command == "validate":
            body = validate_envelope(json.loads(args.input.read_text()))
        else:
            extraction = json.loads(args.extraction.read_text())
            body = validate_envelope({"version": 1, "observations": [{
                "id": str(uuid4()), "source_id": args.source_id, "run_id": args.run_id,
                "evidence": json.loads(args.evidence.read_text()),
                "proposal": {"kind": "page_change", "extraction": extraction},
                "conflicts": extraction.get("issues", []),
            }]})
            # An existing delivery must retain its ID and exact bytes on retry.
            with args.output.open("x") as output:
                output.write(json.dumps(body, ensure_ascii=False, indent=2) + "\n")
        print(f"Valid structured research: {len(body['observations'])} observation(s). No network or database writes.")
    except (ValueError, OSError) as exc:
        parser.exit(1, f"Research payload refused: {exc}\n")


if __name__ == "__main__":
    main()
