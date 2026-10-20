import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SITE_URL } from "@/lib/site";
import { track } from "@/lib/analytics";
import { CONTACT_TOPICS, submitContactMessage } from "@/lib/contact.functions";

export const Route = createFileRoute("/contact")({
  head: () => {
    const canonical = `${SITE_URL}/contact`;
    const title = "Contact us — Running Events Near Me";
    const description =
      "Get in touch with Running Events Near Me about a race, a correction, a running club or an event you organise.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: canonical },
        { name: "twitter:card", content: "summary" },
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  component: ContactPage,
});

function ContactPage() {
  const submit = useServerFn(submitContactMessage);
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState("submitting");
    setError(null);
    try {
      await submit({
        data: {
          name: String(fd.get("name") ?? ""),
          email: String(fd.get("email") ?? ""),
          topic: String(fd.get("topic") ?? "other"),
          race_link: String(fd.get("race_link") ?? "") || undefined,
          message: String(fd.get("message") ?? ""),
          website: String(fd.get("website") ?? "") || undefined,
        },
      });
      track("Form: Submission", { form: "contact" });
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sorry, that didn't send.");
      setState("error");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 pt-12 pb-16 sm:pt-16">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Contact us</h1>
          <p className="mt-3 text-muted-foreground">
            Spotted a change, have news about a race, or want to update a listing? Let us know.
          </p>

          {state === "done" ? (
            <div className="mt-8 rounded-lg border border-primary/30 bg-primary/5 p-5">
              <h2 className="font-semibold text-foreground">Thanks — message received.</h2>
              <p className="mt-2 text-sm text-muted-foreground">We'll reply to the email you gave us.</p>
              <Link to="/" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
                Back to races →
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Your name" name="name" required maxLength={200} />
                <Field label="Your email" name="email" type="email" required maxLength={255} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="topic">What's it about?</Label>
                <select
                  id="topic"
                  name="topic"
                  defaultValue="race_info"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {CONTACT_TOPICS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <Field
                label="Which race? (optional)"
                name="race_link"
                maxLength={500}
                placeholder="Race name or link to its page"
              />
              <div className="space-y-1.5">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" name="message" required maxLength={3000} rows={6} />
              </div>
              <div className="hidden" aria-hidden="true">
                <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={state === "submitting"} className="w-full sm:w-auto">
                {state === "submitting" ? "Sending…" : "Send message"}
              </Button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Field({
  label, name, type = "text", required, maxLength, placeholder,
}: { label: string; name: string; type?: string; required?: boolean; maxLength?: number; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required={required} maxLength={maxLength} placeholder={placeholder} />
    </div>
  );
}
