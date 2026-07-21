import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isAdminAuthenticated } from "@/lib/admin-session.server";
import { requireSameOriginOrThrow } from "@/lib/admin-csrf.server";

// Admin date-enrichment importer.
//
// Operators paste/upload a CSV that pairs event ids with confirmed dates.
// The flow is always two-step: dry-run preview (no writes) → commit.
// Confirmed-date overwrites are skipped unless the operator opts in per-row
// (`force_ids`).

async function requireAdminOrThrow() {
  if (!(await isAdminAuthenticated())) {
    throw new Error("Unauthorized");
  }
}

async function requireAdminMutation() {
  await requireAdminOrThrow();
  requireSameOriginOrThrow();
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// One row as parsed from the operator's CSV (or pasted JSON).
const inputRowSchema = z.object({
  id: z.string().uuid(),
  sort_date: z.string().regex(ISO_DATE_RE, "sort_date must be YYYY-MM-DD"),
  date_raw: z.string().trim().max(200).nullable().optional(),
  date_is_estimated: z.boolean().optional(),
  date_from: z
    .string()
    .regex(ISO_DATE_RE)
    .nullable()
    .optional(),
  date_to: z
    .string()
    .regex(ISO_DATE_RE)
    .nullable()
    .optional(),
});

export type EnrichInputRow = z.infer<typeof inputRowSchema>;

const inputBatchSchema = z
  .array(inputRowSchema)
  .min(1, "No rows to import")
  .max(5000, "Hard limit is 5,000 rows per import");

// ---- Preview ----

export type EnrichBucket = "no_op" | "safe_change" | "overwrite_confirmed";

export interface EnrichDiffRow {
  id: string;
  bucket: EnrichBucket;
  matched: boolean;
  name: string | null;
  slug: string | null;
  status: string | null;
  current: {
    sort_date: string | null;
    date_raw: string | null;
    date_is_estimated: boolean | null;
    date_from: string | null;
    date_to: string | null;
  };
  proposed: {
    sort_date: string;
    date_raw: string | null | undefined;
    date_is_estimated: boolean;
    date_from: string | null | undefined;
    date_to: string | null | undefined;
  };
  // Field-level change flags so the UI can highlight only the cells that change.
  changes: {
    sort_date: boolean;
    date_raw: boolean;
    date_is_estimated: boolean;
    date_from: boolean;
    date_to: boolean;
  };
}

export interface EnrichPreview {
  totals: {
    submitted: number;
    matched: number;
    unmatched: number;
    no_op: number;
    safe_change: number;
    overwrite_confirmed: number;
  };
  unmatched_ids: string[];
  rows: EnrichDiffRow[];
}

export const previewDateEnrichments = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ rows: inputBatchSchema }).parse(d),
  )
  .handler(async ({ data }): Promise<EnrichPreview> => {
    await requireAdminOrThrow();

    const submittedIds = data.rows.map((r) => r.id);
    const { data: existing, error } = await supabaseAdmin
      .from("events")
      .select(
        "id,name,slug,status,sort_date,date_raw,date_is_estimated,date_from,date_to",
      )
      .in("id", submittedIds);
    if (error) throw new Error(error.message);

    const existingById = new Map(
      (existing ?? []).map((r) => [r.id as string, r]),
    );

    const rows: EnrichDiffRow[] = data.rows.map((row) => {
      const current = existingById.get(row.id);
      const matched = !!current;
      const proposed = {
        sort_date: row.sort_date,
        date_raw: row.date_raw,
        date_is_estimated: row.date_is_estimated ?? false,
        date_from: row.date_from,
        date_to: row.date_to,
      };

      const cur = {
        sort_date: (current?.sort_date as string | null) ?? null,
        date_raw: (current?.date_raw as string | null) ?? null,
        date_is_estimated:
          (current?.date_is_estimated as boolean | null) ?? null,
        date_from: (current?.date_from as string | null) ?? null,
        date_to: (current?.date_to as string | null) ?? null,
      };

      const changes = {
        sort_date: matched && cur.sort_date !== proposed.sort_date,
        date_raw:
          matched &&
          proposed.date_raw !== undefined &&
          cur.date_raw !== proposed.date_raw,
        date_is_estimated:
          matched && cur.date_is_estimated !== proposed.date_is_estimated,
        date_from:
          matched &&
          proposed.date_from !== undefined &&
          cur.date_from !== proposed.date_from,
        date_to:
          matched &&
          proposed.date_to !== undefined &&
          cur.date_to !== proposed.date_to,
      };

      const anyChange = Object.values(changes).some(Boolean);

      let bucket: EnrichBucket;
      if (!matched || !anyChange) {
        bucket = "no_op";
      } else if (
        cur.sort_date !== null &&
        cur.date_is_estimated === false &&
        changes.sort_date
      ) {
        bucket = "overwrite_confirmed";
      } else {
        bucket = "safe_change";
      }

      return {
        id: row.id,
        bucket,
        matched,
        name: (current?.name as string | null) ?? null,
        slug: (current?.slug as string | null) ?? null,
        status: (current?.status as string | null) ?? null,
        current: cur,
        proposed,
        changes,
      };
    });

    const totals = {
      submitted: rows.length,
      matched: rows.filter((r) => r.matched).length,
      unmatched: rows.filter((r) => !r.matched).length,
      no_op: rows.filter((r) => r.bucket === "no_op").length,
      safe_change: rows.filter((r) => r.bucket === "safe_change").length,
      overwrite_confirmed: rows.filter(
        (r) => r.bucket === "overwrite_confirmed",
      ).length,
    };
    const unmatched_ids = rows.filter((r) => !r.matched).map((r) => r.id);

    return { totals, unmatched_ids, rows };
  });

