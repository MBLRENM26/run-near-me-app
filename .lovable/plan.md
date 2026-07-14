Small UX tweak to the website URL field on `/list-your-event` so the user doesn't have to type `https://`.

## Change
In `src/routes/list-your-event.tsx`:
- Keep the input as `type="url"` (validation stays).
- Show `https://` as a visual prefix so it's clear the scheme is required, and auto-prepend it on submit if the user typed a bare domain.

## Implementation
- Wrap the Website URL input in a relative container with a non-interactive `https://` prefix (muted text, `pl-16` on the input).
- Change the placeholder from `https://…` to `yourrace.com/entry`.
- In `handleSubmit`, before Zod parses: if `websiteUrl` is non-empty and does NOT start with `http://` or `https://`, prepend `https://`. If it starts with `http://`, leave it alone. Trim whitespace.
- Pass the normalised value into the Zod schema and the `submit()` call so the stored `website_url` is always a valid absolute URL.

No schema, server function, or admin changes — purely a form-side UX improvement.