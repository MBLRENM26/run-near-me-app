-- ORL grants hardening: revoke table privileges and RPC EXECUTE from PUBLIC/anon/authenticated;
-- grant the deployed RPC signature only to service_role. Tables remain reachable by service_role
-- (from the previous migration) and are already RLS-locked with zero policies.

revoke all on public.organisations from public, anon, authenticated;
revoke all on public.organisation_aliases from public, anon, authenticated;
revoke all on public.organisation_platform_accounts from public, anon, authenticated;
revoke all on public.identity_evidence from public, anon, authenticated;
revoke all on public.organisation_event_links from public, anon, authenticated;
revoke all on public.organisation_event_link_reviews from public, anon, authenticated;
revoke all on public.organisation_event_link_evidence from public, anon, authenticated;
revoke all on public.organisation_seed_unresolved from public, anon, authenticated;

revoke all on function public.review_organisation_event_link_txn(uuid, text, text, uuid, text)
  from public, anon, authenticated;

grant execute on function public.review_organisation_event_link_txn(uuid, text, text, uuid, text)
  to service_role;
