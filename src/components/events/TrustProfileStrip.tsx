import { ShieldCheck, Users, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { governanceDisplay, organiserTypeLabel, raceProfileLabel } from "@/lib/event-taxonomy";

type Tone = "trust" | "neutral" | "accent";

const toneClass: Record<Tone, string> = {
  trust: "border-primary/30 bg-primary/10 text-primary",
  neutral: "border-border bg-muted/60 text-foreground",
  accent: "border-accent/40 bg-accent/10 text-foreground",
};

function Badge({
  icon: Icon,
  label,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone: Tone;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
        toneClass[tone],
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {label}
    </span>
  );
}

interface Props {
  governance: string | null;
  /** Canonical public licence state. Raw value is never rendered. */
  licensed?: string | null;
  organiser_type: string | null;
  race_profile: string | null;
}

/**
 * Compact strip of trust/context badges on the event detail page.
 * Renders nothing when no field has a display value — no "Unknown"
 * placeholders and no scraped free-text ever appears here.
 *
 * The governance badge only earns the trust (green) tone when
 * `licensed` is an evidenced exact "true"; otherwise it is neutral
 * association context, never a permit claim.
 */
export function TrustProfileStrip({ governance, licensed, organiser_type, race_profile }: Props) {
  const gov = governanceDisplay(governance, licensed);
  const org = organiserTypeLabel(organiser_type);
  const profile = raceProfileLabel(race_profile);

  if (!gov.label && !org && !profile) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2" aria-label="Event profile">
      {gov.label && (
        <Badge icon={ShieldCheck} label={gov.label} tone={gov.permitted ? "trust" : "neutral"} />
      )}
      {org && <Badge icon={Users} label={org} tone="neutral" />}
      {profile && <Badge icon={Flag} label={profile} tone="accent" />}
    </div>
  );
}
