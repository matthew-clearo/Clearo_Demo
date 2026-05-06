-- =============================================================================
-- MAIN DATABASE — Complete schema sweep
-- Apply this to the main Neon database (DATABASE_URL / DATABASE_URL_RLS)
-- Every statement is idempotent (IF NOT EXISTS / IF EXISTS).
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. AUTH_USERS — account state and MFA columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.auth_users ADD COLUMN IF NOT EXISTS admin_disabled_at  TIMESTAMPTZ;
ALTER TABLE public.auth_users ADD COLUMN IF NOT EXISTS mfa_secret          TEXT    DEFAULT NULL;
ALTER TABLE public.auth_users ADD COLUMN IF NOT EXISTS mfa_enabled         BOOLEAN DEFAULT false;
ALTER TABLE public.auth_users ADD COLUMN IF NOT EXISTS mfa_backup_codes    TEXT    DEFAULT NULL;
-- UUID routing
ALTER TABLE public.auth_users ADD COLUMN IF NOT EXISTS public_id           UUID    DEFAULT gen_random_uuid() NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_users_public_id ON public.auth_users(public_id);


-- ---------------------------------------------------------------------------
-- 2. BOOKINGS — clinical status columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS referral_status           TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS consent_given_at          TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS consent_ip                VARCHAR(45);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS referral_reminder_sent_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS safety_review_status      TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS safety_block_reasons      JSONB;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancelled_at              TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS updated_at                TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- PHI *token* (UUID pointer) columns — these are foreign references into the PHI vault,
-- NOT the actual PHI. The PHI vault holds the encrypted values.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS patient_name_token        UUID;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS patient_email_token       UUID;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS patient_phone_token       UUID;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS patient_dob_token         UUID;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS symptoms_reason_token     UUID;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS notes_token               UUID;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS safety_answers_token      UUID;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS referral_url_token        UUID;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS referral_file_id          UUID;

-- Manage token (VULN-003: secure booking management links)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS manage_token              UUID;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS manage_token_expires_at   TIMESTAMPTZ;

-- UUID routing
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS public_id UUID DEFAULT gen_random_uuid() NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_public_id            ON public.bookings(public_id);
CREATE INDEX IF NOT EXISTS idx_bookings_patient_name_token   ON public.bookings(patient_name_token);
CREATE INDEX IF NOT EXISTS idx_bookings_patient_email_token  ON public.bookings(patient_email_token);
CREATE INDEX IF NOT EXISTS idx_bookings_referral_file_id     ON public.bookings(referral_file_id);
CREATE INDEX IF NOT EXISTS idx_bookings_manage_token         ON public.bookings(manage_token);

-- Backfill manage_token for any existing rows
UPDATE public.bookings SET manage_token             = gen_random_uuid()              WHERE manage_token IS NULL;
UPDATE public.bookings SET manage_token_expires_at  = NOW() + INTERVAL '7 days'      WHERE manage_token_expires_at IS NULL;


-- ---------------------------------------------------------------------------
-- 3. SCAN_TYPES — clinical default columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.scan_types ADD COLUMN IF NOT EXISTS requires_referral   BOOLEAN;
ALTER TABLE public.scan_types ADD COLUMN IF NOT EXISTS prep_instructions    TEXT;
ALTER TABLE public.scan_types ADD COLUMN IF NOT EXISTS safety_question_set  JSONB;
ALTER TABLE public.scan_types ADD COLUMN IF NOT EXISTS public_id            UUID DEFAULT gen_random_uuid() NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_scan_types_public_id ON public.scan_types(public_id);


-- ---------------------------------------------------------------------------
-- 4. CLINIC_SCANS — clinical override columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.clinic_scans ADD COLUMN IF NOT EXISTS requires_referral  BOOLEAN;
ALTER TABLE public.clinic_scans ADD COLUMN IF NOT EXISTS prep_instructions   TEXT;


-- ---------------------------------------------------------------------------
-- 5. PATIENT_PROFILES — PHI *token* (UUID pointer) columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.patient_profiles ADD COLUMN IF NOT EXISTS full_name_token       UUID;
ALTER TABLE public.patient_profiles ADD COLUMN IF NOT EXISTS dob_token             UUID;
ALTER TABLE public.patient_profiles ADD COLUMN IF NOT EXISTS phone_token           UUID;
ALTER TABLE public.patient_profiles ADD COLUMN IF NOT EXISTS email_token           UUID;
ALTER TABLE public.patient_profiles ADD COLUMN IF NOT EXISTS symptoms_reason_token  UUID;
ALTER TABLE public.patient_profiles ADD COLUMN IF NOT EXISTS safety_answers_token   UUID;
ALTER TABLE public.patient_profiles ADD COLUMN IF NOT EXISTS public_id             UUID DEFAULT gen_random_uuid() NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patient_profiles_full_name_token ON public.patient_profiles(full_name_token);
CREATE INDEX IF NOT EXISTS idx_patient_profiles_email_token     ON public.patient_profiles(email_token);
CREATE INDEX IF NOT EXISTS idx_patient_profiles_public_id       ON public.patient_profiles(public_id);

-- Remove legacy token columns no longer used
ALTER TABLE public.patient_profiles DROP COLUMN IF EXISTS address_token;
ALTER TABLE public.patient_profiles DROP COLUMN IF EXISTS medicare_number_token;
ALTER TABLE public.patient_profiles DROP COLUMN IF EXISTS emergency_contact_token;
ALTER TABLE public.patient_profiles DROP COLUMN IF EXISTS medical_history_token;
ALTER TABLE public.patient_profiles DROP COLUMN IF EXISTS allergies_token;
ALTER TABLE public.patient_profiles DROP COLUMN IF EXISTS medications_token;


-- ---------------------------------------------------------------------------
-- 6. AVAILABLE_SLOTS / MACHINES / CLINICS — UUID routing
-- ---------------------------------------------------------------------------
ALTER TABLE public.available_slots ADD COLUMN IF NOT EXISTS public_id UUID DEFAULT gen_random_uuid() NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_available_slots_public_id ON public.available_slots(public_id);

ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS public_id UUID DEFAULT gen_random_uuid() NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_machines_public_id ON public.machines(public_id);

ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS public_id UUID DEFAULT gen_random_uuid() NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_clinics_public_id ON public.clinics(public_id);

-- Backfill any NULLs from rows that pre-date the DEFAULT
UPDATE public.available_slots SET public_id = gen_random_uuid() WHERE public_id IS NULL;
UPDATE public.machines          SET public_id = gen_random_uuid() WHERE public_id IS NULL;
UPDATE public.clinics           SET public_id = gen_random_uuid() WHERE public_id IS NULL;
UPDATE public.bookings          SET public_id = gen_random_uuid() WHERE public_id IS NULL;
UPDATE public.scan_types        SET public_id = gen_random_uuid() WHERE public_id IS NULL;
UPDATE public.patient_profiles  SET public_id = gen_random_uuid() WHERE public_id IS NULL;
UPDATE public.auth_users        SET public_id = gen_random_uuid() WHERE public_id IS NULL;


-- ---------------------------------------------------------------------------
-- 7. AUDIT_LOGS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          SERIAL       PRIMARY KEY,
  user_id     INTEGER      REFERENCES public.auth_users(id),
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id   INTEGER,
  details     JSONB        DEFAULT '{}',
  ip_address  VARCHAR(45),
  user_agent  TEXT,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action  ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user    ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity  ON public.audit_logs(entity_type, entity_id);


-- ---------------------------------------------------------------------------
-- 8. SITE CONTENT AND MESSAGING TABLES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_message_templates (
  id          SERIAL      PRIMARY KEY,
  channel     TEXT        NOT NULL,
  slug        TEXT        NOT NULL,
  name        TEXT        NOT NULL,
  description TEXT        DEFAULT NULL,
  subject     TEXT        DEFAULT NULL,
  body        TEXT        NOT NULL,
  variables   JSONB       DEFAULT '[]'::jsonb,
  version     INTEGER     NOT NULL DEFAULT 1,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_by  TEXT        DEFAULT NULL,
  updated_by  TEXT        DEFAULT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(channel, slug)
);

