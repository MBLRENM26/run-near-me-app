
DROP POLICY "Anyone can submit a claim" ON public.club_claims;

CREATE POLICY "Anyone can submit a claim"
  ON public.club_claims
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(claimant_name)  BETWEEN 1   AND 200
    AND char_length(claimant_email) BETWEEN 3 AND 255
    AND claimant_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND (message IS NULL OR char_length(message) <= 2000)
    AND (verification_hint IS NULL OR char_length(verification_hint) <= 500)
  );
