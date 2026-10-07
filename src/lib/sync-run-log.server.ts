import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendSyncSummaryNotification } from "@/lib/notify-sync.server";
import {
  compareReviewSnapshots,
  reviewSnapshotSchema,
  type ReviewSnapshot,
} from "@/lib/sync-review-integrity";
import type { Json } from "@/integrations/supabase/types";

// Lightweight wrapper used by the cron-triggered sync endpoints to
// persist a row in `sync_runs` for each run. The admin panel reads
// these rows to show what each weekly cron actually did.
//
// After each run finishes, we also enqueue a summary email to the admin
// so cron activity is visible even without checking the dashboard.

export type SyncRunPatch = {
  status?: "success" | "error" | "partial";
  fetched?: number;
  active?: number;
  written?: number;
  new_events?: number;
  updated_existing?: number;
  skipped_dupes?: number;
  skipped_no_date?: number;
  failed_pages?: number;
  error_message?: string;
};

export type SyncRunLogger = {
  id: string | null;
  finish: (patch: SyncRunPatch) => Promise<void>;
};

export async function startSyncRun(
  source: string,
  options: { notify?: boolean } = {},
): Promise<SyncRunLogger> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  const monitored = ["england-athletics", "scottish-athletics"].includes(source);
  let before: ReviewSnapshot | null = null;
  let finished = false;
  let id: string | null = null;
  try {
    const { data, error } = await supabaseAdmin
      .from("sync_runs")
      .insert({ source, status: "running", started_at: startedAt })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    if (data) id = data.id as string;
  } catch (error) {
    if (monitored) throw error;
    // logging must never break the sync itself
  }
  if (monitored) {
    if (!id) throw new Error("Cannot start monitored import without a durable run record");
    try {
      const snapshot = await supabaseAdmin.rpc("get_sync_review_snapshot");
      if (snapshot.error) throw new Error(snapshot.error.message);
      before = reviewSnapshotSchema.parse(snapshot.data);
      const saved = await supabaseAdmin
        .from("sync_runs")
        .update({
          review_integrity: {
            status: "checking",
            before,
            after: null,
            conflict_attempts_added: null,
          } as unknown as Json,
        })
        .eq("id", id);
      if (saved.error) throw new Error(saved.error.message);
    } catch (error) {
      const message = `Pre-import integrity check unavailable: ${error instanceof Error ? error.message : String(error)}`;
      await supabaseAdmin
        .from("sync_runs")
        .update({
          status: "error",
          finished_at: new Date().toISOString(),
          error_message: message,
          review_integrity: compareReviewSnapshots(null, null, message) as unknown as Json,
        })
        .eq("id", id);
      throw new Error(message);
    }
  }

  return {
    id,
    async finish(patch: SyncRunPatch) {
      if (!id || finished) return;
      // Typed error paths and outer catches may both finish the same run.
      // Keep the first complete receipt and send at most one notification.
      finished = true;
      const durationMs = Date.now() - t0;
      let assuranceError: string | undefined;
      let reviewIntegrity;
      if (monitored) {
        let after: ReviewSnapshot | null = null;
        try {
          const snapshot = await supabaseAdmin.rpc("get_sync_review_snapshot");
          if (snapshot.error) throw new Error(snapshot.error.message);
          after = reviewSnapshotSchema.parse(snapshot.data);
        } catch (error) {
          assuranceError = `Post-import integrity check unavailable: ${error instanceof Error ? error.message : String(error)}`;
        }
        reviewIntegrity = compareReviewSnapshots(before, after, assuranceError);
        if (reviewIntegrity.status === "failed")
          assuranceError = `Post-import integrity check found ${after?.violation_count} violations; inspect the run's reviewed-data report`;
        if (assuranceError)
          patch = {
            ...patch,
            status: "error",
            error_message: [patch.error_message, assuranceError].filter(Boolean).join("; "),
          };
      }
      try {
        const saved = await supabaseAdmin
          .from("sync_runs")
          .update({
            ...patch,
            finished_at: new Date().toISOString(),
            duration_ms: durationMs,
            ...(reviewIntegrity ? { review_integrity: reviewIntegrity as unknown as Json } : {}),
          })
          .eq("id", id);
        if (saved.error) throw new Error(saved.error.message);
      } catch (error) {
        if (monitored) throw error;
        // swallow — never fail the sync because logging failed
      }

      // Send admin summary email (best-effort).
      try {
        const status = (patch.status as "success" | "error" | "partial" | undefined) ?? "success";
        if (options.notify !== false)
          await sendSyncSummaryNotification({
            syncRunId: id,
            source,
            status,
            startedAt,
            durationMs,
            fetched: patch.fetched ?? null,
            active: patch.active ?? null,
            written: patch.written ?? null,
            newEvents: patch.new_events ?? null,
            updatedExisting: patch.updated_existing ?? null,
            skippedDupes: patch.skipped_dupes ?? null,
            skippedNoDate: patch.skipped_no_date ?? null,
            failedPages: patch.failed_pages ?? null,
            errorMessage: patch.error_message ?? null,
          });
      } catch {
        // swallow — email is best-effort
      }
      if (assuranceError) throw new Error(assuranceError);
    },
  };
}
