import { useState } from "react";
import { Button } from "@/components/ui/button";
import { withShareUtm } from "@/lib/embed";
import { track } from "@/lib/analytics";

export function ShareRace({ url, name, slug }: { url: string; name: string; slug: string }) {
  const [copied, setCopied] = useState(false);
  const wa = `https://wa.me/?text=${encodeURIComponent(`${name} ${withShareUtm(url, "whatsapp")}`)}`;
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(withShareUtm(url, "facebook"))}`;
  return (
    <div className="mt-8 flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-foreground">Share this race</span>
      <Button asChild size="sm" variant="outline"><a href={wa} target="_blank" rel="noopener noreferrer" onClick={() => track("Share Click", { platform: "whatsapp", slug })}>WhatsApp</a></Button>
      <Button asChild size="sm" variant="outline"><a href={fb} target="_blank" rel="noopener noreferrer" onClick={() => track("Share Click", { platform: "facebook", slug })}>Facebook</a></Button>
      <Button size="sm" variant="outline" onClick={async () => {
        try { await navigator.clipboard.writeText(withShareUtm(url, "copy")); setCopied(true); } catch { /* ignore */ }
        track("Share Click", { platform: "copy", slug });
      }}>{copied ? "Link copied" : "Copy link"}</Button>
    </div>
  );
}
