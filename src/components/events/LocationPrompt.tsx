import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MapPin, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { trackLocationSet } from "@/lib/analytics";
import { isUkPostcode } from "@/lib/postcode";


export type Coords = { lat: number; lng: number; label?: string };

interface Props {
  onLocate: (coords: Coords) => void;
}

export function LocationPrompt({ onLocate }: Props) {
  const [postcode, setPostcode] = useState("");
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [loadingPostcode, setLoadingPostcode] = useState(false);
  const navigate = useNavigate();

  const useDeviceLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Your browser doesn't support location access.");
      return;
    }
    setLoadingGeo(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoadingGeo(false);
        trackLocationSet("device");
        onLocate({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: "Your location",
        });
      },
      (err) => {
        setLoadingGeo(false);
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Try a postcode instead."
            : "Couldn't get your location. Try a postcode instead.",
        );
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  };

  const submitPostcode = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = postcode.trim();
    if (!trimmed) return;
    if (!isUkPostcode(trimmed)) {
      navigate({ to: "/search", search: { q: trimmed } });
      return;
    }
    setLoadingPostcode(true);
    try {
      const res = await fetch(
        `https://api.postcodes.io/postcodes/${encodeURIComponent(trimmed)}`,
      );
      const json = await res.json();
      if (!res.ok || !json.result) {
        toast.error("Couldn't find that postcode. Check and try again.");
        return;
      }
      trackLocationSet("postcode");
      onLocate({
        lat: json.result.latitude,
        lng: json.result.longitude,
        label: json.result.postcode,
      });
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoadingPostcode(false);
    }
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Button
        type="button"
        size="lg"
        onClick={useDeviceLocation}
        disabled={loadingGeo}
        className="h-14 text-base font-medium shadow-card"
      >
        {loadingGeo ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <MapPin className="h-5 w-5" />
        )}
        Use my location
      </Button>

      <form onSubmit={submitPostcode} className="flex gap-2">
        <label htmlFor="postcode-input" className="sr-only">
          Postcode or event name
        </label>
        <Input
          id="postcode-input"
          value={postcode}
          onChange={(e) => setPostcode(e.target.value)}
          placeholder="Postcode or event name"
          className="h-14 text-base"
        />
        <Button
          type="submit"
          size="lg"
          variant="secondary"
          disabled={loadingPostcode || !postcode.trim()}
          className="h-14 px-4"
          aria-label="Search"
        >
          {loadingPostcode ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Search className="h-5 w-5" />
          )}
        </Button>
      </form>
    </div>
  );
}
