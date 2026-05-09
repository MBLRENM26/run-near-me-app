create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  event_details text not null,
  email text not null,
  submitted_at timestamptz not null default now(),
  is_reviewed boolean not null default false
);
alter table public.submissions enable row level security;
create policy "Anyone can submit"
  on public.submissions for insert
  to anon, authenticated
  with check (
    char_length(event_details) between 10 and 2000
    and char_length(email) between 3 and 255
    and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  );