import { cn } from "@/lib/utils";
import {
  formatMonthLabel,
  type MonthKey,
} from "@/lib/month-filter";
import { trackFilter } from "@/lib/analytics";


interface Props {
  months: MonthKey[];
  value: MonthKey | undefined;
  onChange: (m: MonthKey | undefined) => void;
  label?: string;
}

export function MonthFilter({ months, value, onChange, label = "Month" }: Props) {
  if (months.length < 2) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
      <span className="text-sm text-muted-foreground shrink-0 mr-1">
        {label}
      </span>
      <button
        type="button"
        onClick={() => onChange(undefined)}
        className={cn(
          "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors",
          value === undefined
            ? "bg-foreground text-background border-foreground"
            : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/40",
        )}
      >
        All
      </button>
      {months.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => {
            const next = m === value ? undefined : m;
            if (next) trackFilter({ page: "landing", filter_type: "month", value: next });
            onChange(next);
          }}
          className={cn(
            "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors",
            value === m
              ? "bg-foreground text-background border-foreground"
              : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/40",
          )}
        >
          {formatMonthLabel(m)}
        </button>
      ))}
    </div>
  );
}
