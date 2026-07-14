import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendSyncSummaryNotification } from "@/lib/notify-sync.server";

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

export async function startSyncRun(source: string): Promise<SyncRunLogger> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  let id: string | null = null;
  try {
    const { data, error } = await supabaseAdmin
      .from("sync_runs")
      .insert({ source, status: "running", started_at: startedAt })
      .select("id")
      .single();
    if (!error && data) id = data.id as string;
  } catch {
    // logging must never break the sync itself
  }

  return {
    id,
    async finish(patch: SyncRunPatch) {
      if (!id) return;
      const durationMs = Date.now() - t0;
      try {
        await supabaseAdmin
          .from("sync_runs")
          .update({
            ...patch,
            finished_at: new Date().toISOString(),
            duration_ms: durationMs,
          })
          .eq("id", id);
      } catch {
        // swallow — never fail the sync because logging failed
      }

      // Send admin summary email (best-effort).
      try {
        const status =
          (patch.status as "success" | "error" | "partial" | undefined) ??
          "success";
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
    },
  };
}
