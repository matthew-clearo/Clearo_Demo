-- =============================================================================
-- MAIN DATABASE - Operational support tables
-- These tables are used by request protection, analytics, and email-template
-- test logging. Keep them in migrations so a blank database can be recreated
-- from the repository without relying on runtime DDL.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id BIGSERIAL PRIMARY KEY,
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(identifier, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_endpoint
  ON public.rate_limits(identifier, endpoint);

CREATE INDEX IF NOT EXISTS idx_rate_limits_blocked_until
  ON public.rate_limits(blocked_until)
  WHERE blocked_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start
  ON public.rate_limits(window_start);

CREATE TABLE IF NOT EXISTS public.visitor_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES public.auth_users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  page_path TEXT NOT NULL,
  referrer TEXT,
  country TEXT,
  city TEXT,
  region TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitor_logs_created_at
  ON public.visitor_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_visitor_logs_page_path_created_at
  ON public.visitor_logs(page_path, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_visitor_logs_user_id_created_at
  ON public.visitor_logs(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.admin_message_test_logs (
  id BIGSERIAL PRIMARY KEY,
  channel TEXT NOT NULL,
  template_slug TEXT NOT NULL,
  recipient TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_message_test_logs_created_at
  ON public.admin_message_test_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_message_test_logs_template_created_at
  ON public.admin_message_test_logs(template_slug, created_at DESC);
