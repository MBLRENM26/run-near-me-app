import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="border-t border-border mt-16">
      <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Running Events Near Me</p>
        <nav className="flex items-center gap-5">
          <Link
            to="/about"
            className="hover:text-foreground transition-colors"
          >
            About
          </Link>
          <Link
            to="/privacy"
            className="hover:text-foreground transition-colors"
          >
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
    </footer>
  );
}
