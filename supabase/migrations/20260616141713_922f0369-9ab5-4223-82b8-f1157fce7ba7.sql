
CREATE TABLE public.club_claims (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id             uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  club_slug           text NOT NULL,                     -- denormalised for admin UI
  claimant_name       text NOT NULL,
  claimant_email      text NOT NULL,
  role_at_club        text NOT NULL CHECK (role_at_club IN (
                        'chair','secretary','coach','committee','other'
                      )),
  verification_method text,                              -- 'email-on-domain' | 'website-listed' | 'manual'
  verification_hint   text,                              -- free text: how to verify (URL, etc.)
  message             text,                              -- free text from claimant
  status              text NOT NULL DEFAULT 'pending' CHECK (status IN (
                        'pending','approved','rejected','needs-info'
                      )),
  admin_note          text,
  reviewed_at         timestamptz,
  reviewed_by         text,                              -- admin username/email from session
  submitted_at        timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX club_claims_club_id_idx     ON public.club_claims(club_id);
CREATE INDEX club_claims_status_idx      ON public.club_claims(status);
CREATE INDEX club_claims_submitted_idx   ON public.club_claims(submitted_at DESC);

-- GRANTS
GRANT INSERT ON public.club_claims TO anon, authenticated;
GRANT ALL    ON public.club_claims TO service_role;
-- No SELECT/UPDATE/DELETE for anon or authenticated; admin paths use service_role.

-- RLS
ALTER TABLE public.club_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a claim"
  ON public.club_claims
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- updated_at trigger (reuse same helper shape as clubs)
CREATE OR REPLACE FUNCTION public.tg_club_claims_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER club_claims_set_updated_at
BEFORE UPDATE ON public.club_claims
FOR EACH ROW EXECUTE FUNCTION public.tg_club_claims_updated_at();
