-- ORL CHECK realignment to approved brief taxonomy.
-- Tables are all empty (verified 0 rows in each of the four target tables); safe to drop/re-add.
-- No RLS/grant/RPC/policy changes. No data writes. events untouched.

-- 1. organisation_event_links.relationship
ALTER TABLE public.organisation_event_links
  DROP CONSTRAINT organisation_event_links_relationship_check;
ALTER TABLE public.organisation_event_links
  ADD CONSTRAINT organisation_event_links_relationship_check
  CHECK (relationship IN ('organises','entry_platform_hosts','source_suggests'));

-- 2. organisation_event_links.confidence  (default was 'medium'; realign default too)
ALTER TABLE public.organisation_event_links
  ALTER COLUMN confidence DROP DEFAULT;
ALTER TABLE public.organisation_event_links
  DROP CONSTRAINT organisation_event_links_confidence_check;
ALTER TABLE public.organisation_event_links
  ADD CONSTRAINT organisation_event_links_confidence_check
  CHECK (confidence IN ('verified','plausible_needs_review'));
ALTER TABLE public.organisation_event_links
  ALTER COLUMN confidence SET DEFAULT 'plausible_needs_review';

-- 3. organisation_platform_accounts.confidence  (default was 'medium'; realign default too)
ALTER TABLE public.organisation_platform_accounts
  ALTER COLUMN confidence DROP DEFAULT;
ALTER TABLE public.organisation_platform_accounts
  DROP CONSTRAINT organisation_platform_accounts_confidence_check;
ALTER TABLE public.organisation_platform_accounts
  ADD CONSTRAINT organisation_platform_accounts_confidence_check
  CHECK (confidence IN ('verified','plausible_needs_review'));
ALTER TABLE public.organisation_platform_accounts
  ALTER COLUMN confidence SET DEFAULT 'plausible_needs_review';

-- 4. identity_evidence.evidence_type
ALTER TABLE public.identity_evidence
  DROP CONSTRAINT identity_evidence_evidence_type_check;
ALTER TABLE public.identity_evidence
  ADD CONSTRAINT identity_evidence_evidence_type_check
  CHECK (evidence_type IN (
    'official_direct_link',
    'official_terms',
    'platform_profile',
    'matching_event_set',
    'manual_observation'
  ));

-- 5. organisation_aliases.alias_type
ALTER TABLE public.organisation_aliases
  DROP CONSTRAINT organisation_aliases_alias_type_check;
ALTER TABLE public.organisation_aliases
  ADD CONSTRAINT organisation_aliases_alias_type_check
  CHECK (alias_type IN ('trading_name','legal_name','historical_name','source_label'));