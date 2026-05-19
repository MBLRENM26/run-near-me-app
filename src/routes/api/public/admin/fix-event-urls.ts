import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const GOVERNING_BODY_FIXES: Record<string, string> = {
  "lee-pen-hill-race": "http://www.stronansgames.org",
  "caradoc-classic-fell-race": "http://www.telfordathleticclub.co.uk",
  "batch-bash-fell-race": "https://merciafr.club/",
  "cautley-horseshoe": "http://www.howgillharriers.co.uk",
  "stoodley-pike-fell-race": "http://www.todharriers.co.uk",
  "pete-bland-kentmere-horseshoe": "http://www.peteblandsports.co.uk",
  "hapton-fell-race": "http://www.runningspecevents.com",
  "hameldon-quarry-race": "http://www.runningspecevents.com",
  "ilkley-incline": "http://www.ilkleyharriers.org.uk",
  "trunce-series-race-9": "http://www.trunce.org",
};

const BATCH_SIZE = 20;
const TIMEOUT_MS = 5000;

type ProbeResult = { id: string; alive: boolean };

async function probeUrl(id: string, url: string): Promise<ProbeResult> {
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "follow",
    });
    const s = res.status;
    if (s === 404 || s === 410 || (s >= 500 && s < 600)) {
      return { id, alive: false };
    }
    // RunABC soft-404: redirects unknown slugs to /404 with HTTP 200
    try {
      const finalPath = new URL(res.url).pathname.replace(/\/+$/, "");
      if (finalPath.endsWith("/404")) {
        return { id, alive: false };
      }
    } catch {
      // ignore URL parse errors
    }
    return { id, alive: true };
  } catch {
    return { id, alive: false };
  }
}

export const Route = createFileRoute("/api/public/admin/fix-event-urls")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.IMPORT_SECRET;
        if (!expected) {
          return Response.json(
            { error: "Server not configured" },
            { status: 500 },
          );
        }
        const provided = request.headers.get("x-admin-secret");
        if (!provided || provided !== expected) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const errors: Array<{ id?: string; slug?: string; message: string }> = [];

        // Part 1 — probe RunABC fallback URLs
        const { data: candidates, error: selErr } = await supabaseAdmin
          .from("events")
          .select("id, entry_url")
          .eq("source", "runabc")
          .like("entry_url", "https://runabc.co.uk%")
          .or("organiser_url.is.null,organiser_url.eq.");

        if (selErr) {
          return Response.json(
            { error: `Query failed: ${selErr.message}` },
            { status: 500 },
          );
        }

        const rows = (candidates ?? []).filter(
          (r): r is { id: string; entry_url: string } =>
            typeof r.entry_url === "string" && r.entry_url.length > 0,
        );

        let nullified = 0;
        let kept = 0;

        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          const batch = rows.slice(i, i + BATCH_SIZE);
          const settled = await Promise.allSettled(
            batch.map((r) => probeUrl(r.id, r.entry_url)),
          );

          const deadIds: string[] = [];
          for (let j = 0; j < settled.length; j++) {
            const s = settled[j];
            const row = batch[j];
            if (s.status === "fulfilled") {
              if (s.value.alive) {
                kept++;
              } else {
                deadIds.push(row.id);
              }
            } else {
              deadIds.push(row.id);
              errors.push({
                id: row.id,
                message: `probe rejected: ${String(s.reason)}`,
              });
            }
          }

          if (deadIds.length > 0) {
            const { error: updErr } = await supabaseAdmin
              .from("events")
              .update({ entry_url: null })
              .in("id", deadIds);
            if (updErr) {
              errors.push({
                message: `batch update failed (${deadIds.length} ids): ${updErr.message}`,
              });
            } else {
              nullified += deadIds.length;
            }
          }
        }

        // Part 2 — apply governing body URL fixes
        let governing_body_fixes_applied = 0;
        for (const [slug, url] of Object.entries(GOVERNING_BODY_FIXES)) {
          const { data, error } = await supabaseAdmin
            .from("events")
            .update({ entry_url: url, organiser_url: url })
            .eq("slug", slug)
            .select("id");
          if (error) {
            errors.push({ slug, message: error.message });
          } else if (!data || data.length === 0) {
            errors.push({ slug, message: "no matching event" });
          } else {
            governing_body_fixes_applied++;
          }
        }

        return Response.json({
          slugs_tested: rows.length,
          nullified,
          kept,
          governing_body_fixes_applied,
          errors,
        });
      },
    },
  },
});
