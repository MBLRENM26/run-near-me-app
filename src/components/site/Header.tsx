import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, Footprints } from "lucide-react";
import { HeaderSearch } from "./HeaderSearch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // The homepage owns its own search affordance (the hero LocationPrompt).
  // Show the compact header search on every other route.
  const showSearch = pathname !== "/";

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-4">
        <Link to="/" search={{}} resetScroll className="flex items-center gap-2.5 group">
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
        <nav className="flex items-center gap-3">
          {showSearch && <HeaderSearch />}
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors px-3 py-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Why us
              <ChevronDown className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link to="/for-runners">For runners</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/for-clubs">For clubs</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/for-organisers">For organisers</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link
            to="/list-your-event"
            className="text-sm font-medium text-foreground hover:text-primary transition-colors px-3 py-2 rounded-md"
            activeProps={{ className: "text-primary" }}
          >
            List your event
          </Link>
        </nav>

      </div>
    </header>
  );
}
