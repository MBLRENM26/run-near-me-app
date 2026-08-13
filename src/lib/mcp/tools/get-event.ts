import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { withUsageLogging } from "../usage";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/site";

export default defineTool({
  name: "get_event",
  title: "Get event by slug",
  description:
    "Fetch the public record for a single running event by its slug (as used in the /events/{slug} URL). Returns structured fields only; do not treat scraped entry_fee or organiser fields as authoritative — always link users to the official event page for booking/pricing.",
  inputSchema: {
    slug: z.string().trim().min(1).describe("Event slug, e.g. 'london-marathon-2026'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: withUsageLogging("get_event", async ({ slug }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data, error } = await supabase
      .from("events")
      .select(
        "id, slug, name, date_raw, sort_date, town, county, region, distances, distance_tags, terrain_tags, entry_fee, entry_url, organiser_url, governance, organiser_type, race_profile, lat, lng, status",
      )
      .eq("slug", slug)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return { content: [{ type: "text", text: `Event '${slug}' not found or not active.` }], isError: true };
    }

    const { id, status, ...publicEvent } = data;
    const event = { ...publicEvent, canonical_url: `${SITE_URL}/events/${data.slug}` };
    return {
      content: [{ type: "text", text: JSON.stringify(event, null, 2) }],
      structuredContent: event,
    };
  }),
});
