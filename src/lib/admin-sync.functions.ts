import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isAdminAuthenticated } from "@/lib/admin-session.server";
import { requireSameOriginOrThrow } from "@/lib/admin-csrf.server";

async function requireAdminMutation() {
  if (!(await isAdminAuthenticated())) throw new Error("Unauthorized");
  requireSameOriginOrThrow();
}

export const SYNC_SOURCES = [
  "england-athletics",
  "scottish-athletics",
  "scottish-athletics-clubs",
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
    if (!(await isAdminAuthenticated())) throw new Error("Unauthorized");

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
    await requireAdminMutation();

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
      if (data.source === "scottish-athletics-clubs") {
        const { runScottishAthleticsClubsSync } = await import(
          "@/lib/sync-scottish-athletics-clubs.server"
        );
        const r = await runScottishAthleticsClubsSync();
        return {
          newEvents: r.newClubs,
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

export type EnglandAthleticsChunkResult = {
  ok: true;
  fromPage: number;
  toPage: number;
  lastPage: number;
  done: boolean;
  newEvents: number;
  updatedExisting: number;
  written: number;
  fetched: number;
  failedPages: number;
};

// Run a single page range of the EA sync, synchronously. The admin UI
// loops chunks until `done` is true; the weekly pg_cron does the same
// via a Postgres driver function. Each chunk is small enough to finish
// inside the Cloudflare Worker response window, so sync_runs rows never
// dangle in "running".
export const triggerEnglandAthleticsChunk = createServerFn({ method: "POST" })
  .inputValidator((input: { fromPage: number; toPage: number }) => {
    const fromPage = Math.floor(input.fromPage);
    const toPage = Math.floor(input.toPage);
    if (!Number.isFinite(fromPage) || fromPage < 1) {
      throw new Error("fromPage must be >= 1");
    }
    if (!Number.isFinite(toPage) || toPage < fromPage) {
      throw new Error("toPage must be >= fromPage");
    }
    if (toPage - fromPage > 49) {
      throw new Error("chunk too large (max 50 pages)");
    }
    return { fromPage, toPage };
  })
  .handler(async ({ data }): Promise<EnglandAthleticsChunkResult> => {
    await requireAdminMutation();
    const { runEnglandAthleticsSync } = await import(
      "@/lib/sync-england-athletics.server"
    );
    const r = await runEnglandAthleticsSync({
      fromPage: data.fromPage,
      toPage: data.toPage,
    });
    return {
      ok: true,
      fromPage: data.fromPage,
      toPage: data.toPage,
      lastPage: r.lastPage,
      done: r.done,
      newEvents: r.newEvents,
      updatedExisting: r.updatedExisting,
      written: r.written,
      fetched: r.fetched,
      failedPages: r.failedPages.length,
    };
  });

// One-off bootstrap: copy the current IMPORT_SECRET env value into
// vault.secrets as `import_secret` so the weekly pg_cron jobs can send
// it as the x-admin-secret header. Safe to re-run; updates in place.
export const seedImportSecretInVault = createServerFn({ method: "POST" })
  .handler(async (): Promise<{ ok: true }> => {
    await requireAdminMutation();
    const value = process.env.IMPORT_SECRET;
    if (!value) throw new Error("IMPORT_SECRET env var not set on server");
    const { error } = await supabaseAdmin.rpc("set_import_secret", {
      p_value: value,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });



