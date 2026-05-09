Copy-only change in `src/routes/list-your-event.tsx`:

- Event details `Textarea`: keep label "Event details"; change placeholder to "Race name, date and registration URL"; add a `<p className="text-sm text-muted-foreground">` helper below the textarea: "Include as much or as little as you have — we'll do the rest."
- Email `Input`: change label to "Your email"; change placeholder to "your@email.com".
- Submit button text → "Submit event" (loading state stays "Submitting…").
- Success message → "Received. We'll send you a preview of your listing within 48 hours."

No schema, validation, or backend changes.