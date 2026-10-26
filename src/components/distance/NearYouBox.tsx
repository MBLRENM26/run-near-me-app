import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { geocodeOutward, geocodePostcode, isUkOutwardCode, isUkPostcode } from "@/lib/postcode";
import { EXPLORER_DISTANCE_VALUES, type ExplorerDistance } from "@/lib/explorer";
import { trackLocationSet } from "@/lib/analytics";

/** "Find races near you" postcode box for distance landing pages. Hands off to the Explorer. */
export function NearYouBox({ distanceKey, label }: { distanceKey: string; label: string }) {
  const [postcode, setPostcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const distance: ExplorerDistance = (EXPLORER_DISTANCE_VALUES as readonly string[]).includes(distanceKey)
    ? (distanceKey as ExplorerDistance)
    : "all";

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const q = postcode.trim();
    setError(null);
    if (!isUkPostcode(q) && !isUkOutwardCode(q)) {
      setError("Enter a UK postcode, like LS1 4AP or M1.");
      return;
    }
    setLoading(true);
    const loc = isUkPostcode(q) ? await geocodePostcode(q) : await geocodeOutward(q);
    setLoading(false);
    if (!loc) {
      setError("We couldn't find that postcode. Check it and try again.");
      return;
    }
    trackLocationSet("postcode");
    navigate({
      to: "/explore",
      search: { q: "", lat: loc.lat, lng: loc.lng, label: loc.postcode, radius: 25, distance } as never,
    });
  };

  return (
    <form onSubmit={onSubmit} className="mt-5 max-w-md rounded-lg border border-border bg-card p-4">
      <label htmlFor="near-you-postcode" className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <MapPin className="h-4 w-4 text-primary" />
        Find {label} near you
      </label>
      <div className="mt-2 flex gap-2">
        <Input
          id="near-you-postcode"
          value={postcode}
          onChange={(e) => setPostcode(e.target.value)}
          placeholder="Your postcode"
          autoComplete="postal-code"
        />
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </form>
  );
}