// ---- Commit ----

export interface EnrichApplyResult {
  ok: true;
  sync_run_id: string | null;
  totals: {
    submitted: number;
    written: number;
    skipped_no_op: number;
    skipped_unmatched: number;
    skipped_protected: number;
    failed: number;
  };
  errors: { id: string; message: string }[];
}

export const applyDateEnrichments = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        rows: inputBatchSchema,
        // Per-row opt-in to overwrite a currently-confirmed date.
        force_ids: z.array(z.string().uuid()).optional().default([]),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<EnrichApplyResult> => {
    await requireAdminMutation();

    const force = new Set(data.force_ids);
    const submittedIds = data.rows.map((r) => r.id);

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("events")
      .select(
        "id,sort_date,date_raw,date_is_estimated,date_from,date_to",
      )
      .in("id", submittedIds);
    if (fetchErr) throw new Error(fetchErr.message);

    const existingById = new Map(
      (existing ?? []).map((r) => [r.id as string, r]),
    );

    // Open a sync_runs audit row.
    let syncRunId: string | null = null;
    try {
      const { data: run } = await supabaseAdmin
        .from("sync_runs")
        .insert({
          source: "manual-date-enrich",
          status: "running",
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      syncRunId = (run?.id as string) ?? null;
    } catch {
      /* audit-row failure must not block the import */
    }

    const t0 = Date.now();
    let written = 0;
    let skipped_no_op = 0;
    let skipped_unmatched = 0;
    let skipped_protected = 0;
    let failed = 0;
    const errors: { id: string; message: string }[] = [];

    for (const row of data.rows) {
      const current = existingById.get(row.id);
      if (!current) {
        skipped_unmatched++;
        continue;
      }

      const cur = {
        sort_date: (current.sort_date as string | null) ?? null,
        date_raw: (current.date_raw as string | null) ?? null,
        date_is_estimated:
          (current.date_is_estimated as boolean | null) ?? null,
        date_from: (current.date_from as string | null) ?? null,
        date_to: (current.date_to as string | null) ?? null,
      };

      const proposedIsEstimated = row.date_is_estimated ?? false;

      // Protect confirmed dates unless explicitly forced for this row.
      const wouldOverwriteConfirmed =
        cur.sort_date !== null &&
        cur.date_is_estimated === false &&
        cur.sort_date !== row.sort_date;
      if (wouldOverwriteConfirmed && !force.has(row.id)) {
        skipped_protected++;
        continue;
      }

      const patch: Record<string, unknown> = {};
      if (cur.sort_date !== row.sort_date) patch.sort_date = row.sort_date;
      if (
        row.date_raw !== undefined &&
        cur.date_raw !== row.date_raw
      ) {
        patch.date_raw = row.date_raw;
      }
      if (cur.date_is_estimated !== proposedIsEstimated) {
        patch.date_is_estimated = proposedIsEstimated;
      }
      if (
        row.date_from !== undefined &&
        cur.date_from !== row.date_from
      ) {
        patch.date_from = row.date_from;
      }
      if (
        row.date_to !== undefined &&
        cur.date_to !== row.date_to
      ) {
        patch.date_to = row.date_to;
      }

      if (Object.keys(patch).length === 0) {
        skipped_no_op++;
        continue;
      }

      const { error: updErr } = await supabaseAdmin
        .from("events")
        .update(patch as never)
        .eq("id", row.id);
      if (updErr) {
        failed++;
        errors.push({ id: row.id, message: updErr.message });
        continue;
      }

      // Best-effort audit trail per event.
      try {
        await supabaseAdmin.from("event_edits").insert({
          event_id: row.id,
          changes: patch as never,
          note: `date enrichment import${syncRunId ? ` (run ${syncRunId})` : ""}`,
        });
      } catch {
        /* edit log is best-effort */
      }

      written++;
    }

    // Close out the sync_runs row.
    if (syncRunId) {
      try {
        await supabaseAdmin
          .from("sync_runs")
          .update({
            status: failed > 0 ? "partial" : "success",
            fetched: data.rows.length,
            written,
            new_events: 0,
            updated_existing: written,
            skipped_dupes: skipped_no_op,
            skipped_no_date: 0,
            failed_pages: failed,
            error_message:
              errors.length > 0
                ? errors
                    .slice(0, 5)
                    .map((e) => `${e.id}: ${e.message}`)
                    .join("; ")
                : null,
            finished_at: new Date().toISOString(),
            duration_ms: Date.now() - t0,
          })
          .eq("id", syncRunId);
      } catch {
        /* never break the import because audit logging failed */
      }
    }

    return {
      ok: true,
      sync_run_id: syncRunId,
      totals: {
        submitted: data.rows.length,
        written,
        skipped_no_op,
        skipped_unmatched,
        skipped_protected,
        failed,
      },
      errors,
    };
  });
