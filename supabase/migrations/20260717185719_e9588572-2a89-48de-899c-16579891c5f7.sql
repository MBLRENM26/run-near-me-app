
-- pgcrypto is already installed in schema `extensions` (verified). Do not attempt to relocate it.
-- extensions.digest(...) is referenced explicitly throughout.

-- ---------------------------------------------------------------------------
-- Shared updated_at trigger fn (idempotent; matches existing project pattern)
-- ---------------------------------------------------------------------------
create or replace function public.orl_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. organisations
-- ---------------------------------------------------------------------------
create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  website_domain text,
  status text not null default 'candidate'
    check (status in ('candidate','approved','merged')),
  merged_into_id uuid references public.organisations(id) on delete set null,
  seed_source_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.organisations.seed_source_key is
  'Import idempotency key. Set only by the CSV seed script for deterministic re-runs. NOT a canonical identity key, matching signal, or platform identifier. Manually created organisations leave this NULL.';

grant all on public.organisations to service_role;
alter table public.organisations enable row level security;
-- No policies: no anon/authenticated access. All reads/writes via service_role in admin-gated server fns.

create trigger organisations_touch_updated_at
before update on public.organisations
for each row execute function public.orl_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 4. identity_evidence (created before tables that reference it)
-- ---------------------------------------------------------------------------
create table public.identity_evidence (
  id uuid primary key default gen_random_uuid(),
  source_url text not null,
  captured_at timestamptz not null default now(),
  evidence_type text not null
    check (evidence_type in ('page_content','manual_observation','platform_metadata','other')),
  supporting_fact text,
  created_by uuid references auth.users(id) on delete set null,
  fingerprint text unique generated always as (
    encode(
      extensions.digest(
        source_url || '|' || evidence_type || '|' || coalesce(supporting_fact,''),
        'sha256'
      ),
      'hex'
    )
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant all on public.identity_evidence to service_role;
alter table public.identity_evidence enable row level security;

create trigger identity_evidence_touch_updated_at
before update on public.identity_evidence
for each row execute function public.orl_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 2. organisation_aliases
-- ---------------------------------------------------------------------------
create table public.organisation_aliases (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  alias_name text not null,
  alias_type text not null
    check (alias_type in ('trading_name','brand','legal_name','abbreviation','historic','other')),
  evidence_id uuid references public.identity_evidence(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index organisation_aliases_unique
  on public.organisation_aliases (organisation_id, lower(alias_name), alias_type);

grant all on public.organisation_aliases to service_role;
alter table public.organisation_aliases enable row level security;

create trigger organisation_aliases_touch_updated_at
before update on public.organisation_aliases
for each row execute function public.orl_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 3. organisation_platform_accounts
-- ---------------------------------------------------------------------------
create table public.organisation_platform_accounts (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  platform text not null,                       -- free-text starter, e.g. 'eventrac'
  account_url text,
  tenant_slug text,
  platform_identifier text,
  confidence text not null default 'medium'
    check (confidence in ('low','medium','high')),
  evidence_id uuid references public.identity_evidence(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index organisation_platform_accounts_platform_tenant
  on public.organisation_platform_accounts (platform, tenant_slug);

grant all on public.organisation_platform_accounts to service_role;
alter table public.organisation_platform_accounts enable row level security;

create trigger organisation_platform_accounts_touch_updated_at
before update on public.organisation_platform_accounts
for each row execute function public.orl_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 5. organisation_event_links
-- ---------------------------------------------------------------------------
create table public.organisation_event_links (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  relationship text not null
    check (relationship in ('organiser','host_club','venue','white_label_of','sponsor','other')),
  confidence text not null default 'medium'
    check (confidence in ('low','medium','high')),
  review_status text not null default 'proposed'
    check (review_status in ('proposed','accepted','rejected','reopened')),
  created_at timestamptz not null default now()
);
create unique index organisation_event_links_unique
  on public.organisation_event_links (event_id, organisation_id, relationship);
create index organisation_event_links_status
  on public.organisation_event_links (review_status);

grant all on public.organisation_event_links to service_role;
alter table public.organisation_event_links enable row level security;

-- ---------------------------------------------------------------------------
-- 6. organisation_event_link_reviews (append-only audit)
-- ---------------------------------------------------------------------------
create table public.organisation_event_link_reviews (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.organisation_event_links(id) on delete cascade,
  action text not null
    check (action in ('proposed','accepted','rejected','reopened')),
  note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewer_identity text not null,      -- non-null provenance (cookie-admin has no auth.uid())
  created_at timestamptz not null default now()
);
comment on column public.organisation_event_link_reviews.reviewer_identity is
  'Non-null provenance string set server-side for every review. Examples: "admin:cookie-session", "seed:<seed_run_id>". Never null; admin history must never show an unidentified decision.';
create index organisation_event_link_reviews_link_created
  on public.organisation_event_link_reviews (link_id, created_at desc);

grant all on public.organisation_event_link_reviews to service_role;
alter table public.organisation_event_link_reviews enable row level security;

-- Append-only enforcement at the DB layer, belt-and-braces above policies:
create or replace function public.organisation_event_link_reviews_immutable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'organisation_event_link_reviews is append-only'
    using errcode = '42501';
  return null;
end;
$$;
create trigger organisation_event_link_reviews_no_update
before update on public.organisation_event_link_reviews
for each row execute function public.organisation_event_link_reviews_immutable();
create trigger organisation_event_link_reviews_no_delete
before delete on public.organisation_event_link_reviews
for each row execute function public.organisation_event_link_reviews_immutable();

-- ---------------------------------------------------------------------------
-- 7. organisation_event_link_evidence (composite PK, no synthetic id)
-- ---------------------------------------------------------------------------
create table public.organisation_event_link_evidence (
  link_id uuid not null references public.organisation_event_links(id) on delete cascade,
  evidence_id uuid not null references public.identity_evidence(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (link_id, evidence_id)
);

grant all on public.organisation_event_link_evidence to service_role;
alter table public.organisation_event_link_evidence enable row level security;

-- ---------------------------------------------------------------------------
-- 8. organisation_seed_unresolved
-- ---------------------------------------------------------------------------
create table public.organisation_seed_unresolved (
  id uuid primary key default gen_random_uuid(),
  seed_run_id uuid not null,
  csv_sha256 text not null,             -- SHA-256 of the exact CSV validated in Phase 1
  csv_row_number int not null,
  raw_row jsonb not null,
  reason text not null
    check (reason in ('slug_not_found','slug_ambiguous','missing_slug','evidence_missing','organisation_conflict','other')),
  candidate_event_ids uuid[] not null default '{}',
  attempted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
comment on column public.organisation_seed_unresolved.csv_sha256 is
  'SHA-256 hex digest of the exact CSV validated for this seed_run_id. Phase 2 apply must recompute this hash and refuse to run if it differs.';
create index organisation_seed_unresolved_run
  on public.organisation_seed_unresolved (seed_run_id);

grant all on public.organisation_seed_unresolved to service_role;
alter table public.organisation_seed_unresolved enable row level security;

-- ---------------------------------------------------------------------------
-- Atomic review RPC (SECURITY INVOKER; service_role only)
-- ---------------------------------------------------------------------------
create or replace function public.review_organisation_event_link_txn(
  _link_id uuid,
  _action text,
  _note text,
  _reviewed_by uuid,
  _reviewer_identity text
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  _current text;
  _review_id uuid;
begin
  if _action not in ('accepted','rejected','reopened') then
    raise exception 'invalid_action: %', _action using errcode = '22023';
  end if;
  if _reviewer_identity is null or length(btrim(_reviewer_identity)) = 0 then
    raise exception 'reviewer_identity_required' using errcode = '22023';
  end if;

  select review_status into _current
  from public.organisation_event_links
  where id = _link_id
  for update;

  if not found then
    raise exception 'link_not_found: %', _link_id using errcode = 'P0002';
  end if;

  -- State machine: proposed → accepted|rejected; accepted → reopened;
  -- rejected → reopened; reopened → accepted|rejected. Anything else rejected.
  if not (
       (_current = 'proposed' and _action in ('accepted','rejected'))
    or (_current = 'accepted' and _action = 'reopened')
    or (_current = 'rejected' and _action = 'reopened')
    or (_current = 'reopened' and _action in ('accepted','rejected'))
  ) then
    raise exception 'invalid_transition: % → %', _current, _action using errcode = '22023';
  end if;

  update public.organisation_event_links
     set review_status = _action
   where id = _link_id;

  insert into public.organisation_event_link_reviews
    (link_id, action, note, reviewed_by, reviewer_identity)
  values
    (_link_id, _action, _note, _reviewed_by, _reviewer_identity)
  returning id into _review_id;

  return _review_id;
end;
$$;

revoke all on function public.review_organisation_event_link_txn(uuid, text, text, uuid, text) from public;
grant execute on function public.review_organisation_event_link_txn(uuid, text, text, uuid, text) to service_role;
