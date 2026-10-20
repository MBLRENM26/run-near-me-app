CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 255),
  topic text NOT NULL CHECK (topic IN ('race_info','correction','club','organiser','other')),
  race_link text CHECK (race_link IS NULL OR char_length(race_link) <= 500),
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 3000),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','handled','spam')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.contact_messages TO service_role;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;