import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getAdminEvent,
  updateAdminEvent,
  setAdminEventStatus,
  deleteAdminEvent,
  unmergeDuplicateEvent,
  type AdminEventFull,
} from "@/lib/admin-events.functions";
import { adminCheckSession } from "@/lib/admin.functions";
import { REGIONS } from "@/lib/regions";
import { classifyEventLink } from "@/lib/link-trust";
import {
  DISTANCE_TAG_VALUES,
  TERRAIN_TAG_VALUES,
  parseEventTags,
  type DistanceTag,
  type TerrainTag,
} from "@/lib/event-tags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";

const STATUSES = ["ACTIVE", "DUPLICATE", "EXPIRED"] as const;

export const Route = createFileRoute("/_adminShell/admin/events/$id")({
  head: () => ({
    meta: [
      { title: "Edit event — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminEventEditorPage,
});

type FormState = Partial<AdminEventFull>;

function AdminEventEditorPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const fetchOne = useServerFn(getAdminEvent);
  const saveOne = useServerFn(updateAdminEvent);
  const setStatus = useServerFn(setAdminEventStatus);
  const deleteOne = useServerFn(deleteAdminEvent);
  const unmergeFn = useServerFn(unmergeDuplicateEvent);
  const checkSession = useServerFn(adminCheckSession);

  const [authChecked, setAuthChecked] = useState(false);
  useEffect(() => {
    checkSession()
      .then((res) => {
        if (!res.authenticated) navigate({ to: "/admin/login" });
        else setAuthChecked(true);
      })
      .catch(() => navigate({ to: "/admin/login" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-event", id],
    queryFn: () => fetchOne({ data: { id } }),
    enabled: authChecked,
  });

  const [form, setForm] = useState<FormState>({});
  useEffect(() => {
    if (data?.event) setForm(data.event);
  }, [data?.event]);

  const [saving, setSaving] = useState(false);

  if (!authChecked || isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const event = data.event;

  const set = <K extends keyof AdminEventFull>(
    key: K,
    value: AdminEventFull[K] | null,
  ) => setForm((f) => ({ ...f, [key]: value }));

  // Toggle a single tag in distance_tags or terrain_tags. Also marks the row
  // as curated so the parser-backfill never overwrites the human choice.
  const toggleTag = (kind: "distance_tags" | "terrain_tags", tag: string) => {
    setForm((f) => {
      const cur = (f[kind] as string[] | undefined) ?? [];
      const next = cur.includes(tag)
        ? cur.filter((t) => t !== tag)
        : [...cur, tag];
      return { ...f, [kind]: next, is_curated_tags: true };
    });
  };

  // Re-run the parser on the current form values without saving — handy when
  // editing distances/discipline and you want to preview the inferred tags.
  const reparseFromForm = () => {
    const parsed = parseEventTags({
      name: form.name ?? null,
      distances: form.distances ?? null,
      discipline: form.discipline ?? null,
    });
    setForm((f) => ({
      ...f,
      distance_tags: parsed.distance_tags,
      terrain_tags: parsed.terrain_tags,
      is_curated_tags: false,
    }));
  };

  const arrayEq = (a: unknown, b: unknown) => {
    if (!Array.isArray(a) || !Array.isArray(b)) return a === b;
    if (a.length !== b.length) return false;
    const sa = new Set(a as string[]);
    for (const x of b as string[]) if (!sa.has(x)) return false;
    return true;
  };

  const diff: Partial<AdminEventFull> = {};
  for (const k of Object.keys(form) as (keyof AdminEventFull)[]) {
    const fv = form[k];
    const ev = event[k];
    const equal = Array.isArray(fv) || Array.isArray(ev) ? arrayEq(fv, ev) : fv === ev;
    if (!equal) (diff as Record<string, unknown>)[k] = fv;
  }
  const dirty = Object.keys(diff).length > 0;

  const handleSave = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      // Coerce numbers
      const patch: Record<string, unknown> = { ...diff };
      if ("lat" in patch)
        patch.lat = patch.lat === null || patch.lat === "" ? null : Number(patch.lat);
      if ("lng" in patch)
        patch.lng = patch.lng === null || patch.lng === "" ? null : Number(patch.lng);

      const res = await saveOne({ data: { id, patch: patch as never } });
      toast.success(`Saved (${res.changed} field${res.changed === 1 ? "" : "s"})`);
      queryClient.invalidateQueries({ queryKey: ["admin-event", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (status: (typeof STATUSES)[number]) => {
    if (!confirm(`Set status to ${status}?`)) return;
    try {
      await setStatus({ data: { id, status } });
      toast.success(`Status set to ${status}`);
      queryClient.invalidateQueries({ queryKey: ["admin-event", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        `HARD DELETE this event? This cannot be undone.\n\n${event.name}`,
      )
    )
      return;
    try {
      await deleteOne({ data: { id } });
      toast.success("Deleted");
      navigate({ to: "/admin/events" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/admin/events"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← All events
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-foreground">{event.name}</h1>
          <p className="text-sm text-muted-foreground">
            {event.slug} ·{" "}
            <Link
              to="/events/$slug"
              params={{ slug: event.slug ?? "" }}
              className="text-primary hover:underline"
              target="_blank"
            >
              View live page ↗
            </Link>
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={!dirty || saving}>
            {saving ? "Saving…" : dirty ? `Save ${Object.keys(diff).length} change${Object.keys(diff).length === 1 ? "" : "s"}` : "No changes"}
          </Button>
        </div>
      </div>

      {/* Core */}
      <Section title="Core">
        <Field label="Name">
          <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Slug" hint="kebab-case (a-z, 0-9, -)">
          <Input value={form.slug ?? ""} onChange={(e) => set("slug", e.target.value)} />
        </Field>
        <Field label="Date (raw display)">
          <Input
            value={form.date_raw ?? ""}
            onChange={(e) => set("date_raw", e.target.value || null)}
            placeholder="e.g. Sunday 16 March 2025"
          />
        </Field>
        <Field label="Sort date" hint="YYYY-MM-DD, used for ordering & 'upcoming'">
          <Input
            type="date"
            value={form.sort_date ?? ""}
            onChange={(e) => set("sort_date", e.target.value || null)}
          />
        </Field>
        <Field label="Date from">
          <Input
            type="date"
            value={form.date_from ?? ""}
            onChange={(e) => set("date_from", e.target.value || null)}
          />
        </Field>
        <Field label="Date to">
          <Input
            type="date"
            value={form.date_to ?? ""}
            onChange={(e) => set("date_to", e.target.value || null)}
          />
        </Field>
        <Field label="Distances" hint="free text, e.g. '5K, 10K, Half'">
          <Input
            value={form.distances ?? ""}
            onChange={(e) => set("distances", e.target.value || null)}
          />
        </Field>
        <Field label="Discipline">
          <Input
            value={form.discipline ?? ""}
            onChange={(e) => set("discipline", e.target.value || null)}
            placeholder="e.g. road, trail"
          />
        </Field>
      </Section>

      {/* Normalised tags — drives distance/region pages */}
      <Section title="Tags (normalised)">
        <div className="col-span-2 -mt-1 mb-2 flex items-center justify-between gap-3 text-xs">
          <p className="text-muted-foreground">
            Tags drive what appears on the public distance pages (5K, 10K,
            Trail, etc.). Edit by hand to override the parser — the row is
            marked <strong>curated</strong> and the scraper backfill leaves it
            alone. Use <em>Re-parse from raw</em> to discard manual tags and
            re-derive from <code>distances</code>+<code>discipline</code>.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={reparseFromForm}
          >
            Re-parse from raw
          </Button>
        </div>
        <Field label="Distance tags">
          <TagChips
            all={DISTANCE_TAG_VALUES as readonly string[]}
            selected={(form.distance_tags as string[] | undefined) ?? []}
            onToggle={(t) => toggleTag("distance_tags", t)}
          />
        </Field>
        <Field label="Terrain tags">
          <TagChips
            all={TERRAIN_TAG_VALUES as readonly string[]}
            selected={(form.terrain_tags as string[] | undefined) ?? []}
            onToggle={(t) => toggleTag("terrain_tags", t)}
          />
        </Field>
        <Field label="Curated">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!form.is_curated_tags}
              onChange={(e) => set("is_curated_tags", e.target.checked)}
            />
            <span className="text-muted-foreground">
              Protect these tags from the parser backfill
            </span>
          </label>
        </Field>
      </Section>


      {/* Location */}
      <Section title="Location">
        <Field label="Town">
          <Input value={form.town ?? ""} onChange={(e) => set("town", e.target.value || null)} />
        </Field>
        <Field label="County">
          <Input value={form.county ?? ""} onChange={(e) => set("county", e.target.value || null)} />
        </Field>
        <Field label="Region" hint="canonical UK region only">
          <select
            value={form.region ?? ""}
            onChange={(e) => set("region", (e.target.value || null) as string | null)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">— none —</option>
            {REGIONS.map((r) => (
              <option key={r.slug} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
          {form.region && !REGIONS.some((r) => r.name === form.region) && (
            <p className="mt-1 text-xs text-destructive">
              Current value "{form.region}" is not canonical. Pick from the list to fix.
            </p>
          )}
        </Field>
        <Field label="Country">
          <Input
            value={form.country ?? ""}
            onChange={(e) => set("country", e.target.value || null)}
          />
        </Field>
        <Field label="Location (raw)">
          <Input
            value={form.location_raw ?? ""}
            onChange={(e) => set("location_raw", e.target.value || null)}
          />
        </Field>
        <Field label="Latitude">
          <Input
            type="number"
            step="0.000001"
            value={form.lat ?? ""}
            onChange={(e) =>
              set("lat", e.target.value === "" ? null : Number(e.target.value))
            }
          />
        </Field>
        <Field label="Longitude">
          <Input
            type="number"
            step="0.000001"
            value={form.lng ?? ""}
            onChange={(e) =>
              set("lng", e.target.value === "" ? null : Number(e.target.value))
            }
          />
        </Field>
      </Section>

      {/* Links + trust tier */}
      <Section title="Links">
        <UrlField
          label="Entry URL"
          value={form.entry_url ?? ""}
          onChange={(v) => set("entry_url", v || null)}
        />
        <UrlField
          label="Organiser URL"
          value={form.organiser_url ?? ""}
          onChange={(v) => set("organiser_url", v || null)}
        />
        <UrlField
          label="Source URL"
          value={form.source_url ?? ""}
          onChange={(v) => set("source_url", v || null)}
        />
        <Field label="Organiser (name)">
          <Input
            value={form.organiser ?? ""}
            onChange={(e) => set("organiser", e.target.value || null)}
          />
        </Field>
        <Field label="Entry fee (raw)">
          <Input
            value={form.entry_fee ?? ""}
            onChange={(e) => set("entry_fee", e.target.value || null)}
          />
        </Field>
        <Field label="Licensed">
          <Input
            value={form.licensed ?? ""}
            onChange={(e) => set("licensed", e.target.value || null)}
          />
        </Field>
      </Section>

      {/* Flags + status */}
      <Section title="Flags & status">
        <Field label="Status">
          <div className="flex gap-2">
            {STATUSES.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={event.status === s ? "default" : "outline"}
                onClick={() => handleStatus(s)}
                type="button"
              >
                {s}
              </Button>
            ))}
          </div>
        </Field>
        <Field label="Featured">
          <input
            type="checkbox"
            checked={!!form.is_featured}
            onChange={(e) => set("is_featured", e.target.checked)}
          />
        </Field>
        <Field label="Upcoming">
          <input
            type="checkbox"
            checked={!!form.is_upcoming}
            onChange={(e) => set("is_upcoming", e.target.checked)}
          />
        </Field>
        <Field label="Recurring">
          <input
            type="checkbox"
            checked={!!form.is_recurring}
            onChange={(e) => set("is_recurring", e.target.checked)}
          />
        </Field>
        <Field label="Date is estimated">
          <input
            type="checkbox"
            checked={!!form.date_is_estimated}
            onChange={(e) => set("date_is_estimated", e.target.checked)}
          />
        </Field>
        <Field label="Source">
          <Input
            value={form.source ?? ""}
            onChange={(e) => set("source", e.target.value || null)}
          />
        </Field>
        <Field label="Duplicate of (event UUID)">
          <Input
            value={form.duplicate_of ?? ""}
            onChange={(e) => set("duplicate_of", e.target.value || null)}
            placeholder="UUID of canonical event"
          />
        </Field>
      </Section>

      {/* System (read-only) */}
      <Section title="System (read-only)">
        <Field label="ID">
          <Input value={event.id} readOnly />
        </Field>
        <Field label="norm_id">
          <Input value={event.norm_id ?? ""} readOnly />
        </Field>
        <Field label="Created at">
          <Input value={event.created_at} readOnly />
        </Field>
      </Section>

      {/* Audit trail */}
      <Section title={`Recent edits (${data.edits.length})`}>
        {data.edits.length === 0 ? (
          <p className="text-sm text-muted-foreground col-span-2">No edits recorded.</p>
        ) : (
          <div className="col-span-2 space-y-2">
            {data.edits.map((e) => (
              <details key={e.id} className="rounded border border-border bg-card p-2 text-xs">
                <summary className="cursor-pointer text-muted-foreground">
                  {new Date(e.edited_at).toLocaleString()}
                  {e.note ? ` · ${e.note}` : ""} ·{" "}
                  {Object.keys((e.changes as Record<string, unknown>) ?? {}).length}{" "}
                  field(s)
                </summary>
                <pre className="mt-2 overflow-x-auto text-foreground">
                  {JSON.stringify(e.changes, null, 2)}
                </pre>
              </details>
            ))}
          </div>
        )}
      </Section>

      {/* Danger zone */}
      <Section title="Danger zone">
        <div className="col-span-2">
          <Textarea
            placeholder="Hard delete only allowed for source=manual rows. Use status above to soft-hide otherwise."
            value=""
            readOnly
            className="mb-3 text-xs"
            rows={2}
          />
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={event.source !== "manual"}
          >
            Hard delete event
          </Button>
        </div>
      </Section>

      <Toaster position="top-center" />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-foreground">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function UrlField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const classified = classifyEventLink(value);
  const tier =
    classified.kind === "entry"
      ? { text: "Trusted — renders as 'Enter now'", color: "text-green-700 dark:text-green-300" }
      : classified.kind === "organiser-site"
        ? { text: "Organiser homepage — renders as 'Visit organiser website'", color: "text-blue-700 dark:text-blue-300" }
        : classified.kind === "untrusted"
          ? { text: "Aggregator — will NOT render on event page", color: "text-amber-700 dark:text-amber-300" }
          : { text: "Empty / invalid", color: "text-muted-foreground" };
  return (
    <Field label={label}>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
      <p className={`mt-1 text-xs ${tier.color}`}>{tier.text}</p>
    </Field>
  );
}

function TagChips({
  all,
  selected,
  onToggle,
}: {
  all: readonly string[];
  selected: string[];
  onToggle: (tag: string) => void;
}) {
  const set = new Set(selected);
  return (
    <div className="flex flex-wrap gap-1.5">
      {all.map((tag) => {
        const on = set.has(tag);
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onToggle(tag)}
            className={
              "rounded-full border px-2.5 py-1 text-xs transition " +
              (on
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted")
            }
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}

