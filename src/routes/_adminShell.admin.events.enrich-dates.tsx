import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  previewDateEnrichments,
  applyDateEnrichments,
  type EnrichPreview,
  type EnrichInputRow,
  type EnrichApplyResult,
} from "@/lib/admin-date-enrich.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_adminShell/admin/events/enrich-dates")({
  head: () => ({
    meta: [
      { title: "Date enrichment — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EnrichDatesPage,
});

// ---- Minimal CSV parser (RFC 4180 subset: quoted fields, escaped quotes) ----

function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        field = "";
        if (row.some((c) => c.length > 0)) out.push(row);
        row = [];
      } else {
        field += ch;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((c) => c.length > 0)) out.push(row);
  }
  return out;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type ParseError = { line: number; reason: string };

function parseRows(text: string): {
  rows: EnrichInputRow[];
  errors: ParseError[];
} {
  const grid = parseCsv(text.trim());
  if (grid.length === 0) return { rows: [], errors: [] };

  const header = grid[0].map((h) => h.trim().toLowerCase());
  const idIdx = header.indexOf("id");
  const sortIdx = header.indexOf("sort_date");
  if (idIdx === -1 || sortIdx === -1) {
    return {
      rows: [],
      errors: [
        {
          line: 1,
          reason: "CSV must include 'id' and 'sort_date' header columns",
        },
      ],
    };
  }
  const rawIdx = header.indexOf("date_raw");
  const estIdx = header.indexOf("date_is_estimated");
  const fromIdx = header.indexOf("date_from");
  const toIdx = header.indexOf("date_to");

  const out: EnrichInputRow[] = [];
  const errors: ParseError[] = [];
  for (let r = 1; r < grid.length; r++) {
    const cells = grid[r];
    const id = (cells[idIdx] ?? "").trim();
    const sortDate = (cells[sortIdx] ?? "").trim();
    if (!id) continue;
    if (!UUID_RE.test(id)) {
      errors.push({ line: r + 1, reason: `id is not a UUID: ${id}` });
      continue;
    }
    if (!ISO_DATE_RE.test(sortDate)) {
      errors.push({
        line: r + 1,
        reason: `sort_date must be YYYY-MM-DD (got "${sortDate}")`,
      });
      continue;
    }
    const row: EnrichInputRow = { id, sort_date: sortDate };
    if (rawIdx !== -1) {
      const v = (cells[rawIdx] ?? "").trim();
      row.date_raw = v === "" ? null : v;
    }
    if (estIdx !== -1) {
      const v = (cells[estIdx] ?? "").trim().toLowerCase();
      if (v === "true") row.date_is_estimated = true;
      else if (v === "false" || v === "") row.date_is_estimated = false;
    }
    if (fromIdx !== -1) {
      const v = (cells[fromIdx] ?? "").trim();
      if (v && !ISO_DATE_RE.test(v)) {
        errors.push({
          line: r + 1,
          reason: `date_from must be YYYY-MM-DD or blank (got "${v}")`,
        });
        continue;
      }
      row.date_from = v === "" ? null : v;
    }
    if (toIdx !== -1) {
      const v = (cells[toIdx] ?? "").trim();
      if (v && !ISO_DATE_RE.test(v)) {
        errors.push({
          line: r + 1,
          reason: `date_to must be YYYY-MM-DD or blank (got "${v}")`,
        });
        continue;
      }
      row.date_to = v === "" ? null : v;
    }
    out.push(row);
  }
  return { rows: out, errors };
}

// ---- UI ----

function EnrichDatesPage() {
  const preview = useServerFn(previewDateEnrichments);
  const commit = useServerFn(applyDateEnrichments);

  const [csv, setCsv] = useState("");
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
  const [parsedRows, setParsedRows] = useState<EnrichInputRow[]>([]);
  const [previewing, setPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<EnrichPreview | null>(null);
  const [forceIds, setForceIds] = useState<Set<string>>(new Set());
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<EnrichApplyResult | null>(null);

  const onFile = async (f: File) => {
    const text = await f.text();
    setCsv(text);
    setPreviewData(null);
    setResult(null);
  };

  const handlePreview = async () => {
    setResult(null);
    setPreviewData(null);
    setForceIds(new Set());
    const { rows, errors } = parseRows(csv);
    setParsedRows(rows);
    setParseErrors(errors);
    if (errors.length > 0) {
      toast.error(`${errors.length} parse error${errors.length === 1 ? "" : "s"} — see below`);
      return;
    }
    if (rows.length === 0) {
      toast.error("No rows parsed from CSV");
      return;
    }
    setPreviewing(true);
    try {
      const p = await preview({ data: { rows } });
      setPreviewData(p);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setPreviewing(false);
    }
  };

  const handleCommit = async () => {
    if (!previewData) return;
    const overwriteCount = previewData.totals.overwrite_confirmed;
    const forcedOverwrites = Array.from(forceIds).length;
    const willWrite =
      previewData.totals.safe_change + forcedOverwrites;
    if (willWrite === 0) {
      toast.error("Nothing to write — preview shows no safe changes selected");
      return;
    }
    const msg =
      overwriteCount > 0
        ? `Apply ${previewData.totals.safe_change} safe change${previewData.totals.safe_change === 1 ? "" : "s"}${
            forcedOverwrites > 0
              ? ` and ${forcedOverwrites} forced overwrite${forcedOverwrites === 1 ? "" : "s"} of confirmed dates`
              : ""
          }?`
        : `Apply ${previewData.totals.safe_change} change${previewData.totals.safe_change === 1 ? "" : "s"}?`;
    if (!window.confirm(msg)) return;

    setCommitting(true);
    try {
      const r = await commit({
        data: { rows: parsedRows, force_ids: Array.from(forceIds) },
      });
      setResult(r);
      toast.success(
        `Wrote ${r.totals.written} of ${r.totals.submitted} row${r.totals.submitted === 1 ? "" : "s"}`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setCommitting(false);
    }
  };

  const toggleForce = (id: string) => {
    setForceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allOverwriteIds = useMemo(
    () =>
      previewData?.rows
        .filter((r) => r.bucket === "overwrite_confirmed")
        .map((r) => r.id) ?? [],
    [previewData],
  );
  const allOverwritesForced =
    allOverwriteIds.length > 0 &&
    allOverwriteIds.every((id) => forceIds.has(id));

  const toggleForceAll = () => {
    if (allOverwritesForced) setForceIds(new Set());
    else setForceIds(new Set(allOverwriteIds));
  };

  return (
    <div className="space-y-6">
      <Toaster />

      <div>
        <Link
          to="/admin/events"
          className="text-sm text-muted-foreground hover:text-primary"
        >
          ← Events
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          Date enrichment importer
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste or upload a CSV with <code>id</code> + <code>sort_date</code>{" "}
          (plus optional <code>date_raw</code>, <code>date_is_estimated</code>,{" "}
          <code>date_from</code>, <code>date_to</code>). Confirmed dates are
          protected — opt in per row to overwrite.
        </p>
      </div>

      <section className="space-y-3 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">1. Input</h2>
          <label className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
              }}
            />
            Upload .csv file
          </label>
        </div>
        <Textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder="id,sort_date,date_raw,date_is_estimated&#10;3806e102-...,2026-09-19,&quot;Saturday, 19 September 2026&quot;,false"
          className="min-h-[180px] font-mono text-xs"
        />
        <div className="flex items-center gap-3">
          <Button
            onClick={handlePreview}
            disabled={!csv.trim() || previewing}
          >
            {previewing ? "Previewing…" : "Preview changes"}
          </Button>
          {parseErrors.length === 0 && parsedRows.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {parsedRows.length} row{parsedRows.length === 1 ? "" : "s"} parsed
            </span>
          )}
        </div>
        {parseErrors.length > 0 && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs">
            <div className="font-semibold text-destructive">
              {parseErrors.length} parse error
              {parseErrors.length === 1 ? "" : "s"}
            </div>
            <ul className="mt-1 list-disc pl-5 text-muted-foreground">
              {parseErrors.slice(0, 20).map((e, i) => (
                <li key={i}>
                  line {e.line}: {e.reason}
                </li>
              ))}
              {parseErrors.length > 20 && <li>…and more</li>}
            </ul>
          </div>
        )}
      </section>

      {previewData && (
        <section className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">2. Preview</h2>
            {previewData.totals.overwrite_confirmed > 0 && (
              <button
                onClick={toggleForceAll}
                className="text-xs font-medium text-primary hover:underline"
              >
                {allOverwritesForced
                  ? "Unselect all overwrites"
                  : `Force all ${previewData.totals.overwrite_confirmed} overwrite${
                      previewData.totals.overwrite_confirmed === 1 ? "" : "s"
                    }`}
              </button>
            )}
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <Stat label="Submitted" value={previewData.totals.submitted} />
            <Stat label="Matched" value={previewData.totals.matched} />
            <Stat
              label="Unmatched"
              value={previewData.totals.unmatched}
              tone={previewData.totals.unmatched > 0 ? "warn" : "muted"}
            />
            <Stat label="No-op" value={previewData.totals.no_op} tone="muted" />
            <Stat
              label="Safe change"
              value={previewData.totals.safe_change}
              tone="good"
            />
            <Stat
              label="Overwrite confirmed"
              value={previewData.totals.overwrite_confirmed}
              tone={
                previewData.totals.overwrite_confirmed > 0 ? "danger" : "muted"
              }
            />
          </dl>

          <div className="max-h-[500px] overflow-auto rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/60">
                <tr className="text-left">
                  <th className="px-2 py-2">Event</th>
                  <th className="px-2 py-2">Bucket</th>
                  <th className="px-2 py-2">Current sort_date</th>
                  <th className="px-2 py-2">Proposed</th>
                  <th className="px-2 py-2">Estimated</th>
                  <th className="px-2 py-2">Force?</th>
                </tr>
              </thead>
              <tbody>
                {previewData.rows.map((r) => (
                  <tr
                    key={r.id}
                    className={`border-t border-border ${
                      r.bucket === "overwrite_confirmed"
                        ? "bg-destructive/5"
                        : r.bucket === "safe_change"
                          ? "bg-emerald-500/5"
                          : ""
                    }`}
                  >
                    <td className="px-2 py-1.5">
                      <div className="font-medium text-foreground">
                        {r.name ?? <em className="text-destructive">unmatched</em>}
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {r.id}
                      </div>
                    </td>
                    <td className="px-2 py-1.5">
                      <BucketBadge bucket={r.bucket} matched={r.matched} />
                    </td>
                    <td className="px-2 py-1.5 text-muted-foreground">
                      {r.current.sort_date ?? "—"}
                    </td>
                    <td
                      className={`px-2 py-1.5 ${r.changes.sort_date ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                    >
                      {r.proposed.sort_date}
                    </td>
                    <td className="px-2 py-1.5 text-muted-foreground">
                      {String(r.current.date_is_estimated ?? "—")} →{" "}
                      <span
                        className={
                          r.changes.date_is_estimated
                            ? "font-semibold text-foreground"
                            : ""
                        }
                      >
                        {String(r.proposed.date_is_estimated)}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      {r.bucket === "overwrite_confirmed" ? (
                        <input
                          type="checkbox"
                          checked={forceIds.has(r.id)}
                          onChange={() => toggleForce(r.id)}
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              {previewData.totals.safe_change + forceIds.size} row
              {previewData.totals.safe_change + forceIds.size === 1 ? "" : "s"}{" "}
              will be written. {previewData.totals.overwrite_confirmed - forceIds.size}{" "}
              confirmed overwrite
              {previewData.totals.overwrite_confirmed - forceIds.size === 1
                ? ""
                : "s"}{" "}
              skipped.
            </p>
            <Button
              onClick={handleCommit}
              disabled={committing}
              variant="default"
            >
              {committing ? "Writing…" : "Apply changes"}
            </Button>
          </div>
        </section>
      )}

      {result && (
        <section className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <h2 className="text-sm font-semibold">3. Result</h2>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <Stat label="Submitted" value={result.totals.submitted} />
            <Stat label="Written" value={result.totals.written} tone="good" />
            <Stat label="No-op" value={result.totals.skipped_no_op} tone="muted" />
            <Stat
              label="Unmatched"
              value={result.totals.skipped_unmatched}
              tone={result.totals.skipped_unmatched > 0 ? "warn" : "muted"}
            />
            <Stat
              label="Protected"
              value={result.totals.skipped_protected}
              tone="muted"
            />
            <Stat
              label="Failed"
              value={result.totals.failed}
              tone={result.totals.failed > 0 ? "danger" : "muted"}
            />
          </dl>
          {result.sync_run_id && (
            <p className="text-xs text-muted-foreground">
              Audit row: <code>{result.sync_run_id}</code> in{" "}
              <Link to="/admin/sync-runs" className="underline">
                sync runs
              </Link>
              .
            </p>
          )}
          {result.errors.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-destructive">
                {result.errors.length} error
                {result.errors.length === 1 ? "" : "s"}
              </summary>
              <ul className="mt-2 list-disc pl-5">
                {result.errors.slice(0, 50).map((e) => (
                  <li key={e.id}>
                    <code>{e.id}</code>: {e.message}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: number;
  tone?: "muted" | "good" | "warn" | "danger";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : tone === "danger"
          ? "text-destructive"
          : "text-foreground";
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className={`text-xl font-semibold ${toneClass}`}>{value}</dd>
    </div>
  );
}

function BucketBadge({
  bucket,
  matched,
}: {
  bucket: "no_op" | "safe_change" | "overwrite_confirmed";
  matched: boolean;
}) {
  if (!matched) {
    return (
      <span className="inline-flex rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
        unmatched
      </span>
    );
  }
  if (bucket === "no_op")
    return (
      <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
        no-op
      </span>
    );
  if (bucket === "safe_change")
    return (
      <span className="inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
        safe
      </span>
    );
  return (
    <span className="inline-flex rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-medium text-destructive">
      overwrite
    </span>
  );
}
