ALTER TABLE public.email_subscriptions ADD COLUMN IF NOT EXISTS seen_at timestamptz;
UPDATE public.email_subscriptions SET seen_at = now() WHERE seen_at IS NULL;