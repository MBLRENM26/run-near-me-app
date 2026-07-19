import { useState } from "react";
import { createFileRoute, Link, useParams, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getEventBySlug } from "@/lib/events.functions";
import { submitEventChangeReport } from "@/lib/report-change.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/events_/$slug/report")({
  loader: async ({ params }) => {
    const event = await getEventBySlug({ data: { slug: params.slug } });
    if (!event) throw new Error("Event not found");
    return { event };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.event
          ? `Report a change — ${loaderData.event.name}`
          : "Report a change",
      },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content:
          "Spotted an error with this race listing? Let us know so we can update it.",
      },
    ],
  }),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold">Event not found</h1>
    </div>
  ),
  component: ReportChangePage,
});

const CHANGE_TYPES = [
  { value: "date", label: "Date has changed / postponed" },
  { value: "cancelled", label: "Event is cancelled" },
  { value: "link", label: "Broken or wrong link" },
  { value: "details", label: "Wrong details (distances, venue, etc.)" },
  { value: "other", label: "Something else" },
] as const;

const RELATIONSHIPS = [
  { value: "organiser", label: "I organise this event" },
  { value: "club", label: "I'm from the host club" },
  { value: "runner", label: "I'm a runner / spectator" },
  { value: "other", label: "Other" },
] as const;

function ReportChangePage() {
  const { event } = Route.useLoaderData();
  const { slug } = useParams({ from: "/events/$slug/report" });
  const router = useRouter();
  const submit = useServerFn(submitEventChangeReport);

  const [changeType, setChangeType] = useState<string>("date");
  const [details, setDetails] = useState("");
  const [proposedDate, setProposedDate] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [relationship, setRelationship] = useState<string>("runner");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<null | "sent" | "duplicate">(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await submit({
        data: {
          event_id: event.id,
          change_type: changeType as any,
          details,
          proposed_new_date: changeType === "date" ? proposedDate : undefined,
          proof_url: proofUrl || undefined,
          reporter_name: reporterName || undefined,
          reporter_relationship: relationship as any,
          email,
        },
      });
      if (!res.ok) {
        if (res.reason === "rate_limited") {
          toast.error(
            "Too many submissions from this network — please try again shortly.",
          );
        } else {
          toast.error("Sorry, something went wrong. Please try again shortly.");
        }
        return;
      }
      setDone(res.alreadyReported ? "duplicate" : "sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit report");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-3xl font-bold text-foreground">Thanks — got it.</h1>
        <p className="mt-3 text-muted-foreground">
          {done === "duplicate"
            ? "You've already reported a change for this event. We're on it."
            : "We'll review your report and update the listing shortly. No account or follow-up needed on your side."}
        </p>
        <div className="mt-6 flex gap-3">
          <Button asChild>
            <Link to="/events/$slug" params={{ slug }}>
              Back to event
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Browse other events</Link>
          </Button>
        </div>
        <Toaster position="top-center" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <div className="mb-6">
        <Link
          to="/events/$slug"
          params={{ slug }}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to {event.name}
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-foreground">Report a change</h1>
      <p className="mt-2 text-muted-foreground">
        Spotted an error with this listing? Let us know and we'll update it.
        Reports go straight to the admin queue — usually reviewed within 24 hours.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Reporting on:</span>{" "}
          <span className="font-medium text-foreground">{event.name}</span>
        </div>

        <div>
          <Label htmlFor="change_type">What's changed?</Label>
          <Select value={changeType} onValueChange={setChangeType}>
            <SelectTrigger id="change_type" className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHANGE_TYPES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {changeType === "date" && (
          <div>
            <Label htmlFor="proposed_new_date">
              New date (if known)
            </Label>
            <Input
              id="proposed_new_date"
              type="date"
              value={proposedDate}
              onChange={(e) => setProposedDate(e.target.value)}
              className="mt-1.5"
            />
          </div>
        )}

        <div>
          <Label htmlFor="details">Details</Label>
          <Textarea
            id="details"
            required
            minLength={3}
            maxLength={1000}
            rows={4}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Briefly describe what needs to change and how you know."
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="proof_url">Link to proof (optional)</Label>
          <Input
            id="proof_url"
            type="url"
            value={proofUrl}
            onChange={(e) => setProofUrl(e.target.value)}
            placeholder="https://organiser-website.com/announcement"
            className="mt-1.5"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            An organiser tweet, Facebook post, or news article helps us verify faster.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="reporter_name">Your name (optional)</Label>
            <Input
              id="reporter_name"
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              className="mt-1.5"
              maxLength={200}
            />
          </div>
          <div>
            <Label htmlFor="relationship">You are</Label>
            <Select value={relationship} onValueChange={setRelationship}>
              <SelectTrigger id="relationship" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIPS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="email">Your email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5"
            placeholder="you@example.com"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Used only if we need to verify — we won't add you to any list.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Sending…" : "Send report"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.history.back()}
            disabled={submitting}
          >
            Cancel
          </Button>
        </div>
      </form>

      <Toaster position="top-center" />
    </div>
  );
}
