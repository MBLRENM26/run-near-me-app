import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/site";

export default defineTool({
  name: "list_clubs",
  title: "List UK running clubs",
  description:
    "List UK affiliated running clubs, optionally filtered by governance body (england-athletics, scottish-athletics, welsh-athletics, athletics-ni), region, or free-text on name/town.",
  inputSchema: {
    query: z.string().trim().optional().describe("Free-text match on club name or town."),
    region: z.string().trim().optional(),
    governing_body: z.string().trim().optional().describe("Governing body slug: england-athletics, scottish-athletics, welsh-athletics, athletics-ni."),
    limit: z.number().int().min(1).max(100).optional().default(30),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    let q = supabase
      .from("clubs")
      .select("id, slug, name, town, county, region, governing_body, website_url")
      .eq("status", "ACTIVE")
      .order("name", { ascending: true })
      .limit(input.limit ?? 30);

    if (input.query) q = q.or(`name.ilike.%${input.query}%,town.ilike.%${input.query}%`);
    if (input.region) q = q.ilike("region", input.region);
    if (input.governing_body) q = q.eq("governing_body", input.governing_body);

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const clubs = (data ?? []).map((c: any) => ({
      ...c,
      canonical_url: `${SITE_URL}/running-clubs/${c.slug}`,
    }));

    return {
      content: [{ type: "text", text: JSON.stringify({ count: clubs.length, clubs }, null, 2) }],
      structuredContent: { count: clubs.length, clubs },
    };
  },
});
