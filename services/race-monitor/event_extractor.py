"""Conservative, review-only extraction into existing events columns.

No network/model calls; HTML exists only during this function call. Structured
Event data and explicit page statements are evidence, never instructions.
Ambiguous values are separate candidates, not silently selected editions.
"""
import hashlib
import json
import math
from datetime import date
from html.parser import HTMLParser
from pathlib import Path
import re
from urllib.parse import urljoin, urlsplit

VERSION = "events-mapped-v2"
FIELDS = json.loads(Path(__file__).with_name("event-fields.json").read_text())
MAX_FACTS = 32
MAX_QUOTES = 4000
MONTHS = {m.lower(): i for i, m in enumerate(
    ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], 1)}
MONTHS.update({m[:3]: i for m, i in list(MONTHS.items())})
DATE = re.compile(r"\b(\d{1,2})(?:st|nd|rd|th)?\s+(" + "|".join(MONTHS) + r")\s+(20\d{2})\b|\b(\d{1,2})/(\d{1,2})/(20\d{2})\b", re.I)
DISTANCE = re.compile(r"\b(?:half[ -]marathon|marathon|\d+(?:\.\d+)?\s*(?:and|&)\s*\d+(?:\.\d+)?[ -]?(?:km|k|miles?|mi)|\d+(?:\.\d+)?[ -]?(?:km|k|miles?|mi))\b", re.I)
ENTRY = re.compile(r"\b(?:enter|entry|entries|register|registration|book)\b", re.I)
NOT_ENTRY = re.compile(r"\b(?:results?|privacy|login|transfers?|volunteer|interest|newsletter)\b", re.I)
BLOCKS = {"p", "div", "li", "h1", "h2", "h3", "h4", "tr", "br", "section", "article"}


def clean(value):
    return re.sub(r"\s+", " ", value).strip() if isinstance(value, str) else ""


def url(value, base):
    if not isinstance(value, str) or not value.strip() or value.startswith("#"):
        return None
    value = urljoin(base, value.strip())
    try:
        u = urlsplit(value)
        if u.scheme not in ("http", "https") or not u.hostname or u.username or u.password:
            return None
        if len(value) > 1000 or any(ord(c) < 33 for c in value):
            return None
        return value
    except ValueError:
        return None


