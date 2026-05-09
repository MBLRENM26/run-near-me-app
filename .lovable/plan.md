## New page: `/list-your-event`

Create `src/routes/list-your-event.tsx` matching site design (Header, Footer, Toaster, max-w container, card styling, semantic tokens).

**Content:**
- `head()` with title "List Your Running Event — Running Events Near Me", description, og:title/description, canonical
- H1: "List your running event"
- Subheading: "Free to list. We'll review your submission and send you a preview within 48 hours."
- Form (shadcn `Textarea`, `Input`, `Label`, `Button`):
  - Event details — `Textarea`, required, placeholder as specified
  - Your email address — `Input type="email"`, required, placeholder as specified
  - Submit button: "Submit your event"
- Validate with zod (event_details min 10 / max 2000, email valid / max 255)
- On submit: insert into `submissions` via browser supabase client, then swap the form for a success card: "Thanks! We'll be in touch within 48 hours with your listing preview."
- Errors → `sonner` toast

## Database: `submissions` table (migration)

```sql
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  event_details text not null,
  email text not null,
  submitted_at timestamptz not null default now(),
  is_reviewed boolean not null default false
);
alter table public.submissions enable row level security;

-- Public form: anonymous users can submit
create policy "Anyone can submit"
  on public.submissions for insert
  to anon, authenticated
  with check (
    char_length(event_details) between 10 and 2000
    and char_length(email) between 3 and 255
    and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  );

-- No public select/update/delete policies — submissions are private to the operator
```

No SELECT policy means anonymous reads return nothing, which is correct (you'll review submissions via the backend).

## Footer update

`src/components/site/Footer.tsx`: replace the external `https://forms.gle/...` anchor with a TanStack `<Link to="/list-your-event">List your event</Link>` (same styling, drop `target="_blank"`).

## Header navigation

`src/components/site/Header.tsx`: add a right-aligned nav with a single `<Link to="/list-your-event">` styled as a subtle button (text-sm, hover:text-primary). Keep the existing logo block on the left; the flex container already has `justify-between`.

## Out of scope

No admin dashboard for viewing submissions in this pass — flagged as a possible follow-up.