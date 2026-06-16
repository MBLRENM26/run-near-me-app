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

export type TriggerSyncResult =
  | {
      ok: true;
      started: false;
      newEvents: number;
      updatedExisting: number;
      written: number;
      fetched: number;
    }
  | { ok: true; started: true };

const ACK_TIMEOUT_MS = 8000;

export const triggerSyncRun = createServerFn({ method: "POST" })
  .inputValidator((input: { source: SyncSource }) => {
    if (!SYNC_SOURCES.includes(input.source)) {
      throw new Error("Invalid source");
    }
    return input;
  })
  .handler(async ({ data }): Promise<TriggerSyncResult> => {
    if (!isAdminAuthenticated()) throw new Error("Unauthorized");

    const work: Promise<{
      newEvents: number;
      updatedExisting: number;
      written: number;
      fetched: number;
    }> = (async () => {
      if (data.source === "england-athletics") {
        const { runEnglandAthleticsSync } = await import(
          "@/lib/sync-england-athletics.server"
        );
        const r = await runEnglandAthleticsSync({});
        return {
          newEvents: r.newEvents,
          updatedExisting: r.updatedExisting,
          written: r.written,
          fetched: r.fetched,
        };
      }
      const { runScottishAthleticsSync } = await import(
        "@/lib/sync-scottish-athletics.server"
      );
      const r = await runScottishAthleticsSync();
      return {
        newEvents: r.newEvents,
        updatedExisting: r.updatedExisting,
        written: r.written,
        fetched: r.fetched,
      };
    })();

    // Swallow background rejection so it doesn't surface as an unhandled
    // rejection after we've already returned `started: true`. The sync's
    // own try/catch writes the error to the sync_runs row, so the UI
    // still sees it on the next poll.
    work.catch(() => undefined);

    const ackTimer = new Promise<"ack-timeout">((resolve) => {
      setTimeout(() => resolve("ack-timeout"), ACK_TIMEOUT_MS);
    });

    const raced = await Promise.race([
      work.then((r) => ({ kind: "done" as const, r })),
      ackTimer.then(() => ({ kind: "timeout" as const })),
    ]);

    if (raced.kind === "done") {
      return { ok: true as const, started: false as const, ...raced.r };
    }
    return { ok: true as const, started: true as const };
  });

