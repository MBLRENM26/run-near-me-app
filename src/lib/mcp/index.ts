import { defineMcp } from "@lovable.dev/mcp-js";
import searchEvents from "./tools/search-events";
import getEvent from "./tools/get-event";
import listClubs from "./tools/list-clubs";

export default defineMcp({
  name: "running-events-near-me",
  title: "Running Events Near Me",
  version: "0.1.0",
  instructions:
    "Public UK running-event and club directory. Use `search_events` to find upcoming races by keyword, region, distance, terrain, or month; `get_event` to fetch the full record for a single event by slug; `list_clubs` to browse affiliated UK running clubs. Scraped fields such as entry_fee and organiser are indicative only — always direct users to the official event page (entry_url / organiser_url) for authoritative pricing and booking.",
  tools: [searchEvents, getEvent, listClubs],
});
