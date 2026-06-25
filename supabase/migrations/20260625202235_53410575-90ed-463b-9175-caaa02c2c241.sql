
CREATE POLICY "email_subscriptions_no_public_access"
  ON public.email_subscriptions
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