def iso(value):
    try:
        if not isinstance(value, str) or not re.match(r"^20\d\d-\d\d-\d\d(?:$|T)", value):
            return None
        return date.fromisoformat(value[:10]).isoformat()
    except ValueError:
        return None


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.excluded = []
        self.parts = []
        self.lines = []
        self.line_sections = []
        self.sections = []
        self.headings = []
        self.anchors = []
        self.anchor = None
        self.json_script = None
        self.calendar_script = None
        self.calendar_rows = []
        self.documents = []
        self.heading = None
        self.title = []

    def flush(self):
        line = clean(" ".join(self.parts))
        if line:
            self.lines.append(line)
            self.line_sections.append(list(self.sections))
        self.parts = []

    def hidden(self):
        return any(self.excluded) or any(t in {"script", "style", "noscript", "svg", "nav", "footer", "aside"} for t in self.stack)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in BLOCKS:
            self.flush()
        if tag not in {"br", "img", "meta", "link", "input", "hr", "source", "wbr", "area", "embed", "param", "track", "col"}:
            # Site banners, Divi race-menu cards and historical result tables
            # are not evidence for the current race edition.
            self.excluded.append(
                (tag == "header" and not any(t in {"main", "article"} for t in self.stack))
                or attrs.get("role") in {"navigation", "complementary"}
                or bool({"teb-custom-blog-for-sub-menu", "teb-rr-table"} & set(attrs.get("class", "").split())))
            self.stack.append(tag)
        if tag == "script" and attrs.get("type", "").lower() == "application/ld+json":
            self.json_script = []
        if tag == "script" and attrs.get("id") == "pass-php-to-javascript-js-extra":
            self.calendar_script = []
        if not self.hidden():
            if tag in {"h1", "h2", "h3", "h4"}:
                self.heading = []
            if tag == "a":
                self.anchor = [attrs.get("href", ""), [], " ".join(self.parts)[-100:]]

    def handle_data(self, value):
        if self.json_script is not None:
            self.json_script.append(value)
        if self.calendar_script is not None:
            self.calendar_script.append(value)
        if not self.hidden():
            if "title" in self.stack:
                self.title.append(value)
                return
            self.parts.append(value)
            if self.heading is not None:
                self.heading.append(value)
            if self.anchor is not None:
                self.anchor[1].append(value)

    def handle_endtag(self, tag):
        if tag == "script" and self.calendar_script is not None:
            body = "".join(self.calendar_script)
            self.calendar_script = None
            # This adapter reads a JSON assignment only. Never execute JavaScript.
            match = re.fullmatch(r"\s*var\s+plugin_name_ajax_object\s*=\s*(\{.*\})\s*;?\s*(?://# sourceURL=pass-php-to-javascript-js-extra\s*)?", body, re.S) if len(body) <= 200_000 else None
            if match:
                try:
                    rows = json.loads(match[1]).get("table_events_array")
                    if isinstance(rows, list):
                        self.calendar_rows.extend(r for r in rows[:100] if isinstance(r, dict))
                        self.calendar_rows = self.calendar_rows[:100]
                except (ValueError, RecursionError, AttributeError):
                    pass
        if tag == "script" and self.json_script is not None:
            body = "".join(self.json_script)
            self.json_script = None
            if len(body) <= 200_000 and len(self.documents) < 20:
                try:
                    self.documents.append(json.loads(body))
                except (ValueError, RecursionError):
                    pass
        if tag in {"h1", "h2", "h3", "h4"} and self.heading is not None:
            heading = clean(" ".join(self.heading))
            if tag in {"h1", "h2"}:
                self.headings.append(heading)
            level = int(tag[1])
            self.sections = [(n, h) for n, h in self.sections if n < level]
            self.sections.append((level, heading))
            self.heading = None
        if tag == "a" and self.anchor is not None:
            self.anchors.append((self.anchor[0], clean(" ".join(self.anchor[1])), clean(self.anchor[2])))
            self.anchor = None
        if tag in BLOCKS:
            self.flush()
        if tag in self.stack:
            # Repair common malformed nesting without making hidden data visible.
            self.stack = self.stack[:len(self.stack) - 1 - self.stack[::-1].index(tag)]
            self.excluded = self.excluded[:len(self.stack)]


class Findings:
    def __init__(self):
        self.facts = []
        self.issues = []

    def issue(self, message):
        if message not in self.issues and len(self.issues) < 10:
            self.issues.append(message)

    def add(self, field, value, quote, locator):
        spec = FIELDS[field]
        if spec["type"] in {"string", "url", "date"}:
            value = clean(value)
            if not value or len(value) > spec.get("max", 1000):
                return
        if spec["type"] == "number" and (type(value) not in (int, float) or not math.isfinite(value) or not spec["min"] <= value <= spec["max"]):
            return
        if any(f["field"] == field and f["value"] == value for f in self.facts):
            return
        quote = clean(quote)
        if len(quote) > 240:
            # A relevant bounded excerpt, never a whole description.
            pos = quote.lower().find(str(value).lower())
            start = max(0, pos - 40) if pos >= 0 else 0
            quote = quote[start:start + 240]
        if not quote:
            return
        if len(self.facts) >= MAX_FACTS or sum(len(f["quote"]) for f in self.facts) + len(quote) > MAX_QUOTES:
            self.issue("Extraction limit reached; inspect source for remaining fields.")
            return
        self.facts.append({"field": field, "value": value, "quote": quote, "locator": locator[:160]})

    def result(self):
        for field in ("name", "date_from", "date_to", "entry_url", "organiser", "organiser_url", "location_raw"):
            if sum(f["field"] == field for f in self.facts) > 1:
                self.issue(f"Multiple {field} candidates; confirm race and edition before use.")
        present = {f["field"] for f in self.facts}
        if "date_from" not in present and not any(f["field"] == "is_recurring" and f["value"] for f in self.facts):
            self.issue("No confirmed dated occurrence extracted; inspect source or rendered page.")
        return {"version": 1, "facts": sorted(self.facts, key=lambda f: (f["field"], str(f["value"]))),
                "missing_fields": sorted(set(FIELDS) - present), "issues": sorted(self.issues)}


