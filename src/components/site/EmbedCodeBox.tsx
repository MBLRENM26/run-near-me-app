import { useState } from "react";
import { Button } from "@/components/ui/button";
import { embedSnippet, type EmbedKind, type EmbedTheme } from "@/lib/embed";
import { track } from "@/lib/analytics";

export function EmbedCodeBox({ kind, slug, label }: { kind: EmbedKind; slug: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<EmbedTheme>("light");
  const [copied, setCopied] = useState(false);
  const code = embedSnippet(kind, slug, theme);
  return (
    <aside className="mt-6 rounded-xl border border-border bg-muted/30 p-5">
      <h2 className="font-semibold text-foreground">Show these races on your website</h2>
      <p className="mt-1 text-sm text-muted-foreground">A free, always up-to-date list of {label}. Paste one line of code.</p>
      {!open ? (
        <Button variant="outline" className="mt-3" onClick={() => setOpen(true)}>Get the code</Button>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="flex gap-2">
            {(["light", "dark"] as const).map((t) => (
              <Button key={t} size="sm" variant={theme === t ? "default" : "outline"} onClick={() => setTheme(t)}>{t === "light" ? "Light" : "Dark"}</Button>
            ))}
          </div>
          <textarea readOnly value={code} rows={3} className="w-full rounded-md border border-input bg-background p-2 font-mono text-xs text-foreground" onFocus={(e) => e.currentTarget.select()} />
          <Button size="sm" onClick={async () => {
            try { await navigator.clipboard.writeText(code); setCopied(true); } catch { /* user can copy manually */ }
            track("Embed Code Copied", { kind, slug, theme });
          }}>{copied ? "Copied" : "Copy code"}</Button>
        </div>
      )}
    </aside>
  );
}
