import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Lightweight wrapper used by the cron-triggered sync endpoints to
// persist a row in `sync_runs` for each run. The admin panel reads
// these rows to show what each weekly cron actually did.

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
      try {
        await supabaseAdmin
          .from("sync_runs")
          .update({
            ...patch,
            finished_at: new Date().toISOString(),
            duration_ms: Date.now() - t0,
          })
          .eq("id", id);
      } catch {
        // swallow — never fail the sync because logging failed
      }
    },
  };
}