def event_nodes(documents):
    stack = [(d, "jsonld", 0) for d in documents]
    visited = 0
    while stack and visited < 5000:
        node, path, depth = stack.pop()
        visited += 1
        if depth > 12:
            continue
        if isinstance(node, dict):
            kind = node.get("@type", [])
            kinds = kind if isinstance(kind, list) else [kind]
            if any(isinstance(t, str) and t.rsplit("/", 1)[-1] in {"Event", "SportsEvent"} for t in kinds):
                yield node, path
            else:
                stack.extend((v, f"{path}.{k}", depth + 1) for k, v in node.items() if isinstance(v, (list, dict)))
        elif isinstance(node, list):
            stack.extend((v, f"{path}[{i}]", depth + 1) for i, v in enumerate(node))


def structured(out, event, path, base, weekly):
    def add(field, value, key):
        if isinstance(value, (str, int, float)) and not isinstance(value, bool):
            out.add(field, value, f"{key}: {value}", f"{path}.{key}")
    add("name", event.get("name"), "name")
    for key, field in [("startDate", "date_from"), ("endDate", "date_to")]:
        value = iso(event.get(key))
        if value and not weekly and not (field == "date_to" and value == iso(event.get("startDate"))):
            add(field, value, key)
            if field == "date_from":
                add("date_raw", event[key], key)
    location = event.get("location")
    if isinstance(location, dict):
        address = location.get("address")
        parts = [clean(location.get("name"))]
        if isinstance(address, dict):
            parts += [clean(address.get(k)) for k in ("streetAddress", "addressLocality", "postalCode")]
            add("town", address.get("addressLocality"), "location.address.addressLocality")
            country = address.get("addressCountry")
            add("country", country.get("name") if isinstance(country, dict) else country, "location.address.addressCountry")
        elif isinstance(address, str):
            parts.append(address)
        add("location_raw", ", ".join(p for p in parts if p), "location")
        geo = location.get("geo")
        if isinstance(geo, dict):
            try:
                lat, lng = float(geo["latitude"]), float(geo["longitude"])
                if math.isfinite(lat) and math.isfinite(lng) and -90 <= lat <= 90 and -180 <= lng <= 180:
                    # Reserve both slots; never emit a half pair at the retention boundary.
                    if len(out.facts) <= MAX_FACTS - 2 and sum(len(f["quote"]) for f in out.facts) < MAX_QUOTES - 120:
                        add("lat", lat, "location.geo.latitude")
                        add("lng", lng, "location.geo.longitude")
            except (ValueError, TypeError, KeyError):
                pass
    elif isinstance(location, str):
        add("location_raw", location, "location")
    organiser = event.get("organizer")
    if isinstance(organiser, dict):
        add("organiser", organiser.get("name"), "organizer.name")
        add("organiser_url", url(organiser.get("url"), base), "organizer.url")
    offers = event.get("offers", [])
    for offer in (offers if isinstance(offers, list) else [offers])[:8]:
        if not isinstance(offer, dict):
            continue
        add("entry_url", url(offer.get("url"), base), "offers.url")
        price, currency = offer.get("price"), offer.get("priceCurrency")
        if isinstance(price, (str, int, float)) and re.fullmatch(r"\d+(?:\.\d{1,2})?", str(price)) and isinstance(currency, str) and re.fullmatch(r"[A-Z]{3}", currency):
            add("entry_fee", f"{currency} {price}", "offers.price/priceCurrency")
    status = event.get("eventStatus")
    if isinstance(status, str) and re.search(r"Cancelled|Postponed|Rescheduled", status, re.I):
        out.issue(f"Lifecycle review required: {status[-160:]}")


