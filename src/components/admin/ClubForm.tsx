import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { REGIONS } from "@/lib/regions";

const GOVERNING_BODIES = [
  "england-athletics",
  "scottish-athletics",
  "welsh-athletics",
  "athletics-ni",
] as const;
const STATUSES = ["ACTIVE", "HIDDEN", "DELETED"] as const;

export type ClubFormValues = {
  name: string;
  slug: string;
  governing_body: (typeof GOVERNING_BODIES)[number];
  affiliation_number: string;
  town: string;
  county: string;
  region: string;
  country: string;
  postcode: string;
  lat: string;
  lng: string;
  website_url: string;
  contact_email: string;
  contact_phone: string;
  disciplines: string;
  status: (typeof STATUSES)[number];
  is_claimed: boolean;
};

export const emptyClubForm: ClubFormValues = {
  name: "",
  slug: "",
  governing_body: "england-athletics",
  affiliation_number: "",
  town: "",
  county: "",
  region: "",
  country: "United Kingdom",
  postcode: "",
  lat: "",
  lng: "",
  website_url: "",
  contact_email: "",
  contact_phone: "",
  disciplines: "",
  status: "ACTIVE",
  is_claimed: false,
};

export type ClubSubmitPayload = {
  name: string;
  slug: string;
  governing_body: (typeof GOVERNING_BODIES)[number];
  affiliation_number: string | null;
  town: string | null;
  county: string | null;
  region: string | null;
  country: string | null;
  postcode: string | null;
  lat: number | null;
  lng: number | null;
  website_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  disciplines: string[];
  status: (typeof STATUSES)[number];
  is_claimed: boolean;
};

export function ClubForm({
  initial,
  submitLabel,
  onSubmit,
  submitting,
}: {
  initial: ClubFormValues;
  submitLabel: string;
  onSubmit: (payload: ClubSubmitPayload) => Promise<void> | void;
  submitting?: boolean;
}) {
  const [values, setValues] = useState<ClubFormValues>(initial);

  const set = <K extends keyof ClubFormValues>(k: K, v: ClubFormValues[K]) =>
    setValues((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = (s: string): number | null => {
      const t = s.trim();
      if (!t) return null;
      const n = Number(t);
      return Number.isFinite(n) ? n : null;
    };
    const payload: ClubSubmitPayload = {
      name: values.name.trim(),
      slug: values.slug.trim(),
      governing_body: values.governing_body,
      affiliation_number: values.affiliation_number.trim() || null,
      town: values.town.trim() || null,
      county: values.county.trim() || null,
      region: values.region.trim() || null,
      country: values.country.trim() || null,
      postcode: values.postcode.trim() || null,
      lat: num(values.lat),
      lng: num(values.lng),
      website_url: values.website_url.trim() || null,
      contact_email: values.contact_email.trim() || null,
      contact_phone: values.contact_phone.trim() || null,
      disciplines: values.disciplines
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
      status: values.status,
      is_claimed: values.is_claimed,
    };
    void onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Field label="Name" required>
        <Input
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          maxLength={500}
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Slug" hint="Leave blank to generate from name">
          <Input
            value={values.slug}
            onChange={(e) => set("slug", e.target.value)}
            placeholder="club-slug"
            maxLength={120}
            pattern="[a-z0-9-]*"
          />
        </Field>
        <Field label="Governing body" required>
          <select
            value={values.governing_body}
            onChange={(e) =>
              set(
                "governing_body",
                e.target.value as ClubFormValues["governing_body"],
              )
            }
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            {GOVERNING_BODIES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Affiliation number">
        <Input
          value={values.affiliation_number}
          onChange={(e) => set("affiliation_number", e.target.value)}
          maxLength={100}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Town">
          <Input value={values.town} onChange={(e) => set("town", e.target.value)} />
        </Field>
        <Field label="County">
          <Input value={values.county} onChange={(e) => set("county", e.target.value)} />
        </Field>
        <Field label="Region">
          <select
            value={values.region}
            onChange={(e) => set("region", e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">—</option>
            {REGIONS.map((r) => (
              <option key={r.slug} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Country">
          <Input value={values.country} onChange={(e) => set("country", e.target.value)} />
        </Field>
        <Field label="Postcode">
          <Input
            value={values.postcode}
            onChange={(e) => set("postcode", e.target.value.toUpperCase())}
            maxLength={20}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Latitude">
            <Input
              value={values.lat}
              onChange={(e) => set("lat", e.target.value)}
              inputMode="decimal"
            />
          </Field>
          <Field label="Longitude">
            <Input
              value={values.lng}
              onChange={(e) => set("lng", e.target.value)}
              inputMode="decimal"
            />
          </Field>
        </div>
      </div>

      <Field label="Website URL">
        <Input
          type="url"
          value={values.website_url}
          onChange={(e) => set("website_url", e.target.value)}
          placeholder="https://"
          maxLength={2000}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Contact email">
          <Input
            type="email"
            value={values.contact_email}
            onChange={(e) => set("contact_email", e.target.value)}
            maxLength={255}
          />
        </Field>
        <Field label="Contact phone">
          <Input
            value={values.contact_phone}
            onChange={(e) => set("contact_phone", e.target.value)}
            maxLength={50}
          />
        </Field>
      </div>

      <Field label="Disciplines" hint="Comma-separated, e.g. road, trail, track">
        <Textarea
          value={values.disciplines}
          onChange={(e) => set("disciplines", e.target.value)}
          rows={2}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Status" required>
          <select
            value={values.status}
            onChange={(e) =>
              set("status", e.target.value as ClubFormValues["status"])
            }
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex items-end gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.is_claimed}
            onChange={(e) => set("is_claimed", e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-foreground">Marked as claimed</span>
        </label>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}
