-- Newsletter signups are captured by the public footer form.
-- Keep the schema in migrations so request handlers do not perform DDL.

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
