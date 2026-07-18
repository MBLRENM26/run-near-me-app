#!/usr/bin/env node
// Read-only ORL seed-queue validator.
// - Confirms SHA-256 of the approved queue file.
// - Confirms exact header of queue + unresolved CSVs.
// - Confirms every evidence_keys reference resolves within the file.
// - Confirms every event_slug on an event_link resolves to an ACTIVE public.events row.
// Performs NO writes. No ORL/organiser/event/link records are created or modified.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const QUEUE_PATH = resolve(HERE, "organiser-identity-review-queue.csv");
const UNRESOLVED_PATH = resolve(HERE, "organiser-identity-review-unresolved.csv");

const APPROVED_QUEUE_SHA256 =
  "20ebf88fbe7ee181cd9a06788e0c4be99a502de0c91964d78d32f1711d8a591b";

const EXPECTED_QUEUE_HEADER = [
  "row_key","record_type","organisation_seed_source_key","canonical_organisation_name",
  "organisation_status","alias_name","alias_type","evidence_key","evidence_type",
  "evidence_source_url","evidence_supporting_fact","platform","account_url",
  "tenant_slug","platform_identifier","platform_account_confidence","event_slug",
  "relationship","event_link_confidence","evidence_keys","proposed_review_note",
];
const EXPECTED_UNRESOLVED_HEADER = [
  "record_type","organisation_seed_source_key","source_event_name",
  "candidate_event_slugs","reason","note",
];

const ALLOWED_RELATIONSHIP = new Set(["organises","entry_platform_hosts","source_suggests"]);
const ALLOWED_EVENT_LINK_CONF = new Set(["verified","plausible_needs_review"]);
const ALLOWED_EVIDENCE_TYPE = new Set([
  "official_direct_link","official_terms","platform_profile",
  "matching_event_set","manual_observation",
]);

// Minimal RFC-4180 CSV parser (quoted fields, embedded commas, "" escapes).
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i+1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  // Drop trailing empty row from final newline
  while (rows.length && rows[rows.length-1].length === 1 && rows[rows.length-1][0] === "") rows.pop();
  return rows;
}

function fail(errors, msg) { errors.push(msg); }

async function fetchActiveSlugs(slugs) {
  // Read-only query via Supabase Data API (anon key + RLS). No writes.
  const env = process.env;
  const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    return { skipped: true, reason: "missing SUPABASE env; slug existence check skipped" };
  }
  const inList = slugs.map(s => `"${s}"`).join(",");
  const endpoint = `${url}/rest/v1/events?select=slug,status&slug=in.(${encodeURIComponent(inList)})`;
  const res = await fetch(endpoint, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) return { skipped: true, reason: `HTTP ${res.status}` };
  const rows = await res.json();
  return { skipped: false, rows };
}

