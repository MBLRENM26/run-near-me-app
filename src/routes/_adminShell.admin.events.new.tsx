import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { createAdminEvent, type AdminEventCreateInput } from "@/lib/admin-events.functions";
import { adminCheckSession } from "@/lib/admin.functions";
import { REGIONS } from "@/lib/regions";
import { classifyEventLink } from "@/lib/link-trust";
import {
  DISTANCE_TAG_VALUES,
  TERRAIN_TAG_VALUES,
  parseEventTags,
} from "@/lib/event-tags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";

const STATUSES = ["ACTIVE", "DUPLICATE", "EXPIRED"] as const;

type FormState = AdminEventCreateInput;

export const Route = createFileRoute("/_adminShell/admin/events/new")({
  head: () => ({
    meta: [
      { title: "New event — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NewAdminEventPage,
});

function NewAdminEventPage() {
  const navigate = useNavigate();
  const checkSession = useServerFn(adminCheckSession);
  const createEvent = useServerFn(createAdminEvent);
  const [authChecked, setAuthChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: "",
    status: "EXPIRED",
    source: "manual",
    country: "United Kingdom",
    is_upcoming: false,
    is_featured: false,
    is_recurring: false,
    date_is_estimated: false,
    distance_tags: [],
    terrain_tags: [],
    is_curated_tags: true,
  });

  useEffect(() => {
    checkSession()
      .then((res) => {
        if (!res.authenticated) navigate({ to: "/admin/login" });
        else setAuthChecked(true);
      })
      .catch(() => navigate({ to: "/admin/login" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleTag = (kind: "distance_tags" | "terrain_tags", tag: string) => {
    setForm((f) => {
      const cur = (f[kind] as string[] | undefined) ?? [];
      const next = cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag];
      return { ...f, [kind]: next, is_curated_tags: true };
    });
  };

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

  const canSave = useMemo(() => form.name.trim().length > 0, [form.name]);

  const handleCreate = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, value]) => value !== undefined),
      ) as AdminEventCreateInput;
      const res = await createEvent({ data: payload });
      toast.success("Draft event created");
      navigate({ to: "/admin/events/$id", params: { id: res.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create event");
    } finally {
      setSaving(false);
    }
  };

  if (!authChecked) {
    return <p className="text-sm text-muted-foreground">Checking session…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            to="/admin/events"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← All events
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-foreground">New event</h1>
          <p className="text-sm text-muted-foreground">
            Creates a manual draft row. It stays hidden until status is set to ACTIVE.
          </p>
        </div>
        <Button onClick={handleCreate} disabled={!canSave || saving}>
          {saving ? "Creating…" : "Create draft event"}
        </Button>
      </div>

      <Section title="Core">
        <Field label="Name">
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Slug" hint="Leave blank to auto-generate from name and date">
          <Input value={form.slug ?? ""} onChange={(e) => set("slug", e.target.value || undefined)} />
        </Field>
        <Field label="Status">
          <select
            value={form.status ?? "EXPIRED"}
            onChange={(e) => set("status", e.target.value as (typeof STATUSES)[number])}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Source">
          <Input value={form.source ?? "manual"} onChange={(e) => set("source", e.target.value || null)} />
        </Field>
        <Field label="Date (raw display)">
          <Input value={form.date_raw ?? ""} onChange={(e) => set("date_raw", e.target.value || null)} />
        </Field>
        <Field label="Sort date">
          <Input type="date" value={form.sort_date ?? ""} onChange={(e) => set("sort_date", e.target.value || null)} />
        </Field>
        <Field label="Date from">
          <Input type="date" value={form.date_from ?? ""} onChange={(e) => set("date_from", e.target.value || null)} />
        </Field>
        <Field label="Date to">
          <Input type="date" value={form.date_to ?? ""} onChange={(e) => set("date_to", e.target.value || null)} />
        </Field>
        <Field label="Distances" hint="Free text, e.g. 10K, Half Marathon">
          <Input value={form.distances ?? ""} onChange={(e) => set("distances", e.target.value || null)} />
        </Field>
        <Field label="Discipline">
          <Input value={form.discipline ?? ""} onChange={(e) => set("discipline", e.target.value || null)} placeholder="e.g. road, trail" />
        </Field>
      </Section>

      <Section title="Tags (normalised)">
        <div className="col-span-2 -mt-1 mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>Tags drive public distance and terrain pages. Use Re-parse to infer from name, distances and discipline.</p>
          <Button type="button" size="sm" variant="outline" onClick={reparseFromForm}>
            Re-parse from raw
          </Button>
        </div>
        <Field label="Distance tags">
          <TagChips all={DISTANCE_TAG_VALUES as readonly string[]} selected={form.distance_tags ?? []} onToggle={(t) => toggleTag("distance_tags", t)} />
        </Field>
        <Field label="Terrain tags">
          <TagChips all={TERRAIN_TAG_VALUES as readonly string[]} selected={form.terrain_tags ?? []} onToggle={(t) => toggleTag("terrain_tags", t)} />
        </Field>
        <Field label="Curated">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.is_curated_tags} onChange={(e) => set("is_curated_tags", e.target.checked)} />
            <span className="text-muted-foreground">Protect these tags from parser backfills</span>
          </label>
        </Field>
      </Section>

      <Section title="Location">
        <Field label="Town">
          <Input value={form.town ?? ""} onChange={(e) => set("town", e.target.value || null)} />
        </Field>
        <Field label="County">
          <Input value={form.county ?? ""} onChange={(e) => set("county", e.target.value || null)} />
        </Field>
        <Field label="Region">
          <select
            value={form.region ?? ""}
            onChange={(e) => set("region", e.target.value || null)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">— none —</option>
            {REGIONS.map((r) => (
              <option key={r.slug} value={r.name}>{r.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Country">
          <Input value={form.country ?? ""} onChange={(e) => set("country", e.target.value || null)} />
        </Field>
        <Field label="Location (raw)">
          <Input value={form.location_raw ?? ""} onChange={(e) => set("location_raw", e.target.value || null)} />
        </Field>
        <Field label="Latitude">
          <Input type="number" step="0.000001" value={form.lat ?? ""} onChange={(e) => set("lat", e.target.value === "" ? null : Number(e.target.value))} />
        </Field>
        <Field label="Longitude">
          <Input type="number" step="0.000001" value={form.lng ?? ""} onChange={(e) => set("lng", e.target.value === "" ? null : Number(e.target.value))} />
        </Field>
      </Section>

      <Section title="Links">
        <UrlField label="Entry URL" value={form.entry_url ?? ""} onChange={(v) => set("entry_url", v || null)} />
        <UrlField label="Organiser URL" value={form.organiser_url ?? ""} onChange={(v) => set("organiser_url", v || null)} />
        <UrlField label="Source URL" value={form.source_url ?? ""} onChange={(v) => set("source_url", v || null)} />
        <Field label="Organiser (name)">
          <Input value={form.organiser ?? ""} onChange={(e) => set("organiser", e.target.value || null)} />
        </Field>
        <Field label="Entry fee (raw)">
          <Input value={form.entry_fee ?? ""} onChange={(e) => set("entry_fee", e.target.value || null)} />
        </Field>
        <Field label="Licensed">
          <Input value={form.licensed ?? ""} onChange={(e) => set("licensed", e.target.value || null)} />
        </Field>
      </Section>

      <Section title="Flags">
        <CheckField label="Featured" checked={!!form.is_featured} onChange={(v) => set("is_featured", v)} />
        <CheckField label="Upcoming" checked={!!form.is_upcoming} onChange={(v) => set("is_upcoming", v)} />
        <CheckField label="Recurring" checked={!!form.is_recurring} onChange={(v) => set("is_recurring", v)} />
        <CheckField label="Date is estimated" checked={!!form.date_is_estimated} onChange={(v) => set("date_is_estimated", v)} />
      </Section>

      <Toaster position="top-center" />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-foreground">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <Field label={label}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </Field>
  );
}

function UrlField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
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

function TagChips({ all, selected, onToggle }: { all: readonly string[]; selected: string[]; onToggle: (tag: string) => void }) {
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