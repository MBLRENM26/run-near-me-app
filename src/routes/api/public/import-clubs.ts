import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { normaliseRegion } from "@/lib/region-normalize";
import { classifyEventLink } from "@/lib/link-trust";
import { sanitizeApiError } from "@/lib/api-error.server";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

const GOVERNING_BODIES = [
  "england-athletics",
  "scottish-athletics",
  "welsh-athletics",
  "athletics-ni",
] as const;

const ClubRowSchema = z.object({
  norm_id: z.string().min(1).max(255),
  name: z.string().min(1).max(500),
  slug: z.string().max(255).nullish(),
  governing_body: z.enum(GOVERNING_BODIES),
  affiliation_number: z.string().max(100).nullish(),
  town: z.string().max(255).nullish(),
  county: z.string().max(255).nullish(),
  region: z.string().max(255).nullish(),
  country: z.string().max(255).nullish(),
  postcode: z.string().max(20).nullish(),
  lat: z.number().min(-90).max(90).nullish(),
  lng: z.number().min(-180).max(180).nullish(),
  website_url: z.string().max(2000).nullish(),
  contact_email: z.string().max(255).nullish(),
  contact_phone: z.string().max(50).nullish(),
  disciplines: z.array(z.string().max(100)).max(20).optional().default([]),
  source: z.string().max(255).nullish(),
  source_url: z.string().max(2000).nullish(),
  status: z.string().max(50).optional().default("ACTIVE"),
  norm_created_at: z.string().datetime().nullish(),
});

const PayloadSchema = z.object({
  clubs: z.array(ClubRowSchema).min(1).max(500),
});

type IngestRow = z.infer<typeof ClubRowSchema>;

export const Route = createFileRoute("/api/public/import-clubs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.IMPORT_SECRET;
        if (!expected) {
          return json({ error: "Server not configured" }, 500);
        }
        const provided = request.headers.get("x-import-secret");
        if (!provided || provided !== expected) {
          return json({ error: "Unauthorized" }, 401);
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }

        const parsed = PayloadSchema.safeParse(body);
        if (!parsed.success) {
          return json(
            { error: "Validation failed", issues: parsed.error.issues },
            400,
          );
        }

        const received = parsed.data.clubs.length;
        const accepted: IngestRow[] = [];
        const rejected: Array<{ norm_id: string; reason: string }> = [];

        for (const c of parsed.data.clubs) {
          // Reject aggregator website URLs at the door — clubs should point
          // at their own site, not a governing-body directory listing.
          if (c.website_url) {
            const kind = classifyEventLink(c.website_url).kind;
            if (kind === "untrusted") {
              rejected.push({
                norm_id: c.norm_id,
                reason: "website_url is an aggregator host",
              });
              continue;
            }
          }
          accepted.push(c);
        }

        if (accepted.length === 0) {
          return json({ ok: true, received, written: 0, rejected }, 200);
        }

        const draft = accepted.map((c) => ({
          row: c,
          baseSlug: (c.slug?.trim() || slugify(c.name)) || c.norm_id,
        }));

        // Find existing slugs that could collide. Exclude rows being updated
        // in this batch (matched by norm_id) — they keep their slug.
        const normIds = draft.map((d) => d.row.norm_id);
        const bases = Array.from(new Set(draft.map((d) => d.baseSlug)));
        const orFilter = bases
          .map((b) => `slug.eq.${b},slug.like.${b}-%`)
          .join(",");

        const { data: existing, error: existingErr } = await supabaseAdmin
          .from("clubs")
          .select("slug, norm_id")
          .or(orFilter);

        if (existingErr) {
          return sanitizeApiError(existingErr, "import-clubs");
        }

        const taken = new Set<string>();
        for (const r of existing ?? []) {
          if (!normIds.includes(r.norm_id) && r.slug) taken.add(r.slug);
        }

        const rows = draft.map(({ row, baseSlug }) => {
          let slug = baseSlug;
          let n = 2;
          while (taken.has(slug)) {
            slug = `${baseSlug}-${n}`.slice(0, 120);
            n += 1;
          }
          taken.add(slug);
          return {
            ...row,
            slug,
            region: normaliseRegion(row.region, row.county, row.lat, row.lng),
            disciplines: row.disciplines ?? [],
          };
        });

        const { data, error } = await supabaseAdmin
          .from("clubs")
          .upsert(rows, { onConflict: "norm_id" })
          .select("id, norm_id");

        if (error) {
          return sanitizeApiError(error, "import-clubs");
        }

        return json(
          {
            ok: true,
            received,
            written: data?.length ?? 0,
            rejected,
          },
          200,
        );
      },
    },
  },
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