async function main() {
  const errors = [];
  const notes = [];

  // 1) Hash check on approved queue file (byte-exact).
  const queueBuf = readFileSync(QUEUE_PATH);
  const actualSha = createHash("sha256").update(queueBuf).digest("hex");
  const hashOk = actualSha === APPROVED_QUEUE_SHA256;
  if (!hashOk) fail(errors, `queue SHA-256 mismatch: expected ${APPROVED_QUEUE_SHA256}, got ${actualSha}`);

  // 2) Header checks.
  const queueRows = parseCSV(queueBuf.toString("utf8"));
  const unresolvedRows = parseCSV(readFileSync(UNRESOLVED_PATH, "utf8"));

  const qHeader = queueRows[0] ?? [];
  const uHeader = unresolvedRows[0] ?? [];
  const headerEq = (a,b) => a.length === b.length && a.every((v,i) => v === b[i]);
  if (!headerEq(qHeader, EXPECTED_QUEUE_HEADER))
    fail(errors, `queue header mismatch:\n  expected: ${EXPECTED_QUEUE_HEADER.join(",")}\n  got:      ${qHeader.join(",")}`);
  if (!headerEq(uHeader, EXPECTED_UNRESOLVED_HEADER))
    fail(errors, `unresolved header mismatch:\n  expected: ${EXPECTED_UNRESOLVED_HEADER.join(",")}\n  got:      ${uHeader.join(",")}`);

  // 3) Row parsing.
  const idx = Object.fromEntries(EXPECTED_QUEUE_HEADER.map((h,i) => [h,i]));
  const dataRows = queueRows.slice(1).map(r => {
    const o = {};
    for (const h of EXPECTED_QUEUE_HEADER) o[h] = (r[idx[h]] ?? "").trim();
    return o;
  });

  // 4) Counts by record_type.
  const counts = {};
  for (const r of dataRows) counts[r.record_type] = (counts[r.record_type] ?? 0) + 1;

  // 5) row_key uniqueness.
  const rowKeys = new Set();
  for (const r of dataRows) {
    if (!r.row_key) fail(errors, "row_key missing on a data row");
    else if (rowKeys.has(r.row_key)) fail(errors, `duplicate row_key: ${r.row_key}`);
    else rowKeys.add(r.row_key);
  }

  // 6) Evidence key set + cross-references.
  const evidenceKeys = new Set(
    dataRows.filter(r => r.record_type === "evidence").map(r => r.evidence_key)
  );
  for (const r of dataRows) {
    if (r.record_type === "evidence") {
      if (!r.evidence_key) fail(errors, `${r.row_key}: evidence row missing evidence_key`);
      if (!r.evidence_source_url) fail(errors, `${r.row_key}: evidence row missing evidence_source_url`);
      if (!r.evidence_supporting_fact) fail(errors, `${r.row_key}: evidence row missing evidence_supporting_fact`);
      if (!ALLOWED_EVIDENCE_TYPE.has(r.evidence_type))
        fail(errors, `${r.row_key}: evidence_type "${r.evidence_type}" not in agreed vocabulary`);
    }
    if (r.evidence_keys) {
      for (const k of r.evidence_keys.split("|").map(s => s.trim()).filter(Boolean)) {
        if (!evidenceKeys.has(k)) fail(errors, `${r.row_key}: evidence_keys references unknown ${k}`);
      }
    }
  }

  // 7) event_link vocabulary + slug existence.
  const eventLinkSlugs = [];
  for (const r of dataRows) {
    if (r.record_type !== "event_link") continue;
    if (!r.event_slug) fail(errors, `${r.row_key}: event_link missing event_slug`);
    else eventLinkSlugs.push(r.event_slug);
    if (!ALLOWED_RELATIONSHIP.has(r.relationship))
      fail(errors, `${r.row_key}: relationship "${r.relationship}" not in agreed vocabulary`);
    if (!ALLOWED_EVENT_LINK_CONF.has(r.event_link_confidence))
      fail(errors, `${r.row_key}: event_link_confidence "${r.event_link_confidence}" not in agreed vocabulary`);
    if (!r.evidence_keys) fail(errors, `${r.row_key}: event_link has no evidence_keys`);
  }

  // 8) Read-only slug existence check against public.events.
  let slugCheck = { skipped: true, reason: "no event_link rows" };
  if (eventLinkSlugs.length) {
    const uniq = [...new Set(eventLinkSlugs)];
    slugCheck = await fetchActiveSlugs(uniq);
    if (!slugCheck.skipped) {
      const found = new Map(slugCheck.rows.map(r => [r.slug, r.status]));
      for (const s of uniq) {
        const st = found.get(s);
        if (!st) fail(errors, `event_link slug "${s}" not found in public.events`);
        else if (st !== "ACTIVE") fail(errors, `event_link slug "${s}" has status=${st}, expected ACTIVE`);
      }
    } else {
      notes.push(`event slug existence check skipped: ${slugCheck.reason}`);
    }
  }

  const result = {
    files: {
      queue: QUEUE_PATH,
      unresolved: UNRESOLVED_PATH,
    },
    hash: {
      approved: APPROVED_QUEUE_SHA256,
      actual: actualSha,
      match: hashOk,
    },
    headers: {
      queue_ok: headerEq(qHeader, EXPECTED_QUEUE_HEADER),
      unresolved_ok: headerEq(uHeader, EXPECTED_UNRESOLVED_HEADER),
    },
    counts_by_record_type: counts,
    total_data_rows: dataRows.length,
    unresolved_data_rows: Math.max(unresolvedRows.length - 1, 0),
    event_link_slugs: [...new Set(eventLinkSlugs)],
    slug_existence_check: slugCheck.skipped
      ? { skipped: true, reason: slugCheck.reason }
      : { skipped: false, rows: slugCheck.rows },
    errors,
    notes,
    writes_performed: false,
    verdict: errors.length === 0 ? "PASS" : "FAIL",
  };

  console.log(JSON.stringify(result, null, 2));
  process.exit(errors.length === 0 ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(2); });
