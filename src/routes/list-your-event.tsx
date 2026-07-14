import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { SITE_URL } from "@/lib/site";
import { submitListing } from "@/lib/admin.functions";
import { track } from "@/lib/analytics";

const DISTANCE_OPTIONS = [
  { value: "5k", label: "5K" },
  { value: "10k", label: "10K" },
  { value: "half-marathon", label: "Half marathon" },
  { value: "marathon", label: "Marathon" },
  { value: "ultra", label: "Ultra" },
  { value: "other", label: "Other" },
] as const;

const TERRAIN_OPTIONS = [
  { value: "road", label: "Road" },
  { value: "trail", label: "Trail" },
  { value: "fell", label: "Fell" },
  { value: "multi-terrain", label: "Multi-terrain" },
  { value: "track", label: "Track" },
  { value: "other", label: "Other" },
] as const;

type DistanceValue = (typeof DISTANCE_OPTIONS)[number]["value"];
type TerrainValue = (typeof TERRAIN_OPTIONS)[number]["value"];

const schema = z.object({
  race_name: z.string().trim().min(2, "Race name is required.").max(300),
  race_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please pick a date."),
  website_url: z
    .string()
    .trim()
    .url("Please enter a full URL, including https://")
    .max(1000),
  email: z.string().trim().email("Please enter a valid email.").max(255),
});

const searchSchema = z.object({
  claim: z.string().trim().min(1).max(255).optional(),
});

export const Route = createFileRoute("/list-your-event")({
  validateSearch: searchSchema,
  head: () => {
    const canonical = `${SITE_URL}/list-your-event`;
    return {
      meta: [
        { title: "List Your Running Event — Running Events Near Me" },
        {
          name: "description",
          content:
            "Submit your running event for free. We review every listing and send a preview within 48 hours.",
        },
        { property: "og:title", content: "List Your Running Event" },
        {
          property: "og:description",
          content:
            "Free to list. Submit your race and we'll send you a preview within 48 hours.",
        },
        { property: "og:type", content: "website" },
        { property: "og:url", content: canonical },
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  component: ListYourEventPage,
});

function ListYourEventPage() {
  const { claim } = Route.useSearch();
  const submit = useServerFn(submitListing);

  const [raceName, setRaceName] = useState("");
  const [raceDate, setRaceDate] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [email, setEmail] = useState("");
  const [distances, setDistances] = useState<DistanceValue[]>([]);
  const [town, setTown] = useState("");
  const [county, setCounty] = useState("");
  const [postcode, setPostcode] = useState("");
  const [organiser, setOrganiser] = useState("");
  const [terrain, setTerrain] = useState<TerrainValue | "">("");
  const [entryFee, setEntryFee] = useState("");
  const [notes, setNotes] = useState(
    claim ? `Claiming listing: ${claim}` : "",
  );

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (claim && notes === "") setNotes(`Claiming listing: ${claim}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claim]);

  const toggleDistance = (d: DistanceValue, checked: boolean) => {
    setDistances((prev) =>
      checked ? Array.from(new Set([...prev, d])) : prev.filter((x) => x !== d),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = websiteUrl.trim();
    const normalisedUrl =
      trimmedUrl && !/^https?:\/\//i.test(trimmedUrl)
        ? `https://${trimmedUrl}`
        : trimmedUrl;
    if (normalisedUrl !== websiteUrl) setWebsiteUrl(normalisedUrl);
    const parsed = schema.safeParse({
      race_name: raceName,
      race_date: raceDate,
      website_url: normalisedUrl,
      email,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }
    setSubmitting(true);
    try {
      await submit({
        data: {
          race_name: parsed.data.race_name,
          race_date: parsed.data.race_date,
          website_url: parsed.data.website_url,
          email: parsed.data.email,
          distances,
          town: town.trim() || undefined,
          county: county.trim() || undefined,
          postcode: postcode.trim() || undefined,
          organiser: organiser.trim() || undefined,
          terrain: terrain || undefined,
          submitted_entry_fee: entryFee.trim() || undefined,
          notes: notes.trim() || undefined,
          claim_slug: claim ?? null,
        },
      });
      track("Form: Submission", { form: "list-your-event" });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="mx-auto max-w-2xl px-4 pt-12 pb-16 sm:pt-16">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            List your running event
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Free to list. We'll review your submission and send you a preview
            within 48 hours.
          </p>

          <div className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-card">
            {submitted ? (
              <div className="text-center py-8">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <p className="mt-4 text-lg font-medium text-foreground">
                  Received. We'll send you a preview of your listing within 48
                  hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="race_name">
                    Race name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="race_name"
                    required
                    maxLength={300}
                    placeholder="e.g. Dorset Coastal Half Marathon"
                    value={raceName}
                    onChange={(e) => setRaceName(e.target.value)}
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="race_date">
                      Race date <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="race_date"
                      type="date"
                      required
                      value={raceDate}
                      onChange={(e) => setRaceDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Your email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      maxLength={255}
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website_url">
                    Website / entry URL{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="website_url"
                    type="url"
                    required
                    maxLength={1000}
                    placeholder="https://…"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Distances</Label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {DISTANCE_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm cursor-pointer hover:bg-muted/40"
                      >
                        <Checkbox
                          checked={distances.includes(opt.value)}
                          onCheckedChange={(v) =>
                            toggleDistance(opt.value, Boolean(v))
                          }
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="terrain">Terrain</Label>
                    <Select
                      value={terrain}
                      onValueChange={(v) => setTerrain(v as TerrainValue)}
                    >
                      <SelectTrigger id="terrain">
                        <SelectValue placeholder="Choose…" />
                      </SelectTrigger>
                      <SelectContent>
                        {TERRAIN_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="entry_fee">Entry fee</Label>
                    <Input
                      id="entry_fee"
                      maxLength={200}
                      placeholder="e.g. £25 / free"
                      value={entryFee}
                      onChange={(e) => setEntryFee(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="town">Town</Label>
                    <Input
                      id="town"
                      maxLength={200}
                      value={town}
                      onChange={(e) => setTown(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="county">County</Label>
                    <Input
                      id="county"
                      maxLength={200}
                      value={county}
                      onChange={(e) => setCounty(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postcode">Postcode</Label>
                    <Input
                      id="postcode"
                      maxLength={20}
                      placeholder="Nearest is fine"
                      value={postcode}
                      onChange={(e) => setPostcode(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organiser">Organiser / club</Label>
                  <Input
                    id="organiser"
                    maxLength={300}
                    placeholder="e.g. Dorset Runners"
                    value={organiser}
                    onChange={(e) => setOrganiser(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Anything else?</Label>
                  <Textarea
                    id="notes"
                    rows={4}
                    maxLength={2000}
                    placeholder="Course notes, prize categories, charity partner, etc."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitting}
                >
                  {submitting ? "Submitting…" : "Submit event"}
                </Button>
              </form>
            )}
          </div>
        </section>
      </main>
      <Footer />
      <Toaster position="top-center" />
    </div>
  );
}