def race_name(heading):
    # Keep the original headline as evidence; remove only explicit presentation
    # suffixes, never infer the event's canonical identity from the URL.
    name = re.split(r"\s+Licen[cs]e Number\s*:", heading, maxsplit=1, flags=re.I)[0]
    dated_suffix = re.search(r"\s+[–—-]\s+(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b", name, re.I)
    if dated_suffix and DATE.search(name[dated_suffix.start():]):
        name = name[:dated_suffix.start()]
        name = re.sub(r"\s+Returns$", "", name, flags=re.I)
    return clean(name)


def calendar_facts(out, page, base, title, weekly):
    # The observed Stowmarket calendar uses this exact data contract. Other
    # scripts/sites require their own verified adapter, not speculative parsing.
    if weekly or (urlsplit(base).hostname or "").lower() not in {"stowmarketstriders.org.uk", "www.stowmarketstriders.org.uk"}:
        return
    def identity(value):
        return re.sub(r"[^a-z0-9]", "", clean(value).lower())
    expected = identity(title)
    for i, row in enumerate(page.calendar_rows):
        if not expected or identity(row.get("title")) != expected:
            continue
        raw_date = clean(row.get("date"))
        match = DATE.search(raw_date)
        if not match:
            continue
        day, month, year = (int(match[1]), MONTHS[match[2].lower()], int(match[3])) if match[1] else (int(match[4]), int(match[5]), int(match[6]))
        try:
            value = date(year, month, day).isoformat()
        except ValueError:
            out.issue("Invalid explicit date in source; review required.")
            continue
        loc = f"calendar:table_events_array[{i}]"
        quote = clean(row.get("title")) + ": " + raw_date
        out.add("date_from", value, quote, loc + ".date")
        out.add("date_raw", match[0], quote, loc + ".date")
        location = clean(row.get("location"))
        if location:
            out.add("location_raw", location, clean(row.get("title")) + ": " + location, loc + ".location")


