import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { SITE_URL } from "@/lib/site";

const submissionSchema = z.object({
  event_details: z
    .string()
    .trim()
    .min(10, "Please include race name, date and a website URL.")
    .max(2000, "Please keep details under 2000 characters."),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address.")
    .max(255),
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
  const [eventDetails, setEventDetails] = useState(
    claim ? `Claiming listing: ${claim}\n\n` : "",
  );
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (claim && eventDetails === "") {
      setEventDetails(`Claiming listing: ${claim}\n\n`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claim]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = submissionSchema.safeParse({
      event_details: eventDetails,
      email,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("submissions").insert({
      event_details: parsed.data.event_details,
      email: parsed.data.email,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Something went wrong. Please try again.");
      return;
    }
    setSubmitted(true);
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
                  <Label htmlFor="event_details">Event details</Label>
                  <Textarea
                    id="event_details"
                    required
                    rows={6}
                    maxLength={2000}
                    placeholder="Race name, date and registration URL"
                    value={eventDetails}
                    onChange={(e) => setEventDetails(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Include as much or as little as you have — we'll do the rest.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Your email</Label>
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