CREATE TABLE IF NOT EXISTS public.admin_page_metadata (
  id             SERIAL      PRIMARY KEY,
  route_path     TEXT        NOT NULL UNIQUE,
  title          TEXT        DEFAULT NULL,
  description    TEXT        DEFAULT NULL,
  og_title       TEXT        DEFAULT NULL,
  og_description TEXT        DEFAULT NULL,
  canonical_url  TEXT        DEFAULT NULL,
  robots_index   BOOLEAN     NOT NULL DEFAULT true,
  robots_follow  BOOLEAN     NOT NULL DEFAULT true,
  updated_by     TEXT        DEFAULT NULL,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_system_settings (
  key         TEXT        PRIMARY KEY,
  category    TEXT        NOT NULL DEFAULT 'general',
  value       JSONB       NOT NULL DEFAULT '{}'::jsonb,
  description TEXT        DEFAULT NULL,
  updated_by  TEXT        DEFAULT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_page_content (
  key        TEXT        PRIMARY KEY,
  title      TEXT        NOT NULL,
  body       TEXT        NOT NULL DEFAULT '',
  status     TEXT        NOT NULL DEFAULT 'draft',
  updated_by TEXT        DEFAULT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 9. CLINIC SCHEMA
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS clinic;

-- Clinic MFA state (on clinic.users table which already exists)
ALTER TABLE clinic.users ADD COLUMN IF NOT EXISTS mfa_secret_encrypted TEXT    DEFAULT NULL;
ALTER TABLE clinic.users ADD COLUMN IF NOT EXISTS mfa_enabled          BOOLEAN DEFAULT false;
ALTER TABLE clinic.users ADD COLUMN IF NOT EXISTS mfa_backup_codes     TEXT    DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_clinic_users_mfa_enabled ON clinic.users(mfa_enabled);

-- Clinic session metadata (on clinic.sessions table which already exists)
ALTER TABLE clinic.sessions ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE clinic.sessions ADD COLUMN IF NOT EXISTS user_agent TEXT;
CREATE INDEX IF NOT EXISTS idx_clinic_sessions_user_created
  ON clinic.sessions(clinic_user_id, created_at DESC);

-- Clinic audit log
CREATE TABLE IF NOT EXISTS clinic.audit_logs (
  id                   BIGSERIAL   PRIMARY KEY,
  clinic_id            BIGINT      REFERENCES public.clinics(id) ON DELETE SET NULL,
  actor_clinic_user_id BIGINT      REFERENCES clinic.users(id)   ON DELETE SET NULL,
  action               TEXT        NOT NULL,
  entity_type          TEXT,
  entity_id            TEXT,
  details              JSONB       NOT NULL DEFAULT '{}'::jsonb,
  ip_address           INET,
  user_agent           TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clinic_audit_logs_clinic_created
  ON clinic.audit_logs(clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinic_audit_logs_actor_created
  ON clinic.audit_logs(actor_clinic_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinic_audit_logs_action_created
  ON clinic.audit_logs(action, created_at DESC);

-- Clinic invitations
CREATE TABLE IF NOT EXISTS clinic.invitations (
  id                        BIGSERIAL   PRIMARY KEY,
  public_id                 UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  clinic_id                 BIGINT      NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  email                     TEXT        NOT NULL,
  normalized_email          TEXT        NOT NULL,
  role                      TEXT        NOT NULL CHECK (role IN ('owner','manager','staff','read_only','billing')),
  status                    TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  invited_by_clinic_user_id BIGINT      NOT NULL REFERENCES clinic.users(id),
  invited_clinic_user_id    BIGINT      REFERENCES clinic.users(id),
  token_hash                TEXT        NOT NULL,
  expires_at                TIMESTAMPTZ NOT NULL,
  accepted_at               TIMESTAMPTZ,
  revoked_at                TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_clinic_pending_invite
  ON clinic.invitations(clinic_id, normalized_email)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_clinic_invitations_lookup
  ON clinic.invitations(clinic_id, normalized_email, status);
CREATE INDEX IF NOT EXISTS idx_clinic_invitations_expiry
  ON clinic.invitations(status, expires_at);

COMMIT;
