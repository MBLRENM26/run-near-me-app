Remove the database `id` and internal `status` fields from the MCP `get_event` tool response so it returns only public event data.

- In `src/lib/mcp/tools/get-event.ts`:
  - Keep `id` and `status` in the Supabase SELECT so the existing `status = ACTIVE` guard can stay.
  - Destructure both out of the returned payload before responding, leaving only public fields plus the computed `canonical_url`.
  - Tighten the tool description to clarify it returns the public event record only.
- Regenerate `.lovable/mcp/manifest.json` via `app_mcp_server--extract_mcp_manifest` so the catalog reflects any description change.