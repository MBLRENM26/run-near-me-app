import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isAdminAuthenticated } from "@/lib/admin-session.server";

export const SYNC_SOURCES = ["england-athletics", "scottish-athletics"] as const;
export type SyncSource = (typeof SYNC_SOURCES)[number];

const SOURCE_PATHS: Record<SyncSource, string> = {
  "england-athletics": "/api/public/admin/sync-england-athletics",
  "scottish-athletics": "/api/public/admin/sync-scottish-athletics",
};

export const triggerSyncRun = createServerFn({ method: "POST" })
  .inputValidator((input: { source: SyncSource }) => {
    if (!SYNC_SOURCES.includes(input.source)) {
      throw new Error("Invalid source");
    }
    return input;
  })
  .handler(async ({ data }) => {
    if (!isAdminAuthenticated()) throw new Error("Unauthorized");
    const secret = process.env.IMPORT_SECRET;
    if (!secret) throw new Error("Server not configured: IMPORT_SECRET missing");

    const req = getRequest();
    const origin = new URL(req.url).origin;
    const url = `${origin}${SOURCE_PATHS[data.source]}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "x-admin-secret": secret },
    });
    const text = await res.text();
    let parsed: Record<string, unknown> | null = null;
    try {
      const j = JSON.parse(text);
      if (j && typeof j === "object") parsed = j as Record<string, unknown>;
    } catch {
      // keep as text
    }
    if (!res.ok) {
      const msg =
        parsed && typeof parsed.error === "string"
          ? parsed.error
          : `Sync failed (${res.status})`;
      throw new Error(msg);
    }
    return { ok: true as const, summary: text.slice(0, 2000) };
  });

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
