"""Bounded public-page observer. Python 3.12+, standard library only.

Source configuration and state are private runtime files, never repo seeds.
Observations are page evidence only: the worker cannot publish or infer races.
"""
import argparse
import hashlib
import hmac
import http.client
import ipaddress
import json
import os
from pathlib import Path
import re
import socket
import sqlite3
import ssl
import time
from datetime import datetime, timezone
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit
from urllib.robotparser import RobotFileParser
from uuid import UUID, uuid4

AGENT = "RENMResearch/1.0 (+https://runningeventsnearme.com)"
MAX_BODY = 2_000_000
EXTRACTOR = "html-visible-v1"


def public_addresses(host):
    addresses = sorted({row[4][0] for row in socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)})
    if not addresses or any(not ipaddress.ip_address(a).is_global for a in addresses):
        raise ValueError("non_public_destination")
    return addresses


def validate_url(url):
    u = urlsplit(url)
    if u.scheme != "https" or not u.hostname or u.username or u.password or u.port not in (None, 443):
        raise ValueError("https_public_source_required")
    if len(url) > 2000 or any(ord(c) < 33 for c in url):
        raise ValueError("invalid_url")
    return u


class PinnedHTTPS(http.client.HTTPSConnection):
    def __init__(self, host, address):
        super().__init__(host, timeout=20, context=ssl.create_default_context())
        self.address = address

    def connect(self):
        raw = socket.create_connection((self.address, 443), self.timeout)
        try:
            self.sock = self._context.wrap_socket(raw, server_hostname=self.host)
        except BaseException:
            raw.close()
            raise


def request(url, method="GET", body=None, headers=None):
    u = validate_url(url)
    # Resolve once, validate every address, then connect to a pinned IP while
    # verifying TLS against the original hostname. No environment proxy.
    conn = PinnedHTTPS(u.hostname, public_addresses(u.hostname)[0])
    try:
        path = (u.path or "/") + ("?" + u.query if u.query else "")
        conn.request(method, path, body=body, headers={"User-Agent": AGENT, "Accept-Encoding": "identity", **(headers or {})})
        response = conn.getresponse()
        length = response.getheader("Content-Length")
        if length and int(length) > MAX_BODY:
            raise ValueError("response_too_large")
        deadline = time.monotonic() + 30
        chunks = []
        size = 0
        while True:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise TimeoutError("response_deadline")
            if conn.sock:
                conn.sock.settimeout(min(20, remaining))
            part = response.read1(min(65536, MAX_BODY + 1 - size))
            if not part:
                break
            chunks.append(part)
            size += len(part)
            if size > MAX_BODY:
                raise ValueError("response_too_large")
        payload = b"".join(chunks)
        return response.status, dict((k.lower(), v) for k, v in response.getheaders()), payload
    finally:
        conn.close()


def robots_allowed(url):
    u = validate_url(url)
    robots_url = f"https://{u.netloc}/robots.txt"
    for _ in range(4):
        status, headers, raw = request(robots_url)
        if status in (301, 302, 303, 307, 308):
            robots_url = urljoin(robots_url, headers.get("location", ""))
            validate_url(robots_url)
            continue
        if status == 404:
            return True
        if status != 200:
            raise ValueError(f"robots_unavailable_{status}")
        rp = RobotFileParser()
        rp.parse(raw.decode("utf-8", errors="replace").splitlines())
        delay = rp.crawl_delay(AGENT) or rp.crawl_delay("*") or 0
        if delay > 30:
            raise ValueError("robots_delay_requires_manual_schedule")
        if delay:
            time.sleep(delay)
        return rp.can_fetch(AGENT, url)
    raise ValueError("robots_redirect_limit")


def fetch_page(url):
    current = url
    for _ in range(5):
        if not robots_allowed(current):
            raise ValueError("robots_disallowed")
        status, headers, raw = request(current)
        if status in (301, 302, 303, 307, 308):
            location = headers.get("location")
            if not location:
                raise ValueError("redirect_without_destination")
            current = urljoin(current, location)
            validate_url(current)
            continue
        if status != 200:
            raise ValueError(f"http_{status}")
        if "text/html" not in headers.get("content-type", ""):
            raise ValueError("unsupported_content_type")
        return current, raw
    raise ValueError("redirect_limit")


