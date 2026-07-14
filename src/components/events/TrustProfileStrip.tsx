import { ShieldCheck, Users, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  governanceLabel,
  organiserTypeLabel,
  raceProfileLabel,
} from "@/lib/event-taxonomy";

type Tone = "trust" | "neutral" | "accent";

const toneClass: Record<Tone, string> = {
  trust:
    "border-primary/30 bg-primary/10 text-primary",
  neutral:
    "border-border bg-muted/60 text-foreground",
  accent:
    "border-accent/40 bg-accent/10 text-foreground",
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
  organiser_type: string | null;
  race_profile: string | null;
}

/**
 * Compact strip of trust/context badges on the event detail page.
 * Renders nothing when no field has a display value — no "Unknown"
 * placeholders and no scraped free-text ever appears here.
 */
export function TrustProfileStrip({ governance, organiser_type, race_profile }: Props) {
  const gov = governanceLabel(governance);
  const org = organiserTypeLabel(organiser_type);
  const profile = raceProfileLabel(race_profile);

  if (!gov && !org && !profile) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2" aria-label="Event profile">
      {gov && <Badge icon={ShieldCheck} label={gov} tone="trust" />}
      {org && <Badge icon={Users} label={org} tone="neutral" />}
      {profile && <Badge icon={Flag} label={profile} tone="accent" />}
    </div>
  );
}
