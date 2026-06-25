
CREATE TABLE public.email_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'reminder',
  unsubscribe_token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  reminder_sent_at timestamptz,
  CONSTRAINT email_subscriptions_email_event_kind_unique UNIQUE (email, event_id, kind)
);

CREATE INDEX email_subscriptions_event_id_idx ON public.email_subscriptions(event_id);
CREATE INDEX email_subscriptions_pending_idx
  ON public.email_subscriptions(event_id)
  WHERE reminder_sent_at IS NULL;

GRANT ALL ON public.email_subscriptions TO service_role;

ALTER TABLE public.email_subscriptions ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies — all access goes through server fns
-- using the service role. The table is invisible to the Data API.

-- Daily cron: send 7-day reminders at 09:00 UTC.
SELECT cron.schedule(
  'send-race-reminders-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--fa471d0b-8fb1-4a40-afd4-c20d7685abc1.lovable.app/api/public/hooks/send-race-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-admin-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'import_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
