export function Footer() {
  return (
    <footer className="border-t border-border mt-16">
      <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Running Events Near Me</p>
        <a
          href="#"
          className="font-medium text-foreground hover:text-primary transition-colors"
        >
          List your event
        </a>
      </div>
    </footer>
  );
}
