import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isAdminAuthenticated } from "@/lib/admin-session.server";

const inputSchema = z.object({
  days: z.number().int().min(1).max(365).default(30),
});

export type SearchAnalyticsRow = {
  query: string;
  count: number;
  clicks: number;
  ctr: number;
};

export type SearchAnalytics = {
  days: number;
  totalSearches: number;
  uniqueQueries: number;
  zeroResultCount: number;
  topQueries: SearchAnalyticsRow[];
  zeroResultQueries: { query: string; count: number }[];
};

export const getSearchAnalytics = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<SearchAnalytics> => {
    if (!isAdminAuthenticated()) throw new Error("Unauthorized");

    const since = new Date(
      Date.now() - data.days * 24 * 60 * 60 * 1000,
    ).toISOString();

    // Pull all logs in window (cap 10k — search volume is small).
    const { data: logs, error: logsErr } = await supabaseAdmin
      .from("search_logs")
      .select("id, query, results_count")
      .gte("created_at", since)
      .limit(10000);
    if (logsErr) throw new Error(logsErr.message);

    const allLogs = logs ?? [];
    const logIds = allLogs.map((l) => l.id as string);

    // Click counts grouped by search_log_id, then attributed back to query.
    const clicksByLogId = new Map<string, number>();
    if (logIds.length > 0) {
      // Chunk to avoid massive .in() payload.
      const CHUNK = 500;
      for (let i = 0; i < logIds.length; i += CHUNK) {
        const chunk = logIds.slice(i, i + CHUNK);
        const { data: clicks, error: clicksErr } = await supabaseAdmin
          .from("search_clicks")
          .select("search_log_id")
          .in("search_log_id", chunk);
        if (clicksErr) throw new Error(clicksErr.message);
        for (const c of clicks ?? []) {
          const id = c.search_log_id as string;
          clicksByLogId.set(id, (clicksByLogId.get(id) ?? 0) + 1);
        }
      }
    }

    type Agg = { count: number; clicks: number; zeros: number };
    const byQuery = new Map<string, Agg>();
    for (const l of allLogs) {
      const q = (l.query as string).toLowerCase().trim();
      if (!q) continue;
      const cur = byQuery.get(q) ?? { count: 0, clicks: 0, zeros: 0 };
      cur.count++;
      if ((l.results_count as number) === 0) cur.zeros++;
      cur.clicks += clicksByLogId.get(l.id as string) ?? 0;
      byQuery.set(q, cur);
    }

    const topQueries: SearchAnalyticsRow[] = Array.from(byQuery.entries())
      .map(([query, a]) => ({
        query,
        count: a.count,
        clicks: a.clicks,
        ctr: a.count > 0 ? a.clicks / a.count : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);

    const zeroResultQueries = Array.from(byQuery.entries())
      .filter(([, a]) => a.zeros > 0)
      .map(([query, a]) => ({ query, count: a.zeros }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);

    const totalSearches = allLogs.length;
    const uniqueQueries = byQuery.size;
    const zeroResultCount = allLogs.filter(
      (l) => (l.results_count as number) === 0,
    ).length;

    return {
      days: data.days,
      totalSearches,
      uniqueQueries,
      zeroResultCount,
      topQueries,
      zeroResultQueries,
    };
  });
