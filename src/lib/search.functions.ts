import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const inputSchema = z.object({
  q: z.string().trim().min(1).max(80),
  limit: z.number().int().min(1).max(50).optional(),
});

export type SearchResult = {
  id: string;
  slug: string;
  name: string;
  town: string | null;
  county: string | null;
  sort_date: string | null;
  distances: string | null;
  is_featured: boolean;
  date_is_estimated: boolean;
  is_past: boolean;
};

/**
 * Full-text event search. Backed by `search_events_v1` (ts_rank over a
 * weighted tsvector on name/town/county). Filters out duplicates and
 * past events older than 14 days. Returns ONLY public-safe columns —
 * never includes source / source_url (see mem://constraints/no-source-attribution).
 */
export const searchEvents = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<SearchResult[]> => {
    const { data: rows, error } = await supabaseAdmin.rpc(
      "search_events_v1",
      { q: data.q, lim: data.limit ?? 20 },
    );
    if (error) {
      console.error("[searchEvents] rpc error", error);
      return [];
    }
    return (rows ?? []) as SearchResult[];
  });
