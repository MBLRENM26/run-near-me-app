import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isAdminAuthenticated } from "@/lib/admin-session.server";

export const SYNC_SOURCES = [
  "england-athletics",
  "scottish-athletics",
] as const;
export type SyncSource = (typeof SYNC_SOURCES)[number];

export type SyncRun = {
  id: string;
  source: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  fetched: number | null;
  active: number | null;
  written: number | null;
  new_events: number | null;
  updated_existing: number | null;
  skipped_dupes: number | null;
  skipped_no_date: number | null;
  failed_pages: number | null;
  error_message: string | null;
};

export const getSyncRuns = createServerFn({ method: "GET" }).handler(
  async (): Promise<SyncRun[]> => {
    if (!isAdminAuthenticated()) throw new Error("Unauthorized");

    const { data, error } = await supabaseAdmin
      .from("sync_runs")
      .select(
        "id, source, status, started_at, finished_at, duration_ms, fetched, active, written, new_events, updated_existing, skipped_dupes, skipped_no_date, failed_pages, error_message",
      )
      .order("started_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as SyncRun[];
  },
);

export const triggerSyncRun = createServerFn({ method: "POST" })
  .inputValidator((input: { source: SyncSource }) => {
    if (!SYNC_SOURCES.includes(input.source)) {
      throw new Error("Invalid source");
    }
    return input;
  })
  .handler(async ({ data }) => {
    if (!isAdminAuthenticated()) throw new Error("Unauthorized");

    try {
      if (data.source === "england-athletics") {
        const { runEnglandAthleticsSync } = await import(
          "@/lib/sync-england-athletics.server"
        );
        const result = await runEnglandAthleticsSync({});
        return {
          ok: true as const,
          newEvents: result.newEvents,
          updatedExisting: result.updatedExisting,
          written: result.written,
          fetched: result.fetched,
        };
      }
      const { runScottishAthleticsSync } = await import(
        "@/lib/sync-scottish-athletics.server"
      );
      const result = await runScottishAthleticsSync();
      return {
        ok: true as const,
        newEvents: result.newEvents,
        updatedExisting: result.updatedExisting,
        written: result.written,
        fetched: result.fetched,
      };
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : String(err));
    }
  });
