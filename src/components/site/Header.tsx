import { Link } from "@tanstack/react-router";
import { Footprints } from "lucide-react";

export function Header() {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Footprints className="h-5 w-5" />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-foreground tracking-tight">
              Running Events Near Me
            </span>
            <span className="text-xs text-muted-foreground hidden sm:block">
              Find your next race.
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
}
