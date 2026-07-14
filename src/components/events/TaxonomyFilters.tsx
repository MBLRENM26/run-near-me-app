import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  governanceLabel,
  raceProfileLabel,
} from "@/lib/event-taxonomy";
import { trackFilter } from "@/lib/analytics";

/**
 * Expandable "More filters" panel driven by whichever taxonomy values are
 * actually present in the current result set (no dead chips). Chip counts
 * reflect the current dataset so users can see, e.g. "12 UKA-permitted" at
 * a glance.
 *
 * Filtering is client-side over the already-loaded rows. Selection state
 * lives in the parent (usually a route search param) so it survives
 * refresh and is shareable.
 */
export interface TaxonomyRow {
  governance: string | null;
  race_profile: string | null;
}

interface Props<Row extends TaxonomyRow> {
  page: string;
  rows: readonly Row[];
  governance: string | null;
  raceProfile: string | null;
  onGovernanceChange: (v: string | null) => void;
  onRaceProfileChange: (v: string | null) => void;
}

function countBy<Row extends TaxonomyRow>(
  rows: readonly Row[],
  key: "governance" | "race_profile",
): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const v = r[key];
    if (!v) continue;
    m.set(v, (m.get(v) ?? 0) + 1);
  }
  return m;
}

export function TaxonomyFilters<Row extends TaxonomyRow>({
  page,
  rows,
  governance,
  raceProfile,
  onGovernanceChange,
  onRaceProfileChange,
}: Props<Row>) {
  const [open, setOpen] = useState<boolean>(
    governance !== null || raceProfile !== null,
  );

  const govCounts = useMemo(() => countBy(rows, "governance"), [rows]);
  const profCounts = useMemo(() => countBy(rows, "race_profile"), [rows]);

  const govEntries = useMemo(
    () =>
      Array.from(govCounts.entries())
        .map(([v, n]) => ({ value: v, label: governanceLabel(v), count: n }))
        .filter((e) => e.label !== null)
        .sort((a, b) => b.count - a.count),
    [govCounts],
  );
  const profEntries = useMemo(
    () =>
      Array.from(profCounts.entries())
        .map(([v, n]) => ({ value: v, label: raceProfileLabel(v), count: n }))
        .filter((e) => e.label !== null)
        .sort((a, b) => b.count - a.count),
    [profCounts],
  );

  if (govEntries.length === 0 && profEntries.length === 0) return null;

  const activeCount = (governance ? 1 : 0) + (raceProfile ? 1 : 0);

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        aria-expanded={open}
      >
        More filters
        {activeCount > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
            {activeCount}
          </span>
        )}
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="mt-3 space-y-3 rounded-lg border border-border bg-card/50 p-3">
          {govEntries.length > 0 && (
            <Row
              label="Governance"
              entries={govEntries}
              selected={governance}
              onChange={(v) => {
                trackFilter({ page, filter_type: "governance", value: v ?? "any" });
                onGovernanceChange(v);
              }}
            />
          )}
          {profEntries.length > 0 && (
            <Row
              label="Race profile"
              entries={profEntries}
              selected={raceProfile}
              onChange={(v) => {
                trackFilter({ page, filter_type: "race_profile", value: v ?? "any" });
                onRaceProfileChange(v);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  entries,
  selected,
  onChange,
}: {
  label: string;
  entries: { value: string; label: string | null; count: number }[];
  selected: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip active={selected === null} onClick={() => onChange(null)}>
          Any
        </Chip>
        {entries.map((e) => (
          <Chip
            key={e.value}
            active={selected === e.value}
            onClick={() => onChange(selected === e.value ? null : e.value)}
          >
            {e.label}
            <span
              className={cn(
                "ml-1 text-xs",
                selected === e.value
                  ? "text-primary-foreground/80"
                  : "text-muted-foreground",
              )}
            >
              ({e.count})
            </span>
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:border-primary/50",
      )}
    >
      {children}
    </button>
  );
}
