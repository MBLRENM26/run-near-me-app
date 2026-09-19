import { defineMcp, auth } from "@lovable.dev/mcp-js";
import searchEvents from "./tools/search-events";
import getEvent from "./tools/get-event";
import listClubs from "./tools/list-clubs";
import { SITE_URL } from "@/lib/site";

// Access control decision (19 September 2026): the server ran open from
// 13 August to 19 September 2026 to gather usage evidence. `mcp_tool_calls`
// recorded three calls in that window — one scanner probe and two internal
// smoke checks — so no external client depended on anonymous access. The
// server is therefore gated behind signed-in access rather than left open.
// Reopening it is a separate, evidence-led decision.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export default defineMcp({
  auth: auth.oauth.issuer({
    issuer: `${SUPABASE_URL}/auth/v1`,
    resource: `${SITE_URL}/mcp`,
    resourceName: "Running Events Near Me",
    // Supabase mints project-wide `aud: "authenticated"` tokens.
    acceptedAudiences: ["authenticated"],
  }),
  name: "running-events-near-me",
  title: "Running Events Near Me",
  version: "0.1.0",
  instructions:
    "Public UK running-event and club directory. Use `search_events` to find upcoming races by keyword, region, distance, terrain, or month; `get_event` to fetch the full record for a single event by slug; `list_clubs` to browse affiliated UK running clubs. Scraped fields such as entry_fee and organiser are indicative only — always direct users to the official event page (entry_url / organiser_url) for authoritative pricing and booking.",
  tools: [searchEvents, getEvent, listClubs],
});
