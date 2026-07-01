import { Link, type LinkProps } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/**
 * Chip is a single pill — either a link or a non-interactive placeholder.
 * The two variants use the same base styling as DistanceNav so the
 * homepage / county / city strips look visually consistent.
 */
type ChipBase = {
  key: string;
  label: string;
  count?: number;
};

type LinkChip = ChipBase & {
  kind: "link";
  /** Direct `Link` props passthrough — keeps type-safe routing. */
  linkProps: LinkProps;
  active?: boolean;
};

type DisabledChip = ChipBase & {
  kind: "disabled";
  /** Rendered as a `<span>` with aria-disabled — no href, no crawl target. */
  title?: string;
};

export type Chip = LinkChip | DisabledChip;

function chipClass({ active = false, disabled = false }: { active?: boolean; disabled?: boolean }) {
  return cn(
    "inline-flex items-center gap-1 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
    active
      ? "border-primary bg-primary text-primary-foreground"
      : disabled
        ? "border-border bg-muted text-muted-foreground cursor-not-allowed opacity-70"
        : "border-border bg-card text-foreground hover:border-primary hover:text-primary",
  );
}

function ChipLabel({
  label,
  count,
  active,
  disabled,
}: {
  label: string;
  count?: number;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <>
      {label}
      {typeof count === "number" && count > 0 && (
        <span
          className={cn(
            "text-xs",
            active
              ? "text-primary-foreground/80"
              : disabled
                ? "text-muted-foreground"
                : "text-muted-foreground",
          )}
        >
          ({count.toLocaleString()})
        </span>
      )}
    </>
  );
}

export function ChipLinkRow({
  ariaLabel,
  chips,
  className,
}: {
  ariaLabel: string;
  chips: Chip[];
  className?: string;
}) {
  if (chips.length === 0) return null;
  return (
    <nav aria-label={ariaLabel} className={cn("flex flex-wrap gap-2", className)}>
      {chips.map((chip) => {
        if (chip.kind === "disabled") {
          return (
            <span
              key={chip.key}
              className={chipClass({ disabled: true })}
              aria-disabled="true"
              title={chip.title ?? "Coming soon"}
            >
              <ChipLabel label={chip.label} count={chip.count} disabled />
            </span>
          );
        }
        const active = chip.active === true;
        return (
          <Link
            key={chip.key}
            {...(chip.linkProps as LinkProps)}
            className={chipClass({ active })}
            aria-current={active ? "page" : undefined}
          >
            <ChipLabel label={chip.label} count={chip.count} active={active} />
          </Link>
        );
      })}
    </nav>
  );
}
