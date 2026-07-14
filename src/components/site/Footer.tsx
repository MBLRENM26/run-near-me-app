import { Link } from "@tanstack/react-router";
import { Instagram } from "lucide-react";
import { SOCIALS } from "@/lib/site";

// lucide-react doesn't ship a TikTok glyph — small inline SVG keeps the row consistent.
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M16.5 3a5.5 5.5 0 0 0 5 5V11a8.4 8.4 0 0 1-5-1.6V15.5a5.5 5.5 0 1 1-5.5-5.5c.3 0 .6 0 .9.1V13a2.7 2.7 0 1 0 2 2.6V3h2.6Z" />
    </svg>
  );
}

const socialIcon = (label: string) => {
  if (label === "Instagram") return Instagram;
  return null;
};

export function Footer() {
  return (
    <footer className="border-t border-border mt-16">
      <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col gap-4 sm:flex-row items-center justify-between text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Running Events Near Me</p>

        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          {SOCIALS.length > 0 && (
            <div className="flex items-center gap-3">
              {SOCIALS.map((s) => {
                const Icon = socialIcon(s.label);
                return (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${s.label} — ${s.handle}`}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {Icon ? (
                      <Icon className="h-5 w-5" />
                    ) : s.label === "TikTok" ? (
                      <TikTokIcon className="h-5 w-5" />
                    ) : null}
                  </a>
                );
              })}
            </div>
          )}

          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link to="/for-runners" className="hover:text-foreground transition-colors">
              For runners
            </Link>
            <Link to="/for-clubs" className="hover:text-foreground transition-colors">
              For clubs
            </Link>
            <Link to="/for-organisers" className="hover:text-foreground transition-colors">
              For organisers
            </Link>
            <Link to="/about" className="hover:text-foreground transition-colors">
              About
            </Link>
            <Link to="/running-clubs" className="hover:text-foreground transition-colors">
              Running clubs
            </Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link
              to="/list-your-event"
              className="font-medium text-foreground hover:text-primary transition-colors"
            >
              List your event
            </Link>
          </nav>

        </div>
      </div>
    </footer>
  );
}
