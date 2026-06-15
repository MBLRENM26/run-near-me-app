import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function HeaderSearch() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) return;
    navigate({ to: "/search", search: { q: trimmed } });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="hidden sm:flex items-center gap-2"
      role="search"
    >
      <label htmlFor="header-search" className="sr-only">
        Search events
      </label>
      <div className="relative">
        <Search
          aria-hidden
          className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
        />
        <Input
          id="header-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search events or postcode"
          className="h-9 w-56 pl-8 text-sm"
          autoComplete="off"
        />
      </div>
    </form>
  );
}
