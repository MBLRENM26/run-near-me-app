import { useState } from "react";
import { Bell, CheckCircle2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { subscribeToRaceReminder } from "@/lib/subscriptions.functions";
import { track } from "@/lib/analytics";

interface Props {
  eventId: string;
  eventName: string;
  /** ISO date or null — hides the form for races already in the past. */
  sortDate: string | null;
}

/**
 * Save-a-race signup. One field, no account.
 * Idempotent on the backend — re-submitting the same email is treated as success.
 */
export function RaceReminderSignup({ eventId, eventName, sortDate }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const isPast = sortDate !== null && sortDate < today;
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscribe = useServerFn(subscribeToRaceReminder);

  if (isPast) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Please enter your email.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await subscribe({ data: { email: trimmed, eventId } });
      track("Form: Submission", { form: "race-reminder" });
      setDone(true);
      if (res.alreadySubscribed) {
        // Soft message: keep the success state but tell the user we already had them.
        setError(null);
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-card">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Bell className="h-4.5 w-4.5 text-primary" aria-hidden />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground">
            Get a reminder before entries close
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            We'll email you about a week before {eventName}. No account, one
            email — unsubscribe any time.
          </p>

          {done ? (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-primary/5 px-3 py-2.5">
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                aria-hidden
              />
              <p className="text-sm text-foreground">
                Your reminder is confirmed. Check your inbox for confirmation.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 space-y-2">
              <Label htmlFor="race-reminder-email" className="sr-only">
                Your email
              </Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="race-reminder-email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  maxLength={255}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  className="flex-1"
                />
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Signing up…" : "Remind me"}
                </Button>
              </div>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