class VisibleText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.hidden = 0
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "noscript", "svg"):
            self.hidden += 1
        if tag in ("p", "br", "div", "li", "h1", "h2", "h3", "tr"):
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript", "svg"):
            self.hidden = max(0, self.hidden - 1)

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data + " ")


def extract(raw):
    parser = VisibleText()
    parser.feed(raw.decode("utf-8", errors="replace"))
    lines = [re.sub(r"\s+", " ", line).strip() for line in "".join(parser.parts).splitlines()]
    text = "\n".join(line for line in lines if line)
    if len(text) < 80:
        raise ValueError("insufficient_text_browser_review_required")
    return text


def connect(path):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path)
    db.execute("pragma journal_mode=WAL")
    db.executescript("""
      create table if not exists sources(id text primary key, url text not null, last_hash text,
        last_attempt real, last_success real, next_due real not null default 0, failures integer not null default 0, error text);
      create table if not exists outbox(id text primary key, payload text not null, delivered integer not null default 0);
    """)
    return db


def observe(db, source, fetch=fetch_page, now=None):
    now = time.time() if now is None else now
    sid = source["id"]
    UUID(sid)
    validate_url(source["url"])
    interval = int(source.get("interval_hours", 168))
    if not 24 <= interval <= 2160 or not str(source.get("policy_note", "")).strip():
        raise ValueError("invalid_source_policy")
    if not source.get("enabled", False):
        return "paused"
    if db.execute("select count(*) from outbox where delivered=0").fetchone()[0] >= 1000:
        return "backlog_full"
    row = db.execute("select url,last_hash,next_due,failures from sources where id=?", (sid,)).fetchone()
    if row and row[0] != source["url"]:
        raise ValueError("source_url_changed_requires_new_source_id")
    if row and now < row[2]:
        return "not_due"
    try:
        final_url, raw = fetch(source["url"])
        text = extract(raw)
        digest = hashlib.sha256(text.encode()).hexdigest()
        changed = not row or digest != row[1]
        with db:
            if changed:
                oid = str(uuid4())
                item = {"id": oid, "source_id": sid, "run_id": str(uuid4()), "evidence": {
                    "source_url": source["url"], "final_url": final_url,
                    "captured_at": datetime.fromtimestamp(now, timezone.utc).isoformat(),
                    "content_sha256": digest, "extractor": EXTRACTOR,
                    "summary": "Page text changed; facts require review.\n\n" + text[:5800]},
                    "proposal": {"kind": "page_change"}, "conflicts": []}
                db.execute("insert into outbox(id,payload) values(?,?)", (oid, json.dumps(item, ensure_ascii=False)))
            db.execute("insert into sources(id,url,last_hash,last_attempt,last_success,next_due,failures,error) values(?,?,?,?,?,?,0,null) on conflict(id) do update set last_hash=excluded.last_hash,last_attempt=excluded.last_attempt,last_success=excluded.last_success,next_due=excluded.next_due,failures=0,error=null", (sid,source["url"],digest,now,now,now+interval*3600))
        return "changed" if changed else "unchanged"
    except Exception as exc:
        failures = (row[3] if row else 0) + 1
        # Failure never means cancelled or disappeared; retain last good hash.
        with db:
            db.execute("insert into sources(id,url,last_attempt,next_due,failures,error) values(?,?,?,?,?,?) on conflict(id) do update set last_attempt=excluded.last_attempt,next_due=excluded.next_due,failures=excluded.failures,error=excluded.error", (sid,source["url"],now,now+min(24*3600,900*2**min(failures-1,7)),failures,type(exc).__name__+":"+str(exc)[:160]))
        return "failed"


def pending(db):
    return [json.loads(row[0]) for row in db.execute("select payload from outbox where delivered=0 order by rowid limit 50")]


