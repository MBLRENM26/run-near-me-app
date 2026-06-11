import type { EventType } from "@/lib/distance";
import { cn } from "@/lib/utils";
import { trackFilter } from "@/lib/analytics";



const RADII = [5, 10, 25, 50] as const;
export type Radius = (typeof RADII)[number];

const TYPES: { value: EventType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "5k", label: "5K" },
  { value: "10k", label: "10K" },
  { value: "half", label: "Half Marathon" },
  { value: "marathon", label: "Marathon" },
  { value: "trail", label: "Trail" },
  { value: "ultra", label: "Ultra" },
];

interface Props {
  radius: Radius;
  onRadiusChange: (r: Radius) => void;
  eventType: EventType;
  onEventTypeChange: (t: EventType) => void;
}

export function FilterBar({
  radius,
  onRadiusChange,
  eventType,
  onEventTypeChange,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
        <span className="text-sm text-muted-foreground shrink-0 mr-1">
          Within
        </span>
        {RADII.map((r) => (
          <button
            key={r}
            onClick={() => {
              trackFilter({ page: "home", filter_type: "radius", value: r });
              onRadiusChange(r);
            }}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors",
              radius === r
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-border hover:border-primary/50",
            )}
          >
            {r} mi
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
        {TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => {
              trackFilter({ page: "home", filter_type: "distance", value: t.value });
              onEventTypeChange(t.value);
            }}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors",
              eventType === t.value
                ? "bg-foreground text-background border-foreground"
                : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/40",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