def extract_event_facts(raw, base):
    page = Page()
    page.feed(raw.decode("utf-8", errors="replace"))
    page.flush()
    out = Findings()
    schedule = next((line for line in page.lines if re.search(r"\bevery\s+Saturday\b", line, re.I)), None)
    weekly = bool(schedule and ("parkrun" in (urlsplit(base).hostname or "") or any("parkrun" in h.lower() for h in page.headings)))
    if weekly:
        out.add("is_recurring", True, schedule, "text:weekly-schedule")
        out.add("date_raw", schedule[:200], schedule, "text:weekly-schedule")
    nodes = list(event_nodes(page.documents))
    if len(nodes) > 1:
        out.issue("Multiple structured events on page; confirm which race each value belongs to.")
    for node, path in nodes[:4]:
        structured(out, node, path, base, weekly)
    if len(nodes) > 4:
        out.issue("Extraction limit reached; inspect source for remaining fields.")
    # A headline is a title candidate, never an event identity match.
    title = next((h for h in page.headings if h and not re.search(r"\b(results?|news|reviews?|awards?|winners?)\b", h, re.I) and re.search(r"\b(race|run|parkrun|mile|marathon|scenic|\d+k)\b", h, re.I)), None)
    title_locator = "text:heading"
    if not title:
        # Document titles commonly append a site name after a spaced separator.
        title = re.split(r"\s+[|–—-]\s+", clean(" ".join(page.title)), maxsplit=1)[0] or None
        title_locator = "html:title"
    if title:
        out.add("name", race_name(title), title, title_locator)
        matches = DISTANCE.findall(title)
        if matches:
            out.add("distances", ", ".join(dict.fromkeys(matches)), title, title_locator)
    calendar_facts(out, page, base, race_name(title or ""), weekly)
    for i, line in enumerate(page.lines):
        loc = f"text:block[{i}]"
        # Date-only headings/table rows are candidates. Dates in entry deadlines,
        # results and history are explicitly excluded, not treated as race day.
        if not weekly and DATE.search(line) and not re.search(r"\b(entries|entry|opens?|closes?|closing|deadline|results?|born|copyright|updated|published)\b", line, re.I):
            if re.search(r"\b(race|sunday|saturday|monday|tuesday|wednesday|thursday|friday|date|take place|returns?)\b", line, re.I) or DATE.fullmatch(line.rstrip(".")):
                for m in DATE.finditer(line):
                    day, month, year = (int(m[1]), MONTHS[m[2].lower()], int(m[3])) if m[1] else (int(m[4]), int(m[5]), int(m[6]))
                    try:
                        value = date(year, month, day).isoformat()
                    except ValueError:
                        out.issue("Invalid explicit date in source; review required.")
                        continue
                    out.add("date_from", value, line, loc)
                    out.add("date_raw", m[0], line, loc)
        for field, pattern in [
            ("distances", r"^(?:race )?distances?\s*[:–-]\s*(.+)"),
            ("discipline", r"^(?:discipline|terrain)\s*[:–-]\s*(.+)"),
            ("location_raw", r"^(?:race (?:venue|hq)|venue|location|start location)\s*[:–-]\s*(.+)"),
            ("organiser", r"^(?:organis(?:er|ed by)|organiz(?:er|ed by))\s*[:–-]?\s+(.+?)(?:\s+(?:Website|Contact)\b|$)"),
            ("licensed", r"\b(?:race licence|licence number|race license)\s*[:#]?\s*(\d[\w/-]*)"),
        ]:
            m = re.search(pattern, line, re.I)
            if m and not (field == "organiser" and m[1].lower() in {"details", "information", "contact"}) and not (field == "licensed" and re.fullmatch(r"20\d\d", m[1])):
                out.add(field, m[1], line, loc)
        if re.fullmatch(r"(?:race (?:venue|hq)|venue|location)[: ]*", line, re.I) and i+1 < len(page.lines):
            next_line = page.lines[i+1]
            if len(next_line) <= 200 and not re.match(r"(?:race numbers|enter|entries|directions|click|view)", next_line, re.I):
                out.add("location_raw", next_line, line + ": " + next_line, loc)
        if not any(f['field'] == 'distances' for f in out.facts):
            distance_race = re.search(r"\b(\d+(?:\.\d+)?[ -]?(?:km|k|miles?))\s+(?:road |trail |fell )?race\b", line, re.I)
            if distance_race:
                out.add("distances", distance_race[1], line, loc)
        if "£" in line and len(line) <= 200 and (re.search(r"\b(entry fee|online entry|affiliated|unaffiliated)\b", line, re.I) or re.match(r"^£\d.*(?:member|club)", line, re.I)):
            # A subordinate distance heading scopes the fee to that race. The
            # next same/higher-level heading ends the scope, including Entries.
            section = next((h for level, h in reversed(page.line_sections[i]) if level >= 2 and DISTANCE.search(h)), None)
            fee = clean(section + ": " + line) if section else line
            out.add("entry_fee", fee, fee, loc + (":section-heading" if section else ""))
        if re.search(r"\b(cancelled|canceled|postponed|sold out|race (?:now )?full|register (?:your )?interest)\b", line, re.I) and not re.search(r"\b(if|eventuality|refund|policy|should the|your place|your entry)\b", line, re.I):
            out.issue("Lifecycle/entry availability needs review: " + line[:180])
    for href, label, before in page.anchors:
        context = clean(before + " " + label)
        destination = url(href, base)
        if destination and ENTRY.search(context) and not NOT_ENTRY.search(context):
            out.add("entry_url", destination, context, "html:a[href]")
    dates = [f["value"] for f in out.facts if f["field"] == "date_from"]
    if dates:
        year_claims = set(re.findall(r"\b(?:for|edition|race in)\s+(20\d\d)\b", "\n".join(page.lines), re.I))
        if year_claims - {d[:4] for d in dates}:
            out.issue("Other edition years appear in the source; confirm date and links before use.")
    result = out.result()
    # Fingerprint facts, stable locators and warnings; navigation/block offsets do
    # not cause a fresh review item. Evidence on an existing outbox item is immutable.
    canonical = {**result, "facts": [{"field": f["field"], "value": f["value"]} for f in result["facts"]]}
    fingerprint = hashlib.sha256((VERSION + json.dumps(canonical, sort_keys=True, ensure_ascii=False)).encode()).hexdigest()
    return result, fingerprint