def deliver(db, endpoint, secret):
    observations = pending(db)
    if not observations:
        return 0
    body = json.dumps({"version": 1, "observations": observations}, ensure_ascii=False, separators=(",", ":")).encode()
    if len(body) > 512_000:
        raise ValueError("batch_too_large")
    ts = str(int(time.time()))
    signature = hmac.new(secret.encode(), ts.encode()+b"."+body, hashlib.sha256).hexdigest()
    status, _, raw = request(endpoint, "POST", body, {"Content-Type":"application/json", "x-renm-timestamp":ts,"x-renm-signature":signature})
    if status != 200 or json.loads(raw).get("ok") is not True:
        raise ValueError(f"delivery_failed_{status}")
    with db:
        db.executemany("update outbox set delivered=1 where id=?", [(o["id"],) for o in observations])
    return len(observations)


def source_controls(endpoint, secret, config):
    """Fresh remote pause state; a missing/mismatched source fails closed."""
    ts = str(int(time.time()))
    sig = hmac.new(secret.encode(), (ts+".sources").encode(), hashlib.sha256).hexdigest()
    status, _, raw = request(endpoint, headers={"x-renm-timestamp":ts,"x-renm-signature":sig})
    if status != 200:
        raise ValueError(f"source_controls_failed_{status}")
    manifest = json.loads(raw)
    if manifest.get("version") != 1 or not isinstance(manifest.get("sources"),list) or len(manifest["sources"]) > 1000:
        raise ValueError("invalid_source_manifest")
    rows = {s["id"]:s for s in manifest["sources"]}
    if len(rows) != len(manifest["sources"]):
        raise ValueError("duplicate_source_controls")
    pending_review = manifest.get("pending_review")
    if type(pending_review) is not int or pending_review < 0:
        raise ValueError("invalid_review_count")
    sources = []
    for source in config["sources"]:
        remote = rows.get(source["id"])
        if not remote or remote.get("url") != source["url"] or type(remote.get("enabled")) is not bool:
            raise ValueError("source_controls_mismatch")
        interval = remote.get("interval_hours")
        if type(interval) is not int or not 24 <= interval <= 2160:
            raise ValueError("invalid_remote_interval")
        sources.append({**source,"enabled":source["enabled"] and remote["enabled"],"interval_hours":max(source["interval_hours"],interval)})
    return sources, pending_review


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("command", choices=["run", "export", "deliver", "status", "backup"])
    ap.add_argument("--state", required=True)
    ap.add_argument("--config")
    ap.add_argument("--output")
    ap.add_argument("--endpoint")
    args = ap.parse_args()
    os.umask(0o077)
    db = connect(args.state)
    try:
        if args.command == "run":
            config = json.loads(Path(args.config).read_text())
            if config.get("version") != 1 or len(config["sources"]) > 30:
                raise ValueError("pilot_configuration_limit")
            stats = {}
            for source in config["sources"]:
                result = observe(db, source)
                stats[result] = stats.get(result,0)+1
                time.sleep(1)
            print(json.dumps(stats))
        elif args.command == "export":
            Path(args.output).write_text(json.dumps({"version":1,"observations":pending(db)}, indent=2))
            print("Exported pending evidence; observation IDs are stable for safe replay.")
        elif args.command == "deliver":
            secret_path = os.environ.get("RESEARCH_FEED_SECRET_FILE")
            secret = Path(secret_path).read_text().strip() if secret_path else os.environ.get("RESEARCH_FEED_SECRET", "")
            if not secret or not args.endpoint:
                raise ValueError("delivery_configuration_required")
            print(json.dumps({"delivered":deliver(db,args.endpoint,secret)}))
        elif args.command == "backup":
            backup = sqlite3.connect(args.output)
            db.backup(backup)
            backup.close()
            print("Consistent SQLite backup saved.")
        else:
            print(json.dumps({"sources":db.execute("select count(*) from sources").fetchone()[0],"failed_sources":db.execute("select count(*) from sources where error is not null").fetchone()[0],"pending_observations":db.execute("select count(*) from outbox where delivered=0").fetchone()[0]}))
    finally:
        db.close()


if __name__ == "__main__":
    main()
