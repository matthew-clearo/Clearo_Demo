-- =============================================================================
-- MAIN DATABASE — Performance indexes for scale
-- Adds missing indexes identified during scalability audit.
-- Every statement is idempotent (IF NOT EXISTS / CONCURRENTLY not used because
-- node-pg-migrate runs inside a transaction).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. BOOKINGS — status + created_at for dashboard / admin list queries
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bookings_status
  ON public.bookings(status);

CREATE INDEX IF NOT EXISTS idx_bookings_created_at
  ON public.bookings(created_at DESC);

-- Composite for referral queue: WHERE referral_status = 'pending_review'
CREATE INDEX IF NOT EXISTS idx_bookings_referral_status
  ON public.bookings(referral_status)
  WHERE referral_status IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. AUDIT_LOGS — composite for time-filtered action queries (dashboard)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created_at
  ON public.audit_logs(action, created_at DESC);

-- ---------------------------------------------------------------------------
-- 3. SESSION CLEANUP — partial indexes on active sessions only
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_auth_sessions_active
  ON public.auth_sessions(expires)
  WHERE expires > NOW();

CREATE INDEX IF NOT EXISTS idx_clinic_sessions_active
  ON clinic.sessions(expires_at)
  WHERE expires_at > NOW();

-- ---------------------------------------------------------------------------
-- 4. TRIGRAM INDEXES — for ILIKE '%term%' search on admin patient/user pages
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_auth_users_email_trgm
  ON public.auth_users USING GIN (email gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_auth_users_name_trgm
  ON public.auth_users USING GIN (name gin_trgm_ops);

-- Clinic name search (admin clinic list)
CREATE INDEX IF NOT EXISTS idx_clinics_name_trgm
  ON public.clinics USING GIN (name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- 5. AUTH_USERS — role filter for COUNT(*) WHERE role = 'patient'
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_auth_users_role
  ON public.auth_users(role);

-- ---------------------------------------------------------------------------
-- 6. BOOKINGS — user_id + created_at for per-user booking list ordering
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bookings_user_id_created_at
  ON public.bookings(user_id, created_at DESC);
